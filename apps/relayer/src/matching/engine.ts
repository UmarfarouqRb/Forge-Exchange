
import { LiquidityEngine } from '../liquidity/engine';
import { EventEmitter } from 'events';

export class MatchingEngine extends EventEmitter {
    private interval: NodeJS.Timeout | null = null;
    private liquidityEngine: LiquidityEngine;
    private openOrders: any[] = [];
    private isMatching: boolean = false;

    constructor(liquidityEngine: LiquidityEngine) {
        super();
        this.liquidityEngine = liquidityEngine;

        this.liquidityEngine.on('settlement_status', (data) => {
            this.emit('agent_status', data);
        });
        this.liquidityEngine.on('agent_status', (data) => {
            this.emit('agent_status', data);
        });
    }

    start() {
        console.log('Starting hybrid matching engine...');
        this.interval = setInterval(() => this.matchLimitOrders(), 5000);
    }

    stop() {
        if (this.interval) {
            console.log('Stopping matching engine...');
            clearInterval(this.interval);
        }
    }

    processOrder(order: any) {
        this.emit('agent_status', { 
            orderId: order.intent.id, 
            msg: '[Agent] Order received. Searching for match...',
            type: 'info' 
        });

        if (order.orderType === 'market') {
            this.matchMarketOrder(order);
        } else if (order.orderType === 'limit') {
            this.openOrders.push(order);
        } else {
            this.emit('agent_status', { 
                orderId: order.intent.id, 
                msg: `[Agent] Invalid order type: ${order.orderType}`,
                type: 'error' 
            });
        }
    }

    private groupOrdersByPair() {
        const orderbook: { [key: string]: { bids: any[], asks: any[] } } = {};
        this.openOrders.forEach(order => {
            if (!order.tradingPairId) return;
            if (!orderbook[order.tradingPairId]) {
                orderbook[order.tradingPairId] = { bids: [], asks: [] };
            }
            if (order.side === 'buy') {
                orderbook[order.tradingPairId].bids.push(order);
            } else {
                orderbook[order.tradingPairId].asks.push(order);
            }
        });
        return orderbook;
    }

    private async matchMarketOrder(marketOrder: any) {
        let remainingQuantity = Number(marketOrder.quantity);

        // 1. Attempt to match with open limit orders first
        const orderbook = this.groupOrdersByPair();
        const pairOrders = orderbook[marketOrder.tradingPairId];

        if (pairOrders) {
            const counterOrders = marketOrder.side === 'buy' ? pairOrders.asks : pairOrders.bids;
            
            for (const counterOrder of counterOrders) {
                if (remainingQuantity <= 0) break;
                const fillQuantity = Math.min(remainingQuantity, Number(counterOrder.quantity));

                this.emit('agent_status', { 
                    orderId: marketOrder.intent.id, 
                    msg: `[Agent] Found internal match for ${fillQuantity} ${marketOrder.pair.base.symbol}.`,
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
                counterOrder.quantity = (Number(counterOrder.quantity) - fillQuantity).toString();
            }

            this.openOrders = this.openOrders.filter(o => Number(o.quantity) > 0);
        }

        if (remainingQuantity > 0) {
            marketOrder.quantity = remainingQuantity.toString();

            // 2. If quantity remains, check for a better price on an external DEX
            this.emit('agent_status', { 
                orderId: marketOrder.intent.id,
                msg: `[Agent] No internal match. Checking external liquidity...`,
                type: 'info' 
            });

            const onChainQuote = await this.liquidityEngine.getOnChainQuote(marketOrder);
            const internalPrice = this.liquidityEngine.getPrice(marketOrder.tradingPairId);

            // Simplified price comparison. A real implementation would be more robust.
            if (onChainQuote > 0 && (!internalPrice || onChainQuote > internalPrice)) {
                this.emit('agent_status', { 
                    orderId: marketOrder.intent.id,
                    msg: `[Agent] External DEX offers better price. Routing externally.`,
                    type: 'info' 
                });
                await this.liquidityEngine.executeWithExternalDex(marketOrder.intent, marketOrder.signature);
            } else {
                // 3. Fallback to internal LP if no better external price is found
                this.emit('agent_status', { 
                    orderId: marketOrder.intent.id,
                    msg: `[Agent] No better external price. Settling with internal LP.`,
                    type: 'info' 
                });
                await this.liquidityEngine.executeWithLP(marketOrder);
            }
        }
    }

    private async matchLimitOrders() {
        if (this.isMatching || this.openOrders.length < 1) return;
        this.isMatching = true;

        try {
            const orderbook = this.groupOrdersByPair();
            let stillOpenOrders: any[] = [];

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
                            orderId: bestBid.intent.id, 
                            msg: `[Engine] Found internal match for ${fillQuantity} ${bestBid.pair.base.symbol}.`,
                            type: 'info' 
                        });

                        await this.liquidityEngine.settleMatchedTrade({
                            buyer: bestBid,
                            seller: bestAsk,
                            quantity: fillQuantity,
                            price: Number(bestAsk.price), 
                            pair: bestBid.pair
                        });

                        bestBid.quantity = (Number(bestBid.quantity) - fillQuantity).toString();
                        bestAsk.quantity = (Number(bestAsk.quantity) - fillQuantity).toString();

                        if (Number(bestBid.quantity) <= 0) bids.shift();
                        if (Number(bestAsk.quantity) <= 0) asks.shift();
                    } else {
                        break;
                    }
                }
                stillOpenOrders = stillOpenOrders.concat(bids, asks);
            }
            this.openOrders = stillOpenOrders;
        } catch (error) {
            console.error('Error during limit order matching cycle:', error);
            this.emit('agent_status', { type: 'error', msg: 'An error occurred during order matching.' });
        } finally {
            this.isMatching = false;
        }
    }
}
