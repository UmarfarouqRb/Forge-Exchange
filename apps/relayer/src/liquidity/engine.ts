
import { EventEmitter } from 'events';
import { parseUnits, isAddress, createPublicClient, http, getAddress } from 'viem';
import { sepolia } from 'viem/chains';
import { createClient } from '@supabase/supabase-js';


// Updated imports to use the new `packages/markets` index file
import { getTradingPairs, TradingPair, getMarket, MarketState } from '@forge/markets';

import { INTENT_SPOT_ROUTER_ADDRESS } from '../contracts/baseSepolia/IntentSpotRouter';
import { IntentSpotRouterAbi } from '../contracts/IntentSpotRouter';

// Utility function to validate and format Ethereum addresses
function safeAddress(addr?: string | null): `0x${string}` | null {
    if (!addr) return null;
    if (!isAddress(addr)) {
        console.warn(`Invalid address provided: ${addr}`);
        return null;
    }
    return getAddress(addr); // Use getAddress for checksummed address
}

const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(),
});

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);


export class LiquidityEngine extends EventEmitter {
    private agentName: string;
    private tradingPairs: TradingPair[] = [];
    private marketData: { [key: string]: MarketState } = {};
    private lpAddress: `0x${string}` | null;
    private intentSpotRouterAddress: `0x${string}`;

    constructor(agentName: string = 'Agent01') {
        super();
        this.agentName = agentName;
        // Read LP_ADDRESS from environment variable, with a fallback
        const fallbackLpAddress = '0xf2ac07DeFdb48fbc9459459a448C4A158c6C23ef';
        this.lpAddress = safeAddress(process.env.LP_ADDRESS || fallbackLpAddress);
        this.intentSpotRouterAddress = INTENT_SPOT_ROUTER_ADDRESS[sepolia.id];
        
        this.initialize();

        if (this.lpAddress) {
            console.log(`Liquidity Engine initialized with LP: ${this.lpAddress}`);
        } else {
            console.error("CRITICAL: No valid LP_ADDRESS configured. Liquidity Engine will not be able to execute trades with LP.");
        }
    }

    private async initialize() {
        try {
            this.tradingPairs = getTradingPairs();
            for (const pair of this.tradingPairs) {
                const market = await getMarket(pair.id);
                if (market) {
                    this.marketData[pair.id] = market;
                }
            }
            console.log(`Initialized with ${this.tradingPairs.length} trading pairs.`);
        } catch (error) {
            console.error("Failed to initialize LiquidityEngine:", error);
            this.emit('agent_status', { 
                type: 'error', 
                msg: `[${this.agentName}] Failed to initialize liquidity engine.` 
            });
        }
    }

    public getPrice(pairId: string): number | null {
        return this.marketData[pairId]?.price ?? null;
    }

    private async updateOrderStatusInDB(signature: string, status: 'FILLED' | 'FAILED') {
        const { data, error } = await supabase
            .from('orders')
            .update({ status: status })
            .eq('signature', signature);

        if (error) {
            console.error(`[Relayer] Failed to update order status for signature ${signature}:`, error);
        }
    }
    
    public async getOnChainQuote(intent: any): Promise<bigint> {
        try {
            const data = await publicClient.simulateContract({
                address: this.intentSpotRouterAddress,
                abi: IntentSpotRouterAbi,
                functionName: 'executeSwap',
                args: [intent.intent, intent.signature],
            });
            return data.result;
        } catch (error) {
            // It's common for quotes to fail if there's no liquidity, so we log as a warning not an error.
            console.warn('Could not get on-chain quote, likely no liquidity on DEX for this pair.');
            return 0n;
        }
    }

    public async settleMatchedTrade(trade: any) {
        const { buyer, seller, quantity, price, pair } = trade;
        const amountBase = parseUnits(quantity.toString(), pair.base.decimals);
        const priceBigInt = parseUnits(price.toString(), pair.quote.decimals);
        const amountQuote = (amountBase * priceBigInt) / (10n ** BigInt(pair.base.decimals));

        this.emit('agent_status', { 
            orderId: buyer.intent.id,
            userAddress: buyer.intent.user,
            msg: `[${this.agentName}] Settling internal match for ${quantity} ${pair.base.symbol}.`,
            type: 'info' 
        });

        await this.settleOnChain({
            intent: buyer.side === 'buy' ? buyer.intent : seller.intent,
            signature: buyer.side === 'buy' ? buyer.signature : seller.signature,
            counterparty: buyer.side === 'buy' ? seller.userAddress : buyer.userAddress,
            amountOut: amountQuote
        });
    }

    public async executeWithLP(order: any) {
        if (!this.lpAddress) {
            console.error("Cannot execute with LP: LP Address is not configured or invalid.");
            this.emit('agent_status', { 
                orderId: order.intent.id, 
                userAddress: order.intent.user,
                msg: `[${this.agentName}] Cannot execute with LP, address not configured.`, 
                type: 'error' 
            });
            return;
        }

        const price = this.getPrice(order.tradingPairId);
        if (price === null) {
            console.error(`Cannot settle with LP: No internal price for pair ${order.tradingPairId}`);
            this.emit('agent_status', { 
                orderId: order.intent.id, 
                userAddress: order.intent.user,
                msg: `[${this.agentName}] Cannot settle with LP, no internal price for ${order.pair.symbol}.`, 
                type: 'error' 
            });
            return;
        }

        const pair = this.tradingPairs.find(p => p.id === order.tradingPairId);
        if (!pair) throw new Error(`Trading pair not found for id: ${order.tradingPairId}`);

        const amountBase = parseUnits(order.quantity.toString(), pair.base.decimals);
        const priceBigInt = parseUnits(price.toString(), pair.quote.decimals);

        const amountOut = order.side === "buy" 
            ? amountBase 
            : (amountBase * priceBigInt) / (10n ** BigInt(pair.base.decimals));

        this.emit('agent_status', { 
            orderId: order.intent.id,
            userAddress: order.intent.user,
            msg: `[${this.agentName}] No external liquidity found. Settling ${order.quantity} ${pair.base.symbol} with internal LP.`,
            type: 'info' 
        });

        await this.settleOnChain({
            intent: order.intent,
            signature: order.signature,
            counterparty: this.lpAddress,
            amountOut: amountOut
        });
    }

    public async executeWithExternalDex(intent: any, signature: any) {
        this.emit('agent_status', {
            orderId: intent.id,
            userAddress: intent.user,
            msg: `[${this.agentName}] Routing to external DEX to fill ${intent.quantity} ${intent.pair.base.symbol}.`,
            type: 'info' 
        });
        
        try {
            const { request } = await publicClient.simulateContract({
                address: this.intentSpotRouterAddress,
                abi: IntentSpotRouterAbi,
                functionName: 'executeSwap',
                args: [intent, signature], 
            });
            
            // Here you would normally submit the transaction
            // e.g., const hash = await walletClient.writeContract(request);
            console.log("External swap transaction prepared:", request);
            this.updateOrderStatusInDB(signature, 'FILLED');
        } catch (error) {
            console.error("External DEX execution simulation failed:", error);
            this.updateOrderStatusInDB(signature, 'FAILED');
        }
    }

    private async settleOnChain(params: any) {
        const { intent, signature, counterparty, amountOut } = params;
        
        try {
            const { request } = await publicClient.simulateContract({
                address: this.intentSpotRouterAddress,
                abi: IntentSpotRouterAbi,
                functionName: 'settleTrade',
                args: [intent, signature, counterparty, amountOut],
            });

            // Here you would normally submit the transaction
            // e.g., const hash = await walletClient.writeContract(request);
            console.log("Internal settlement transaction prepared:", request);

            this.emit('settlement_status', {
                userA: intent.user,
                userB: counterparty,
                message: `Settlement complete between ${intent.user} and ${counterparty}`,
                type: 'success'
            });
            this.updateOrderStatusInDB(signature, 'FILLED');
        } catch (error) {
            console.error("On-chain settlement simulation failed:", error);
            this.emit('agent_status', {
                orderId: intent.id, 
                userAddress: intent.user,
                msg: `[${this.agentName}] On-chain settlement failed.`,
                type: 'error'
            });
            this.updateOrderStatusInDB(signature, 'FAILED');
        }
    }
}
