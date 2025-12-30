import { relayerConfig } from '@forge/common';
import { IntentSpotRouter__factory } from '../contracts/factories/IntentSpotRouter__factory';
import { orderBook } from '../api/orderbook';

const MIN_PROFIT_BPS = 10; // 0.1%

async function getMarketPrice(tokenIn: string, tokenOut: string): Promise<number> {
    // This is a placeholder. In a real application, you would fetch the price from a reliable source like a DEX or a price oracle.
    console.log(`Fetching market price for ${tokenIn}/${tokenOut}`);
    return 1.0; // Placeholder price
}

async function executeTrade(intent: any, signature: any, network: 'base' | 'local') {
    console.log(`Executing trade for intent:`, intent);
    try {
        const signer = await relayerConfig.getSigner(network);
        const networkConfig = relayerConfig.getNetworkByChainId(intent.chainId);
        if (!networkConfig) {
            throw new Error(`Unsupported chainId: ${intent.chainId}`);
        }
        const intentSpotRouterAddress = networkConfig.intentSpotRouterAddress;
        const intentSpotRouter = IntentSpotRouter__factory.connect(intentSpotRouterAddress, signer);

        const tx = await intentSpotRouter.executeSwap(intent, signature);
        const receipt = await tx.wait();
        if (!receipt || receipt.status === 0) { // Transaction failed
            throw new Error('Transaction reverted on-chain');
        }

        console.log(`Trade executed successfully. Tx hash: ${tx.hash}`);
        return tx.hash;
    } catch (error: any) {
        console.error(`Failed to execute trade: ${error.message}`);
        return null;
    }
}

export class MatchingEngine {
    private interval: NodeJS.Timeout | null = null;

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

    private async matchOrders() {
        console.log('Checking for matching orders...');
        for (const bid of orderBook.bids) {
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
                    orderBook.bids = orderBook.bids.filter(b => b !== bid);
                }
            }
        }

        for (const ask of orderBook.asks) {
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
                    orderBook.asks = orderBook.asks.filter(a => a !== ask);
                 }
            }
        }
    }
}
