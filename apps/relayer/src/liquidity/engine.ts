import { EventEmitter } from 'events';
import { parseUnits, isAddress, createPublicClient, http, getAddress, createWalletClient, WalletClient, Account } from 'viem';
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from 'viem/chains';
import { createClient } from '@supabase/supabase-js';

import { getTradingPairs, TradingPair, getMarket, MarketState } from '@forge/markets';

import { INTENT_SPOT_ROUTER_ADDRESS } from '../contracts/baseSepolia/IntentSpotRouter';
import { IntentSpotRouterAbi } from '../contracts/IntentSpotRouter';

function safeAddress(addr?: string | null): `0x${string}` | null {
    if (!addr) return null;
    if (!isAddress(addr)) {
        console.warn(`Invalid address provided: ${addr}`);
        return null;
    }
    return getAddress(addr);
}

// Helper function to create a clean intent object for contract calls
function createCleanIntent(intent: any) {
  // Ensure we don't pass any extra fields to the contract
  return {
    user: intent.user,
    tokenIn: intent.tokenIn,
    tokenOut: intent.tokenOut,
    amountIn: BigInt(intent.amountIn),
    minAmountOut: BigInt(intent.minAmountOut),
    deadline: BigInt(intent.deadline),
    nonce: BigInt(intent.nonce),
    adapter: intent.adapter ?? '0x0000000000000000000000000000000000000000', // Default if null
    relayerFee: BigInt(intent.relayerFee || 0), // Default if null
  };
}

const publicClient = createPublicClient({
    chain: baseSepolia,
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
    private walletClient: WalletClient;
    private account: Account;

    constructor(agentName: string = 'Agent01') {
        super();
        this.agentName = agentName;
        const relayerPrivateKey = process.env.RELAYER_PRIVATE_KEY as `0x${string}`;
        if (!relayerPrivateKey) {
            throw new Error("RELAYER_PRIVATE_KEY is not set in the environment.");
        }
        this.account = privateKeyToAccount(relayerPrivateKey);
        this.walletClient = createWalletClient({
            account: this.account,
            chain: baseSepolia,
            transport: http(),
        });
        const fallbackLpAddress = '0xf2ac07DeFdb48fbc9459459a448C4A158c6C23ef';
        this.lpAddress = safeAddress(process.env.LP_ADDRESS || fallbackLpAddress);
        this.intentSpotRouterAddress = INTENT_SPOT_ROUTER_ADDRESS;
        
        this.initialize();

        if (this.lpAddress) {
            console.log(`Liquidity Engine initialized with LP: ${this.lpAddress}`);
        } else {
            console.log("CRITICAL: No valid LP_ADDRESS configured. Liquidity Engine will not be able to execute trades with LP.");
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

    private async updateOrderStatusInDB(signature: string, status: 'fulfilled' | 'failed', last_error?: string) {
        const { data, error } = await supabase
            .from('orders')
            .update({ status, last_error })
            .eq('signature', signature);

        if (error) {
            console.error(`[Relayer] Failed to update order status for signature ${signature}:`, error);
        }
    }
    
    public async getOnChainQuote(order: any): Promise<bigint> {
        try {
            const cleanIntent = createCleanIntent(order.intent);

            const data = await publicClient.simulateContract({
                address: this.intentSpotRouterAddress,
                abi: IntentSpotRouterAbi,
                functionName: 'executeSwap',
                args: [cleanIntent, order.signature],
            });
            return data.result;
        } catch (error) {
            console.warn('Could not get on-chain quote, likely no liquidity on DEX for this pair.');
            return 0n;
        }
    }

    public async simulateExternalSwap(intent: any, signature: any): Promise<{ success: boolean; amountOut: bigint; }> {
        try {
            const cleanIntent = createCleanIntent(intent);

            const { result } = await publicClient.simulateContract({
                address: this.intentSpotRouterAddress,
                abi: IntentSpotRouterAbi,
                functionName: 'executeSwap',
                args: [cleanIntent, signature],
                account: this.account
            });

            return {
                success: true,
                amountOut: result
            };

        } catch (err) {
            console.warn(`External DEX simulation failed: ${(err as Error).message}`);
            return {
                success: false,
                amountOut: 0n
            };
        }
    }

    public async settleMatchedTrade(trade: any) {
        const { buyer, seller, quantity, price, pair } = trade;
        const amountBase = parseUnits(quantity.toString(), pair.base.decimals);
        const priceBigInt = parseUnits(price.toString(), pair.quote.decimals);
        const amountQuote = (amountBase * priceBigInt) / (10n ** BigInt(pair.base.decimals));

        const buyerIntentId = buyer.intent_id;

        this.emit('agent_status', { 
            orderId: buyerIntentId,
            userAddress: buyer.intent.user,
            msg: `[${this.agentName}] Settling internal match for ${quantity} ${pair.base.symbol}.`,
            type: 'info' 
        });

        await this.settleOnChain({
            intent: buyer.side === 'buy' ? buyer.intent : seller.intent,
            signature: buyer.side === 'buy' ? buyer.signature : seller.signature,
            counterparty: buyer.side === 'buy' ? seller.intent.user : buyer.intent.user,
            amountOut: amountQuote,
            intent_id: buyerIntentId
        });
    }

    public async executeWithLP(order: any) {
        if (!this.lpAddress) {
            console.error("Cannot execute with LP: LP Address is not configured or invalid.");
            this.emit('agent_status', { 
                orderId: order.intent_id, 
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
                orderId: order.intent_id, 
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

        if(amountOut < order.intent.minAmountOut) {
            throw new Error("Slippage exceeded");
        }

        this.emit('agent_status', { 
            orderId: order.intent_id,
            userAddress: order.intent.user,
            msg: `[${this.agentName}] No external liquidity found. Settling ${order.quantity} ${pair.base.symbol} with internal LP.`,
            type: 'info' 
        });

        await this.settleOnChain({
            intent: order.intent,
            signature: order.signature,
            counterparty: this.lpAddress,
            amountOut: amountOut,
            intent_id: order.intent_id
        });
    }

    public async executeWithExternalDex(intent: any, signature: any, intent_id: string) {
        this.emit('agent_status', {
            orderId: intent_id,
            userAddress: intent.user,
            msg: `[${this.agentName}] Routing to external DEX to fill intent.`,
            type: 'info' 
        });
        
        try {
            const cleanIntent = createCleanIntent(intent);

            const { request, result: amountOut } = await publicClient.simulateContract({
                address: this.intentSpotRouterAddress,
                abi: IntentSpotRouterAbi,
                functionName: 'executeSwap',
                args: [cleanIntent, signature], 
                account: this.account
            });

            if(amountOut < intent.minAmountOut) {
                throw new Error("Slippage exceeded");
            }
            
            const hash = await this.walletClient.writeContract(request);
            console.log("External swap transaction sent:", hash);
            this.updateOrderStatusInDB(signature, 'fulfilled');
        } catch (error: any) {
            console.error("External DEX execution failed:", error);
            this.updateOrderStatusInDB(signature, 'failed', error.message);
        }
    }

    private async settleOnChain(params: any) {
        const { intent, signature, counterparty, amountOut, intent_id } = params;
        
        try {
            if(amountOut < intent.minAmountOut) {
                throw new Error("Slippage exceeded");
            }
            const cleanIntent = createCleanIntent(intent);

            const { request } = await publicClient.simulateContract({
                address: this.intentSpotRouterAddress,
                abi: IntentSpotRouterAbi,
                functionName: 'settleTrade',
                args: [cleanIntent, signature, counterparty, amountOut],
                account: this.account
            });

            const hash = await this.walletClient.writeContract(request);
            console.log("Internal settlement transaction sent:", hash);

            this.emit('settlement_status', {
                userA: intent.user,
                userB: counterparty,
                message: `Settlement complete between ${intent.user} and ${counterparty}`,
                type: 'success'
            });
            this.updateOrderStatusInDB(signature, 'fulfilled');
        } catch (error: any) {
            console.error("On-chain settlement failed:", error);
            this.emit('agent_status', {
                orderId: intent_id, 
                userAddress: intent.user,
                msg: `[${this.agentName}] On-chain settlement failed.`,
                type: 'error'
            });
            this.updateOrderStatusInDB(signature, 'failed', error.message);
        }
    }
}
