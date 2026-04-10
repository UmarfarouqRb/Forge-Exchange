import { createClient } from '@supabase/supabase-js';
import { LiquidityEngine } from '../liquidity/engine';
import { EventEmitter } from 'events';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export class MatchingEngine extends EventEmitter {
    private agentName: string;
    private interval: NodeJS.Timeout | null = null;
    private liquidityEngine: LiquidityEngine;
    private isMatching: boolean = false;

    constructor(liquidityEngine: LiquidityEngine, agentName: string = 'Solver01') {
        super();
        this.liquidityEngine = liquidityEngine;
        this.agentName = agentName;

        this.liquidityEngine.on('settlement_status', (data) => {
            this.emit('agent_status', data);
        });
        this.liquidityEngine.on('agent_status', (data) => {
            this.emit('agent_status', data);
        });
    }

    start() {
        console.log('Starting hybrid matching engine...');
        // The main loop now fetches orders from the DB, not just in-memory
        this.interval = setInterval(() => this.matchOrders(), 5000);
    }

    stop() {
        if (this.interval) {
            console.log('Stopping matching engine...');
            clearInterval(this.interval);
        }
    }

    // This function is now only responsible for market orders that are immediately executed.
    // Limit orders will be handled by the main `matchOrders` loop.
    async processOrder(order: any) {
        if (!order.intent || !order.intent.id || !order.intent.user) {
            console.error('[MatchingEngine] Received malformed order payload:', order);
            this.emit('agent_status', {
                orderId: order.intent?.id,
                userAddress: order.intent?.user,
                msg: `[${this.agentName}] Error: Malformed order payload. Missing intent details.`,
                type: 'error'
            });
            return;
        }

        this.emit('agent_status', { 
            orderId: order.intent.id, 
            userAddress: order.intent.user, 
            msg: `[${this.agentName}] Order received. Searching for match...`,
            type: 'info' 
        });

        if (order.order_type === 'market') {
            await this.matchMarketOrder(order);
        } else if (order.order_type !== 'limit') {
            this.emit('agent_status', { 
                orderId: order.intent.id, 
                userAddress: order.intent.user,
                msg: `[${this.agentName}] Invalid order type: ${order.order_type}`,
                type: 'error' 
            });
        }
    }

    private async fetchOpenOrders() {
        const { data, error } = await supabase
            .from('orders')
            .select(`
                *,
                pair:trading_pairs (
                    *,
                    base_token:tokens!trading_pairs_base_token_id_fkey (*),
                    quote_token:tokens!trading_pairs_quote_token_id_fkey (*)
                )
            `)
            .in('status', ['pending', 'processing'])
            .eq('order_type', 'limit');

        if (error) {
            console.error("Error fetching open orders:", error);
            return [];
        }
        return data || [];
    }

    private groupOrdersByPair(orders: any[]) {
        const orderbook: { [key: string]: { bids: any[], asks: any[] } } = {};
        orders.forEach(order => {
            const pairId = order.trading_pair_id || order.pair?.id;
            if (!pairId) {
                console.warn("Order missing trading pair ID", order);
                return;
            }
            if (!orderbook[pairId]) {
                orderbook[pairId] = { bids: [], asks: [] };
            }
            if (order.side === 'buy') {
                orderbook[pairId].bids.push(order);
            } else {
                orderbook[pairId].asks.push(order);
            }
        });
        return orderbook;
    }

    private async matchMarketOrder(marketOrder: any) {
        let remainingQuantity = Number(marketOrder.quantity);
        const pairId = marketOrder.trading_pair_id || marketOrder.pair?.id;

        if (!pairId) {
            console.error("Market order is missing trading pair ID", marketOrder);
            return;
        }
        
        const openOrders = await this.fetchOpenOrders();
        const orderbook = this.groupOrdersByPair(openOrders);
        const pairOrders = orderbook[pairId];

        if (pairOrders) {
            const counterOrders = marketOrder.side === 'buy' ? pairOrders.asks : pairOrders.bids;
            
            for (const counterOrder of counterOrders) {
                if (remainingQuantity <= 0) break;

                const fillQuantity = Math.min(remainingQuantity, Number(counterOrder.quantity));

                this.emit('agent_status', { 
                    orderId: marketOrder.intent.id, 
                    userAddress: marketOrder.intent.user,
                    msg: `[${this.agentName}] Found internal match for ${fillQuantity} ${marketOrder.pair?.base?.symbol || 'base token'}.`,
                    type: 'info' 
                });

                await this.liquidityEngine.settleMatchedTrade({
                    buyer: marketOrder.side === 'buy' ? marketOrder : counterOrder,
                    seller: marketOrder.side === 'buy' ? counterOrder : marketOrder,
                    quantity: fillQuantity,
                    price: Number(counterOrder.price),
                    pair: marketOrder.pair
                });

                remainingQuantity -= fillQuantity;
                
                const remainingCounterOrderQuantity = Number(counterOrder.quantity) - fillQuantity;

                // Update counter order in DB
                await supabase
                    .from('orders')
                    .update({ 
                        quantity: remainingCounterOrderQuantity.toString(),
                        status: remainingCounterOrderQuantity <= 0 ? 'fulfilled' : 'processing'
                    })
                    .eq('id', counterOrder.id);
            }
        }

        // If there's still a remaining quantity for the market order, route it externally
        if (remainingQuantity > 0) {
            marketOrder.quantity = remainingQuantity.toString();

            this.emit('agent_status', { 
                orderId: marketOrder.intent.id,
                userAddress: marketOrder.intent.user,
                msg: `[${this.agentName}] No internal match. Checking external liquidity...`,
                type: 'info' 
            });
            const onChainQuote = await this.liquidityEngine.getOnChainQuote(marketOrder);
            const internalPrice = this.liquidityEngine.getPrice(pairId);

            if (onChainQuote > 0 && (!internalPrice || onChainQuote > internalPrice)) {
                this.emit('agent_status', { 
                    orderId: marketOrder.intent.id,
                    userAddress: marketOrder.intent.user,
                    msg: `[${this.agentName}] External DEX offers better price. Routing externally.`,
                    type: 'info' 
                });
                await this.liquidityEngine.executeWithExternalDex(marketOrder.intent, marketOrder.signature);
            } else {
                this.emit('agent_status', { 
                    orderId: marketOrder.intent.id,
                    userAddress: marketOrder.intent.user,
                    msg: `[${this.agentName}] No better external price. Settling with internal LP.`,
                    type: 'info' 
                });
                await this.liquidityEngine.executeWithLP(marketOrder);
            }
        }
    }

    private async matchOrders() {
        if (this.isMatching) return;
        this.isMatching = true;

        try {
            const openOrders = await this.fetchOpenOrders();
            if (openOrders.length < 1) return;

            const orderbook = this.groupOrdersByPair(openOrders);

            for (const pairId in orderbook) {
                let { bids, asks } = orderbook[pairId];
                bids.sort((a, b) => Number(b.price) - Number(a.price)); // Highest price first
                asks.sort((a, b) => Number(a.price) - Number(b.price)); // Lowest price first

                while (bids.length > 0 && asks.length > 0) {
                    const bestBid = bids[0];
                    const bestAsk = asks[0];

                    if (Number(bestBid.price) >= Number(bestAsk.price)) {
                        const fillQuantity = Math.min(Number(bestBid.quantity), Number(bestAsk.quantity));
                        
                        this.emit('agent_status', {
                            orderId: bestBid.intent_id, 
                            userAddress: bestBid.user_address,
                            msg: `[${this.agentName}] Found internal match for ${fillQuantity} ${bestBid.pair?.base_token?.symbol || 'base'}.`,
                            type: 'info' 
                        });

                        this.emit('agent_status', { 
                            orderId: bestAsk.intent_id, 
                            userAddress: bestAsk.user_address,
                            msg: `[${this.agentName}] Found internal match for ${fillQuantity} ${bestAsk.pair?.base_token?.symbol || 'base'}.`,
                            type: 'info' 
                        });

                        await this.liquidityEngine.settleMatchedTrade({
                            buyer: bestBid,
                            seller: bestAsk,
                            quantity: fillQuantity,
                            price: Number(bestAsk.price), 
                            pair: bestBid.pair
                        });
                        
                        const remainingBidQuantity = Number(bestBid.quantity) - fillQuantity;
                        const remainingAskQuantity = Number(bestAsk.quantity) - fillQuantity;

                        // Update orders in DB
                        await supabase.from('orders').update({ 
                            quantity: remainingBidQuantity.toString(),
                            status: remainingBidQuantity <= 0 ? 'fulfilled' : 'processing'
                        }).eq('id', bestBid.id);

                        await supabase.from('orders').update({ 
                            quantity: remainingAskQuantity.toString(),
                            status: remainingAskQuantity <= 0 ? 'fulfilled' : 'processing'
                        }).eq('id', bestAsk.id);


                        if (remainingBidQuantity <= 0) bids.shift();
                        if (remainingAskQuantity <= 0) asks.shift();

                    } else {
                        break; // No more matches for this pair
                    }
                }
            }
        } catch (error) {
            console.error('Error during limit order matching cycle:', error);
            this.emit('agent_status', { type: 'error', msg: 'An error occurred during order matching.' });
        } finally {
            this.isMatching = false;
        }
    }
}
