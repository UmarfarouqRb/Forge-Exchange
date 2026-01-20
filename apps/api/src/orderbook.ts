import { http, createPublicClient, parseUnits, formatUnits } from 'viem';
import { foundry } from 'viem/chains';
import { relayerConfig } from '@forge/common';
import { getOrders } from '@forge/db';
import { Request, Response } from 'express';
import { TOKENS } from '../../frontend/src/config';
import { intentSpotRouterABI } from '../../frontend/src/abis/IntentSpotRouter';

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
    const { pair } = req.params;
    if (typeof pair !== 'string') {
        return res.status(400).json({ error: 'Pair parameter is required' });
    }

    let baseCurrency: string | undefined;
    let quoteCurrency: string | undefined;

    // Common quote currencies suffixes
    const commonQuotes = ['USDT', 'USDC', 'DAI', 'BTC', 'ETH', 'WETH'];

    for (const quote of commonQuotes) {
        if (pair.endsWith(quote)) {
            const base = pair.slice(0, -quote.length);
            if (base.length > 0) {
                baseCurrency = base;
                quoteCurrency = quote;
                break;
            }
        }
    }

    // If no common quote currency suffix is found, try splitting at 3 characters
    if (!baseCurrency && pair.length > 3) {
        baseCurrency = pair.slice(0, 3);
        quoteCurrency = pair.slice(3);
    }

    if (!baseCurrency) {
        return res.status(400).json({ error: 'Could not determine base and quote currency from pair' });
    }

    const tokenIn = TOKENS[baseCurrency as keyof typeof TOKENS];
    const tokenOut = TOKENS[quoteCurrency as keyof typeof TOKENS];

    if (!tokenIn || !tokenOut) {
        return res.status(400).json({ error: 'Invalid market specified' });
    }

    // 1. Fetch real orders from the DB
    const realOrders = await getOrders(pair);
    const realBids = realOrders.filter((o: any) => o.side === 'buy').map((o: any) => [o.price, o.amount]);
    const realAsks = realOrders.filter((o: any) => o.side === 'sell').map((o: any) => [o.price, o.amount]);

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

export {};
