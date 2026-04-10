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
        this.interval = setInterval(() => this.matchOrders(), 5000);
    }

    stop() {
        if (this.interval) {
            console.log('Stopping matching engine...');
            clearInterval(this.interval);
        }
    }

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

        // Idempotency Check
        const { data: existingOrder, error } = await supabase
            .from('orders')
            .select('status')
            .eq('intent_id', order.intent.id)
            .single();

        if (existingOrder?.status === 'fulfilled' || existingOrder?.status === 'failed') {
            console.log(`[MatchingEngine] Order ${order.intent.id} already processed with status: ${existingOrder.status}. Skipping.`);
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

    private async getLPOrders(pairId: string, side: 'buy' | 'sell') {
        const midPrice = this.liquidityEngine.getPrice(pairId);
        if (!midPrice) return null;
    
        const spread = 0.002; // 0.2%
        const price = side === 'buy' ? midPrice * (1 + spread) : midPrice * (1 - spread);
    
        return {
            id: 'LP_ORDER',
            side: side === 'buy' ? 'sell' : 'buy',
            price,
            quantity: '1000000', // Effectively infinite for matching purposes
            isLP: true
        };
    }

    private async matchMarketOrder(marketOrder: any) {
        try {
            let remainingQuantity = Number(marketOrder.quantity);
            const pairId = marketOrder.trading_pair_id || marketOrder.pair?.id;

            if (!pairId) {
                throw new Error("Market order is missing trading pair ID");
            }
            
            const openOrders = await this.fetchOpenOrders();
            const orderbook = this.groupOrdersByPair(openOrders);
            let pairOrders = orderbook[pairId];

            const lpOrder = await this.getLPOrders(pairId, marketOrder.side);
            if (lpOrder) {
                if (!pairOrders) {
                    pairOrders = { bids: [], asks: [] };
                }
                if (marketOrder.side === 'buy') {
                    pairOrders.asks.push(lpOrder);
                } else {
                    pairOrders.bids.push(lpOrder);
                }
            }

            if (pairOrders) {
                const counterOrders = marketOrder.side === 'buy' ? pairOrders.asks : pairOrders.bids;
                counterOrders.sort((a, b) => a.price - b.price);

                for (const counterOrder of counterOrders) {
                    if (remainingQuantity <= 0) break;

                    if (counterOrder.isLP) {
                        await this.liquidityEngine.executeWithLP({
                            ...marketOrder,
                            price: counterOrder.price,
                            quantity: remainingQuantity
                        });
                        remainingQuantity = 0;
                        break;
                    }

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

                    await supabase
                        .from('orders')
                        .update({ 
                            quantity: remainingCounterOrderQuantity.toString(),
                            status: remainingCounterOrderQuantity <= 0 ? 'fulfilled' : 'processing'
                        })
                        .eq('id', counterOrder.id);
                }
            }

            if (remainingQuantity > 0) {
                this.emit('agent_status', { 
                    orderId: marketOrder.intent.id,
                    userAddress: marketOrder.intent.user,
                    msg: `[${this.agentName}] No internal liquidity. Checking external DEX...`,
                    type: 'info' 
                });
                await this.liquidityEngine.executeWithExternalDex(marketOrder.intent, marketOrder.signature);
                remainingQuantity = 0;
            }
            
            const finalStatus = remainingQuantity === 0 ? 'fulfilled' : 'partial';
            await supabase
                .from('orders')
                .update({ status: finalStatus, quantity: remainingQuantity.toString() })
                .eq('intent_id', marketOrder.intent.id);

        } catch (error: any) {
            console.error(`[MatchingEngine] Error processing market order ${marketOrder.intent.id}:`, error);
            await supabase
                .from('orders')
                .update({ status: 'failed', last_error: error.message })
                .eq('intent_id', marketOrder.intent.id);

            this.emit('agent_status', { 
                orderId: marketOrder.intent.id,
                userAddress: marketOrder.intent.user,
                msg: `[${this.agentName}] Error processing market order.`,
                type: 'error' 
            });
        }
    }

    private async matchOrders() {
        if (this.isMatching) return;
        this.isMatching = true;

        try {
            const { data: openOrders, error } = await supabase.rpc('fetch_and_lock_orders');

            if (error) {
                console.error('Error fetching and locking orders:', error);
                return;
            }

            if (!openOrders || openOrders.length < 1) return;

            const orderbook = this.groupOrdersByPair(openOrders);

            for (const pairId in orderbook) {
                let { bids, asks } = orderbook[pairId];
                bids.sort((a, b) => Number(b.price) - Number(a.price)); 
                asks.sort((a, b) => Number(a.price) - Number(b.price)); 

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
                        break; 
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
