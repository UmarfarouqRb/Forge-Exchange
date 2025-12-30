"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MatchingEngine = void 0;
const config_1 = require("../config");
const IntentSpotRouter__factory_1 = require("../contracts/factories/IntentSpotRouter__factory");
const orderbook_1 = require("../api/orderbook");
const MIN_PROFIT_BPS = 10; // 0.1%
async function getMarketPrice(tokenIn, tokenOut) {
    // This is a placeholder. In a real application, you would fetch the price from a reliable source like a DEX or a price oracle.
    console.log(`Fetching market price for ${tokenIn}/${tokenOut}`);
    return 1.0; // Placeholder price
}
async function executeTrade(intent, signature, network) {
    console.log(`Executing trade for intent:`, intent);
    try {
        const signer = await config_1.relayerConfig.getSigner(network);
        const intentSpotRouterAddress = config_1.relayerConfig.networks[network].intentSpotRouterAddress;
        const intentSpotRouter = IntentSpotRouter__factory_1.IntentSpotRouter__factory.connect(intentSpotRouterAddress, signer);
        const tx = await intentSpotRouter.executeSwap(intent, signature);
        await tx.wait();
        console.log(`Trade executed successfully. Tx hash: ${tx.hash}`);
        return tx.hash;
    }
    catch (error) {
        console.error(`Failed to execute trade: ${error.message}`);
        return null;
    }
}
class MatchingEngine {
    constructor() {
        this.interval = null;
    }
    start() {
        console.log('Starting matching engine...');
        this.interval = setInterval(this.matchOrders.bind(this), 5000); // Check for matches every 5 seconds
    }
    stop() {
        if (this.interval) {
            console.log('Stopping matching engine...');
            clearInterval(this.interval);
        }
    }
    async matchOrders() {
        console.log('Checking for matching orders...');
        for (const bid of orderbook_1.orderBook.bids) {
            const marketPrice = await getMarketPrice(bid.tokenIn, bid.tokenOut);
            const orderPrice = bid.amountIn / bid.minAmountOut;
            if (marketPrice <= orderPrice) {
                // Calculate potential profit
                const expectedOutput = bid.amountIn * marketPrice;
                const profit = expectedOutput - bid.minAmountOut;
                const profitBps = (profit / bid.minAmountOut) * 10000;
                if (profitBps >= MIN_PROFIT_BPS) {
                    console.log(`Found a profitable bid to fill:`, bid);
                    await executeTrade(bid.intent, bid.signature, 'local');
                    // Remove the filled order from the order book
                    orderbook_1.orderBook.bids = orderbook_1.orderBook.bids.filter(b => b !== bid);
                }
            }
        }
        for (const ask of orderbook_1.orderBook.asks) {
            const marketPrice = await getMarketPrice(ask.tokenIn, ask.tokenOut);
            const orderPrice = ask.amountIn / ask.minAmountOut;
            if (marketPrice >= orderPrice) {
                // Calculate potential profit
                const expectedOutput = ask.amountIn * marketPrice;
                const profit = expectedOutput - ask.minAmountOut;
                const profitBps = (profit / ask.minAmountOut) * 10000;
                if (profitBps >= MIN_PROFIT_BPS) {
                    console.log(`Found a profitable ask to fill:`, ask);
                    await executeTrade(ask.intent, ask.signature, 'local');
                    // Remove the filled order from the order book
                    orderbook_1.orderBook.asks = orderbook_1.orderBook.asks.filter(a => a !== ask);
                }
            }
        }
    }
}
exports.MatchingEngine = MatchingEngine;
