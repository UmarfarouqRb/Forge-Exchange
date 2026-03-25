
import { LiquidityEngine } from '../liquidity/engine';
import { EventEmitter } from 'events';

// We don't need direct market imports here anymore, as the LiquidityEngine handles it.

export class MatchingEngine extends EventEmitter {
    private interval: NodeJS.Timeout | null = null;
    private liquidityEngine: LiquidityEngine;
    private openOrders: any[] = [];
    private isMatching: boolean = false;

    constructor(liquidityEngine: LiquidityEngine) {
        super();
        this.liquidityEngine = liquidityEngine;

        // The liquidity engine now emits status updates that we can pass along.
        this.liquidityEngine.on('settlement_status', (data) => {
            this.emit('agent_status', data);
        });
        this.liquidityEngine.on('agent_status', (data) => {
            this.emit('agent_status', data);
        });
    }

    start() {
        console.log('Starting hybrid matching engine...');
        this.interval = setInterval(() => this.matchLimitOrders(), 5000); // Match every 5s
    }

    stop() {
        if (this.interval) {
            console.log('Stopping matching engine...');
            clearInterval(this.interval);
        }
    }

    processOrder(order: any) {
        this.emit('agent_status', { 
            orderId: order.id, 
            msg: '[Engine] Order received. Searching for a match...',
            type: 'info' 
        });

        if (order.orderType === 'market') {
            this.matchMarketOrder(order);
        } else if (order.orderType === 'limit') {
            this.openOrders.push(order);
        } else {
            // Invalid order type
            this.emit('agent_status', { 
                orderId: order.id, 
                msg: `[Engine] Invalid order type: ${order.orderType}`,
                type: 'error' 
            });
        }
    }

    private groupOrdersByPair() {
        const orderbook: { [key: string]: { bids: any[], asks: any[] } } = {};
        for (const order of this.openOrders) {
            if (!order.tradingPairId) continue;

            if (!orderbook[order.tradingPairId]) {
                orderbook[order.tradingPairId] = { bids: [], asks: [] };
            }

            if (order.side === 'buy') {
                orderbook[order.tradingPairId].bids.push(order);
            } else {
                orderbook[order.tradingPairId].asks.push(order);
            }
        }
        return orderbook;
    }

    private async matchMarketOrder(marketOrder: any) {
        const orderbook = this.groupOrdersByPair();
        const pairOrders = orderbook[marketOrder.tradingPairId];
        let remainingQuantity = Number(marketOrder.quantity);

        if (pairOrders) {
            const { bids, asks } = pairOrders;
            const counterOrders = marketOrder.side === 'buy' ? asks : bids;
            
            for (const counterOrder of counterOrders) {
                if (remainingQuantity <= 0) break;

                const fillQuantity = Math.min(remainingQuantity, Number(counterOrder.quantity));

                this.emit('agent_status', { 
                    orderId: marketOrder.id, 
                    msg: `[Engine] Found internal match for ${fillQuantity} ${marketOrder.pair.base.symbol}.`,
                    type: 'info' 
                });

                await this.liquidityEngine.settleMatchedTrade({
                    buyer: marketOrder.side === 'buy' ? marketOrder : counterOrder,
                    seller: marketOrder.side === 'buy' ? counterOrder : marketOrder,
                    quantity: fillQuantity,
                    price: Number(counterOrder.price), // Trade at the limit order's price
                    pair: marketOrder.pair // Pass the full pair object
                });

                remainingQuantity -= fillQuantity;
                counterOrder.quantity = (Number(counterOrder.quantity) - fillQuantity).toString();
            }

            // Remove filled orders
            this.openOrders = this.openOrders.filter(o => Number(o.quantity) > 0);
        }

        if (remainingQuantity > 0) {
            this.emit('agent_status', { 
                orderId: marketOrder.id,
                msg: `[Engine] No internal match found. Routing to external liquidity...`,
                type: 'info' 
            });

            marketOrder.quantity = remainingQuantity.toString();
            await this.liquidityEngine.executeWithLP(marketOrder);
        }
    }

    private async matchLimitOrders() {
        if (this.isMatching || this.openOrders.length < 1) {
            return;
        }

        this.isMatching = true;
        try {
            const orderbook = this.groupOrdersByPair();
            let stillOpenOrders: any[] = [];

            for (const pairId in orderbook) {
                let { bids, asks } = orderbook[pairId];

                // Sort bids descending and asks ascending by price
                bids.sort((a, b) => Number(b.price) - Number(a.price));
                asks.sort((a, b) => Number(a.price) - Number(b.price));

                while (bids.length > 0 && asks.length > 0) {
                    const bestBid = bids[0];
                    const bestAsk = asks[0];

                    if (Number(bestBid.price) >= Number(bestAsk.price)) {
                        const fillQuantity = Math.min(Number(bestBid.quantity), Number(bestAsk.quantity));
                        
                        this.emit('agent_status', {
                            orderId: bestBid.id, 
                            msg: `[Engine] Found internal match for ${fillQuantity} ${bestBid.pair.base.symbol}.`,
                            type: 'info' 
                        });

                        await this.liquidityEngine.settleMatchedTrade({
                            buyer: bestBid,
                            seller: bestAsk,
                            quantity: fillQuantity,
                            price: Number(bestAsk.price), // Trade at the standing order's price
                            pair: bestBid.pair
                        });

                        bestBid.quantity = (Number(bestBid.quantity) - fillQuantity).toString();
                        bestAsk.quantity = (Number(bestAsk.quantity) - fillQuantity).toString();

                        if (Number(bestBid.quantity) <= 0) bids.shift();
                        if (Number(bestAsk.quantity) <= 0) asks.shift();
                    } else {
                        break; // No more matches for this pair
                    }
                }
                // Add any remaining orders back to the open orders list
                stillOpenOrders = stillOpenOrders.concat(bids, asks);
            }
            this.openOrders = stillOpenOrders;
        } catch (error) {
            console.error('Error during limit order matching cycle:', error);
            this.emit('agent_status', { 
                type: 'error', 
                msg: 'An error occurred during order matching.' 
            });
        } finally {
            this.isMatching = false;
        }
    }
}
