
import { LiquidityEngine } from '../liquidity/engine';

export class MatchingEngine {
    private interval: NodeJS.Timeout | null = null;
    private liquidityEngine: LiquidityEngine;
    private openOrders: any[] = [];
    private isMatching: boolean = false;

    constructor(liquidityEngine: LiquidityEngine) {
        this.liquidityEngine = liquidityEngine;
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
        if (order.orderType === 'market') {
            console.log('Processing market order:', order.nonce);
            this.matchMarketOrder(order);
        } else if (order.orderType === 'limit') {
            console.log('Adding limit order to book:', order.nonce);
            this.openOrders.push(order);
        } else {
            throw new Error(`Unsupported order type: ${order.orderType}`);
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
        if (!pairOrders) {
            console.log(`No liquidity for market order ${marketOrder.nonce}, falling back to LP.`);
            await this.liquidityEngine.executeWithLP(marketOrder);
            return;
        }

        const { bids, asks } = pairOrders;
        const counterOrders = marketOrder.side === 'buy' ? asks : bids;
        
        let remainingQuantity = Number(marketOrder.quantity);

        for (const counterOrder of counterOrders) {
            if (remainingQuantity <= 0) break;

            const fillQuantity = Math.min(remainingQuantity, Number(counterOrder.quantity));

            await this.liquidityEngine.settleMatchedTrade({
                buyer: marketOrder.side === 'buy' ? marketOrder : counterOrder,
                seller: marketOrder.side === 'buy' ? counterOrder : marketOrder,
                quantity: fillQuantity,
                price: Number(counterOrder.price)
            });

            remainingQuantity -= fillQuantity;
            counterOrder.quantity = (Number(counterOrder.quantity) - fillQuantity).toString();
        }

        this.openOrders = this.openOrders.filter(o => Number(o.quantity) > 0);

        if (remainingQuantity > 0) {
            console.log(`Market order ${marketOrder.nonce} partially filled. Remaining quantity ${remainingQuantity} falling back to LP.`);
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

                bids.sort((a, b) => Number(b.price) - Number(a.price));
                asks.sort((a, b) => Number(a.price) - Number(b.price));

                while (bids.length > 0 && asks.length > 0) {
                    const bestBid = bids[0];
                    const bestAsk = asks[0];

                    if (Number(bestBid.price) >= Number(bestAsk.price)) {
                        const fillQuantity = Math.min(Number(bestBid.quantity), Number(bestAsk.quantity));
                        
                        console.log(`Matching limit orders: Buyer ${bestBid.nonce} and Seller ${bestAsk.nonce}`);

                        await this.liquidityEngine.settleMatchedTrade({
                            buyer: bestBid,
                            seller: bestAsk,
                            quantity: fillQuantity,
                            price: Number(bestAsk.price) // Trade executes at the price of the standing order
                        });

                        bestBid.quantity = (Number(bestBid.quantity) - fillQuantity).toString();
                        bestAsk.quantity = (Number(bestAsk.quantity) - fillQuantity).toString();

                        if (Number(bestBid.quantity) <= 0) bids.shift();
                        if (Number(bestAsk.quantity) <= 0) asks.shift();
                    } else {
                        break; // No more matches for this pair
                    }
                }
                stillOpenOrders = stillOpenOrders.concat(bids, asks);
            }
            this.openOrders = stillOpenOrders;
        } catch (error) {
            console.error('Error during limit order matching cycle:', error);
        } finally {
            this.isMatching = false;
        }
    }
}
