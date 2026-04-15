
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { LiquidityEngine } from '../liquidity/engine';
import { EventEmitter } from 'events';

// --- CONSTANTS ---
const LP_ADDRESS = process.env.LP_ADDRESS!;
if (!LP_ADDRESS) {
    throw new Error("CRITICAL: LP_ADDRESS environment variable is not set.");
}

// --- TYPES ---
type Order = any; // Replace with a proper shared type definition.

export class MatchingEngine extends EventEmitter {
    private agentName: string;
    private liquidityEngine: LiquidityEngine;
    private supabase: SupabaseClient;

    // In-memory order book
    private books: Map<string, { bids: Order[], asks: Order[] }> = new Map();

    // Queue to ensure sequential, non-overlapping match executions
    private matchQueue: Promise<void> = Promise.resolve();

    constructor(liquidityEngine: LiquidityEngine, agentName: string = 'Solver01') {
        super();
        this.liquidityEngine = liquidityEngine;
        this.agentName = agentName;
        this.supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

        // Pass-through events from the liquidity engine
        this.liquidityEngine.on('settlement_status', (data) => this.emit('agent_status', data));
        this.liquidityEngine.on('agent_status', (data) => this.emit('agent_status', data));
        
        // Hydrate the order book from the DB on startup
        this.hydrateFromDB().catch(err => console.error("Failed to hydrate order book from DB:", err));
    }

    async hydrateFromDB() {
        console.log("Hydrating order book from database...");
        const { data, error } = await this.supabase
            .from('orders')
            .select('*')
            .in('status', ['pending', 'processing']);

        if (error) {
            console.error("Error hydrating from DB:", error);
            return;
        }

        data?.forEach(order => this.addToOrderBook(order, true));
        console.log(`Hydrated ${data?.length || 0} orders.`);
    }

    start() {
        console.log('Matching Engine is running in event-driven mode.');
    }

    stop() {
        console.log('Matching Engine is stopping.');
    }

    private addToOrderBook(order: Order, silent: boolean = false) {
        const { trading_pair_id, id } = order;
        if (!trading_pair_id) {
            console.warn("Order is missing trading_pair_id", order);
            return;
        }

        if (!this.books.has(trading_pair_id)) {
            this.books.set(trading_pair_id, { bids: [], asks: [] });
        }

        const book = this.books.get(trading_pair_id)!;
        const orderList = order.side === 'buy' ? book.bids : book.asks;
        
        if (orderList.some(o => o.id === id)) return; // Avoid duplicates during hydration

        orderList.push(order);
        orderList.sort((a, b) => 
            order.side === 'buy' ? Number(b.price) - Number(a.price) : Number(a.price) - Number(b.price)
        );
        
        if (!silent) {
            this.emitFormattedBook(trading_pair_id, book);
        }
    }
    
    public async processOrder(order: Order) {
        if (!order.intent || !order.intent_id || !order.intent.user) {
            console.error('[MatchingEngine] Received malformed order payload:', order);
            return;
        }
        
        this.emit('agent_status', { 
            orderId: order.intent_id, 
            userAddress: order.intent.user, 
            msg: `[${this.agentName}] Order received. Processing...`,
            type: 'info' 
        });

        if (order.order_type === 'market') {
            await this.fillMarketOrder(order);
        } else if (order.order_type === 'limit') {
            this.addToOrderBook(order);
            this.enqueueMatch();
        } else {
             this.emit('agent_status', { 
                orderId: order.intent_id, 
                userAddress: order.intent.user,
                msg: `[${this.agentName}] Invalid order type: ${order.order_type}`,
                type: 'error' 
            });
        }
    }
    
    private enqueueMatch() {
        this.matchQueue = this.matchQueue
            .then(() => this.matchOrders())
            .catch(err => console.error("Error in matching queue:", err));
        return this.matchQueue;
    }

    private getLPOrder(pairId: string, side: 'buy' | 'sell') {
        const price = this.liquidityEngine.getPrice(pairId);
        if (!price) return null;
    
        const spread = 0.002; // 0.2% spread for LP
    
        const lpPrice = side === 'buy' ? price * (1 + spread) : price * (1 - spread);
    
        return {
            id: 'LP_ORDER',
            user_address: LP_ADDRESS,
            side,
            price: lpPrice,
            quantity: Infinity, 
            isLP: true
        };
    }

    private async fillMarketOrder(marketOrder: Order) {
        const pairId = marketOrder.trading_pair_id;
        let remainingQuantity = Number(marketOrder.quantity);

        // Phase 1: Match internal order book
        const book = this.books.get(pairId) || { bids: [], asks: [] };
        const counterOrders = marketOrder.side === 'buy' ? book.asks : book.bids;

        for (const counterOrder of counterOrders) {
            if (remainingQuantity <= 0) break;
            
            const fillQuantity = Math.min(remainingQuantity, Number(counterOrder.quantity));
            
            await this.executeInternalMatch(
                marketOrder.side === 'buy' ? marketOrder : { ...counterOrder },
                marketOrder.side === 'buy' ? { ...counterOrder } : marketOrder,
                fillQuantity,
                Number(counterOrder.price)
            );

            remainingQuantity -= fillQuantity;
            marketOrder.quantity = remainingQuantity.toString();
        }

        // Phase 2: Try external DEX
        if (remainingQuantity > 0) {
            const simulation = await this.liquidityEngine.simulateExternalSwap(marketOrder.intent, marketOrder.signature);
            if (simulation.success && simulation.amountOut >= marketOrder.intent.minAmountOut) {
                this.emit('agent_status', { orderId: marketOrder.intent_id, userAddress: marketOrder.intent.user, msg: `[${this.agentName}] External DEX simulation successful. Executing swap...`, type: 'info' });
                try {
                    await this.liquidityEngine.executeWithExternalDex(marketOrder.intent, marketOrder.signature, marketOrder.intent_id);
                    remainingQuantity = 0; // Assume full fill from DEX
                } catch (err) {
                     console.warn(`DEX execution failed after successful simulation: ${(err as Error).message}. Falling back to LP.`);
                     this.emit('agent_status', { orderId: marketOrder.intent_id, userAddress: marketOrder.intent.user, msg: `[${this.agentName}] DEX execution failed. Falling back to LP.`, type: 'warning' });
                }
            } else {
                this.emit('agent_status', { orderId: marketOrder.intent_id, userAddress: marketOrder.intent.user, msg: `[${this.agentName}] External DEX simulation failed or insufficient liquidity. Falling back to LP.`, type: 'info' });
            }
        }

        // Phase 3: FINAL fallback to LP
        if (remainingQuantity > 0) {
            const oppositeSide = marketOrder.side === 'buy' ? 'sell' : 'buy';
            const lpOrder = this.getLPOrder(pairId, oppositeSide);

            if (lpOrder) {
                 this.emit('agent_status', { orderId: marketOrder.intent_id, userAddress: marketOrder.intent.user, msg: `[${this.agentName}] Executing final fill for ${remainingQuantity} with LP.`, type: 'info' });
                await this.executeLPMatch(marketOrder, lpOrder, remainingQuantity);
                remainingQuantity = 0;
            } else {
                this.emit('agent_status', { orderId: marketOrder.intent_id, userAddress: marketOrder.intent.user, msg: `[${this.agentName}] CRITICAL: No LP fallback available for pair ${pairId}. Order may be partially filled.`, type: 'error' });
            }
        }
    }

    private async matchOrders() {
        for (const [pairId, book] of this.books.entries()) {
            while (book.bids.length > 0 && book.asks.length > 0) {
                const bestBid = book.bids[0];
                const bestAsk = book.asks[0];

                if (Number(bestBid.price) >= Number(bestAsk.price)) {
                    const fillQuantity = Math.min(Number(bestBid.quantity), Number(bestAsk.quantity));
                    await this.executeInternalMatch({ ...bestBid }, { ...bestAsk }, fillQuantity, Number(bestAsk.price));
                } else {
                    break; // Prices don't cross
                }
            }
        }
    }

    private async executeLPMatch(taker: Order, lpOrder: Order, quantity: number) {
        const orderForLp = { ...taker, quantity };
        await this.liquidityEngine.executeWithLP(orderForLp);
        this.updateOrderStatusInDB({ ...taker, quantity: Number(taker.quantity) - quantity });
    }

    private async executeInternalMatch(buyer: Order, seller: Order, quantity: number, price: number) {
        const msg = `[${this.agentName}] Found internal match for ${quantity} @ ${price}.`;

        this.emit('agent_status', { 
            orderId: buyer.intent_id, 
            userAddress: buyer.intent.user,
            msg,
            type: 'info' 
        });

        this.emit('agent_status', { 
            orderId: seller.intent_id, 
            userAddress: seller.intent.user,
            msg,
            type: 'info' 
        });
        
        await this.liquidityEngine.settleMatchedTrade({ buyer, seller, quantity, price, pair: buyer.pair || seller.pair, intentId: buyer.intent_id });
        
        const updatedBuyer = { ...buyer, quantity: Number(buyer.quantity) - quantity };
        const updatedSeller = { ...seller, quantity: Number(seller.quantity) - quantity };

        const pairId = buyer.trading_pair_id || seller.trading_pair_id;
        const book = this.books.get(pairId)!;

        book.bids = book.bids.map(o => o.id === buyer.id ? updatedBuyer : o).filter(o => o.quantity > 0);
        book.asks = book.asks.map(o => o.id === seller.id ? updatedSeller : o).filter(o => o.quantity > 0);
        
        this.updateOrderStatusInDB(updatedBuyer);
        this.updateOrderStatusInDB(updatedSeller);
        
        this.emitFormattedBook(pairId, book);
    }

    private emitFormattedBook(pairId: string, book: {bids: Order[], asks: Order[]}) {
        const formattedBook = this.formatOrderBook(book);
        this.emit('orderbook_update', { pairId, ...formattedBook });
    }

    private formatOrderBook(book: { bids: Order[], asks: Order[] }) {
        const aggregate = (orders: Order[], isBid: boolean) => {
            const map = new Map<number, number>();
            orders.forEach(o => {
                const price = Number(o.price);
                const qty = Number(o.quantity);
                map.set(price, (map.get(price) || 0) + qty);
            });
    
            const sorted = Array.from(map.entries()).sort((a, b) => isBid ? b[0] - a[0] : a[0] - b[0]);
            return sorted.map(([price, qty]) => [price.toFixed(4), qty.toString()]);
        };
    
        return { bids: aggregate(book.bids, true), asks: aggregate(book.asks, false) };
    }

    private async updateOrderStatusInDB(order: Order) {
        const isFilled = order.quantity <= 0;
        const status = isFilled ? 'fulfilled' : 'processing';

        if (order.id === 'LP_ORDER') return;

        const { error } = await this.supabase
            .from('orders')
            .update({ quantity: order.quantity.toString(), status })
            .eq('id', order.id);

        if (error) {
            console.error(`[DB_SYNC_ERROR] Failed to update order ${order.id}:`, error);
        }
    }
}
