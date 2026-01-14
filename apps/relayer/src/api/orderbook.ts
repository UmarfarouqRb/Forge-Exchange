import { http, createPublicClient, parseUnits, formatUnits } from 'viem';
import { foundry } from 'viem/chains';
import { intentSpotRouterABI } from '../config/abis';
import { TOKENS } from '../config/tokens';
import { relayerConfig } from '../config';
import { repository } from '../db';
import { Request, Response } from 'express';

// --- Blockchain Client Setup ---
const transport = http(relayerConfig.networks.local.providerUrl);
const client = createPublicClient({
  chain: foundry,
  transport,
});

// --- Price Fetching ---
async function getAMMPrice(tokenIn: { address: `0x${string}`; decimals: number }, tokenOut: { address: `0x${string}`; decimals: number }): Promise<number | null> {
    try {
        const amountOut = await client.readContract({
            address: relayerConfig.networks.local.intentSpotRouterAddress as `0x${string}`,
            abi: intentSpotRouterABI,
            functionName: 'getAmountOut',
            args: [tokenIn.address, tokenOut.address, parseUnits('1', tokenIn.decimals)],
        });
        return parseFloat(formatUnits(amountOut as bigint, tokenOut.decimals));
    } catch (error) {
        console.error("Error fetching AMM price:", error);
        return null; // Return null if fetching fails
    }
}

// --- Synthetic Liquidity Generation ---
function generateSyntheticDepth(midPrice: number): { bids: [string, string][], asks: [string, string][] } {
    const bids: [string, string][] = [];
    const asks: [string, string][] = [];
    const depthLevels = 10;
    const spreadPercentage = 0.002; // 0.2% between each level

    for (let i = 1; i <= depthLevels; i++) {
        const bidPrice = midPrice * (1 - i * spreadPercentage);
        const askPrice = midPrice * (1 + i * spreadPercentage);
        
        // Simulate some random volume for each level
        const bidSize = Math.random() * 15 + 5; // Random size between 5 and 20
        const askSize = Math.random() * 15 + 5; // Random size between 5 and 20

        bids.push([bidPrice.toFixed(4), bidSize.toFixed(2)]);
        asks.push([askPrice.toFixed(4), askSize.toFixed(2)]);
    }

    return { bids, asks };
}

// --- Order Book Logic ---
export async function getOrderBook(req: Request, res: Response) {
    const { market } = req.query;
    if (typeof market !== 'string') {
        return res.status(400).json({ error: 'Market query parameter is required' });
    }

    const [baseCurrency, quoteCurrency] = market.split('-');
    const tokenIn = TOKENS[baseCurrency];
    const tokenOut = TOKENS[quoteCurrency];

    if (!tokenIn || !tokenOut) {
        return res.status(400).json({ error: 'Invalid market specified' });
    }

    // 1. Fetch real orders from the DB
    const realOrders = await repository.getOrdersByMarket(market);
    const realBids = realOrders.filter(o => o.side === 'buy').map(o => [o.price, o.amount]);
    const realAsks = realOrders.filter(o => o.side === 'sell').map(o => [o.price, o.amount]);

    // 2. Fetch the AMM mid-price
    const midPrice = await getAMMPrice(tokenIn, tokenOut);
    if (midPrice === null) {
        // If we can't get a price, we can't generate synthetic depth.
        // We could return an error or just the real orders.
        return res.status(503).json({ error: 'Could not fetch market price from AMM.' });
    }

    // 3. Generate synthetic liquidity
    const syntheticDepth = generateSyntheticDepth(midPrice);

    // 4. Merge real and synthetic orders (with aggregation)
    const aggregateAndSort = (real: (string | number)[][], synthetic: [string, string][], reverse = false) => {
        const book = new Map<string, number>();
        [...real, ...synthetic].forEach(([price, size]) => {
            const priceStr = String(price);
            const currentSize = book.get(priceStr) || 0;
            book.set(priceStr, currentSize + parseFloat(size as string));
        });

        const sorted = Array.from(book.entries()).sort((a, b) => {
            const diff = parseFloat(a[0]) - parseFloat(b[0]);
            return reverse ? -diff : diff;
        });
        
        return sorted.map(([price, size]) => [price, String(size)]);
    };

    const bids = aggregateAndSort(realBids, syntheticDepth.bids, true);
    const asks = aggregateAndSort(realAsks, syntheticDepth.asks);

    // 5. Return the combined order book
    res.json({ bids, asks });
}
