import { EventEmitter } from 'events';
import { parseUnits, isAddress, createPublicClient, http, getAddress, createWalletClient, WalletClient, Account } from 'viem';
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from 'viem/chains';
import { createClient } from '@supabase/supabase-js';

import { getTradingPairs, TradingPair, getExecutionPrice } from '@forge/markets';
import { getTokenBySymbol } from '../utils/tokens';

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

const publicClient = createPublicClient({ chain: baseSepolia, transport: http() });
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export class LiquidityEngine extends EventEmitter {
    private agentName: string;
    private tradingPairs: TradingPair[] = [];
    private lpAddress: `0x${string}` | null;
    private intentSpotRouterAddress: `0x${string}`;
    private walletClient: WalletClient;
    private account: Account;

    private isReady = false;
    private priceCache: Record<string, { price: number; timestamp: number }> = {};
    private PRICE_TTL = 5000; // 5 seconds

    constructor(agentName: string = 'Agent01') {
        super();
        this.agentName = agentName;
        const relayerPrivateKey = process.env.RELAYER_PRIVATE_KEY as `0x${string}`;
        if (!relayerPrivateKey) throw new Error("RELAYER_PRIVATE_KEY is not set.");
        
        this.account = privateKeyToAccount(relayerPrivateKey);
        this.walletClient = createWalletClient({ account: this.account, chain: baseSepolia, transport: http() });
        this.lpAddress = safeAddress(process.env.LP_ADDRESS || '0xf2ac07DeFdb48fbc9459459a448C4A158c6C23ef');
        this.intentSpotRouterAddress = INTENT_SPOT_ROUTER_ADDRESS;
        
        this.initialize();

        if (!this.lpAddress) {
            console.warn("CRITICAL: No valid LP_ADDRESS configured. LP fallback is disabled.");
        }
    }

    private async initialize() {
        try {
            this.tradingPairs = getTradingPairs();
            this.isReady = true;
            console.log(`Initialized with ${this.tradingPairs.length} trading pairs.`);
        } catch (error) {
            console.error("Failed to initialize LiquidityEngine:", error);
            this.isReady = false;
        }
    }

    public getTradingPairs(): TradingPair[] {
        return this.tradingPairs;
    }

    public async getPrice(pairId: string): Promise<number | null> {
        if (!this.isReady) {
            console.warn("[LiquidityEngine] Not ready yet, skipping price fetch");
            return null;
        }
    
        const cached = this.priceCache[pairId];
        if (cached && Date.now() - cached.timestamp < this.PRICE_TTL) {
            return cached.price;
        }
    
        const price = await getExecutionPrice(pairId);

        if (price && price > 0) {
            this.priceCache[pairId] = { price, timestamp: Date.now() };
            return price;
        }

        console.error(`[Price] Invalid price received for ${pairId}: ${price}`);
        return null;
    }

    private async updateOrderStatusInDB(signature: string, status: 'fulfilled' | 'failed', last_error?: string) {
        const { error } = await supabase.from('orders').update({ status, last_error }).eq('signature', signature);
        if (error) {
            console.error(`[DB] Failed to update order status for sig ${signature}:`, error);
        }
    }
    
    public async simulateExternalSwap(intent: any, signature: any): Promise<{ success: boolean; amountOut: bigint; tokenOut?: string; }> {
        try {
            const { result } = await publicClient.simulateContract({
                address: this.intentSpotRouterAddress,
                abi: IntentSpotRouterAbi,
                functionName: 'executeSwap',
                args: [intent, signature],
                account: this.account
            });
            return { success: true, amountOut: result, tokenOut: intent.tokenOut };
        } catch (err) {
            console.warn(`External DEX simulation failed: ${(err as Error).message}`);
            return { success: false, amountOut: 0n };
        }
    }

    public async settleMatchedTrade(trade: any) {
        const { buyer, seller, quantity, price, intentId } = trade;
        try {
            if (!price || price <= 0) {
                throw new Error(`Invalid price for trade: ${price}`);
            }

            const pairId = buyer.trading_pair_id || seller.trading_pair_id;
            const pair = this.tradingPairs.find(p => p.id === pairId || p.symbol === pairId);

            if (!pair) {
                throw new Error(`Pair not found: ${pairId}`);
            }

            const amountBase = parseUnits(quantity.toString(), pair.base.decimals);
            const priceBigInt = parseUnits(price.toString(), pair.quote.decimals);
            const baseDecimals = BigInt(10) ** BigInt(pair.base.decimals);
            const amountQuote = (amountBase * priceBigInt) / baseDecimals;

            this.emit('agent_status', { orderId: intentId, userAddress: buyer.intent.user, msg: `Settling internal match...`, type: 'info' });

            await this.settleOnChain({
                intent: buyer.intent,
                signature: buyer.signature,
                counterparty: seller.intent.user,
                amountOut: amountQuote,
                intent_id: intentId
            });
        } catch (error: any) {
            console.error(`[settleMatchedTrade] Failed for intentId ${intentId}:`, error);
            this.emit('agent_status', { orderId: intentId, userAddress: buyer.intent.user, msg: `Internal match settlement failed: ${error.message}`.substring(0, 100), type: 'error' });
            this.updateOrderStatusInDB(buyer.signature, 'failed', error.message);
        }
    }

    public async executeWithLP(order: any) {
        try {
            if (!this.lpAddress) {
                throw new Error("Cannot execute with LP: Address not configured.");
            }
    
            const price = await this.getPrice(order.trading_pair_id);
            if (price === null || price <= 0) {
                throw new Error("Cannot settle with LP: Invalid execution price.");
            }
    
            const pair = this.tradingPairs.find(p => p.id === order.trading_pair_id);
            if (!pair) throw new Error(`Trading pair not found: ${order.trading_pair_id}`);
    
            const amountBase = parseUnits(order.quantity.toString(), pair.base.decimals);
            const priceBigInt = parseUnits(price.toString(), pair.quote.decimals);
            const baseDecimals = BigInt(10) ** BigInt(pair.base.decimals);
            const amountOut = (amountBase * priceBigInt) / baseDecimals;
    
            if(amountOut < BigInt(order.intent.minAmountOut)) {
                throw new Error(`Slippage exceeded: LP quote was ${amountOut}, minAmountOut was ${order.intent.minAmountOut}`);
            }
    
            this.emit('agent_status', { orderId: order.intent_id, userAddress: order.intent.user, msg: `Settling ${order.quantity} with internal LP.`, type: 'info' });
    
            await this.settleOnChain({
                intent: order.intent,
                signature: order.signature,
                counterparty: this.lpAddress,
                amountOut: amountOut, 
                intent_id: order.intent_id
            });
        } catch (error: any) {
            console.error(`[executeWithLP] Failed for order ${order.intent_id}:`, error);
            this.emit('agent_status', { orderId: order.intent_id, userAddress: order.intent.user, msg: `LP execution failed: ${error.message}`.substring(0, 100), type: 'error' });
            this.updateOrderStatusInDB(order.signature, 'failed', error.message);
        }
    }

    public async executeWithExternalDex(intent: any, signature: any, intent_id: string) {
        this.emit('agent_status', { orderId: intent_id, userAddress: intent.user, msg: `Routing to external DEX...`, type: 'info' });
        
        try {
            const { request, result: amountOut } = await publicClient.simulateContract({
                address: this.intentSpotRouterAddress,
                abi: IntentSpotRouterAbi,
                functionName: 'executeSwap',
                args: [intent, signature], 
                account: this.account
            });

            if(amountOut < BigInt(intent.minAmountOut)) {
                throw new Error("Slippage exceeded on external swap");
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
            if (amountOut === 0n) throw new Error("Zero output amount — aborting");
    
            if(amountOut < BigInt(intent.minAmountOut)) {
                throw new Error(`Slippage exceeded on settlement: minAmountOut was ${intent.minAmountOut}, but got ${amountOut}`);
            }

            const { request } = await publicClient.simulateContract({
                address: this.intentSpotRouterAddress,
                abi: IntentSpotRouterAbi,
                functionName: 'settleTrade',
                args: [intent, signature, getAddress(counterparty), amountOut],
                account: this.account
            });

            const hash = await this.walletClient.writeContract(request);
            console.log(`Internal settlement transaction sent: ${hash}. Intent ID: ${intent_id}`);

            this.emit('settlement_status', { userA: intent.user, userB: counterparty, message: `Settlement complete.`, type: 'success' });
            this.updateOrderStatusInDB(signature, 'fulfilled');
        } catch (error: any) {
            console.error("On-chain settlement failed:", error);
            this.emit('agent_status', { orderId: intent_id, userAddress: intent.user, msg: `On-chain settlement failed: ${error.message}`.substring(0, 100), type: 'error' });
            this.updateOrderStatusInDB(signature, 'failed', error.message);
            throw error;
        }
    }
}
