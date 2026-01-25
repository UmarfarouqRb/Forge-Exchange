
import { getOrdersByPair } from '@forge/db';
import { http, createPublicClient, parseUnits, formatUnits, Abi } from 'viem';
import { base } from 'viem/chains';
import { TOKENS } from '../../frontend/src/config';

const transport = http('https://mainnet.base.org');
const client = createPublicClient({
  chain: base,
  transport,
});

const PANCAKE_QUOTER_ADDRESS = '0x3c22449C3696145fC75078525E5921835777D43A';
const PANCAKE_QUOTER_ABI: Abi = [
  {
    "name": "quoteExactInputSingle",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [
      { "name": "tokenIn", "type": "address" },
      { "name": "tokenOut", "type": "address" },
      { "name": "fee", "type": "uint24" },
      { "name": "amountIn", "type": "uint256" },
      { "name": "sqrtPriceLimitX96", "type": "uint160" },
    ],
    "outputs": [
      { "name": "amountOut", "type": "uint256" },
    ],
  }
] as const;

const FEE_TIERS = [100, 500, 2500, 10000];

async function getAMMPrice(tokenIn: { address: `0x${string}`; decimals: number }, tokenOut: { address: `0x${string}`; decimals: number }): Promise<number | null> {
    for (const fee of FEE_TIERS) {
        try {
            const amountOut = await client.readContract({
                address: PANCAKE_QUOTER_ADDRESS,
                abi: PANCAKE_QUOTER_ABI,
                functionName: 'quoteExactInputSingle',
                args: [tokenIn.address, tokenOut.address, fee, parseUnits('1', tokenIn.decimals), 0],
            });
            if (amountOut) {
                return parseFloat(formatUnits(amountOut as bigint, tokenOut.decimals));
            }
        } catch (error) {
            console.error(`Error fetching from PancakeSwap for fee ${fee}:`, error);
        }
    }
    console.error("Error fetching PancakeSwap price: Could not find a valid pool for the given pair.");
    return null;
}

function generateSyntheticDepth(midPrice: number): { bids: [string, string][], asks: [string, string][] } {
    const bids: [string, string][] = [];
    const asks: [string, string][] = [];
    const depthLevels = 10;
    const spreadPercentage = 0.002;

    for (let i = 1; i <= depthLevels; i++) {
        const bidPrice = midPrice * (1 - i * spreadPercentage);
        const askPrice = midPrice * (1 + i * spreadPercentage);
        
        const bidSize = Math.random() * 15 + 5;
        const askSize = Math.random() * 15 + 5;

        bids.push([bidPrice.toFixed(4), bidSize.toFixed(2)]);
        asks.push([askPrice.toFixed(4), askSize.toFixed(2)]);
    }

    return { bids, asks };
}

async function getOrderBook(pair: string) {
    let baseCurrency: string | undefined;
    let quoteCurrency: string | undefined;

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

    if (!baseCurrency && pair.length > 3) {
        baseCurrency = pair.slice(0, 3);
        quoteCurrency = pair.slice(3);
    }

    if (!baseCurrency || !quoteCurrency) {
        throw new Error('Could not determine base and quote currency from pair');
    }

    const tokenIn = TOKENS[baseCurrency as keyof typeof TOKENS];
    const tokenOut = TOKENS[quoteCurrency as keyof typeof TOKENS];

    if (!tokenIn || !tokenOut) {
        throw new Error('Invalid market specified');
    }

    const realOrders = await getOrdersByPair(pair);
    const realBids = realOrders.filter((o: any) => o.side === 'buy').map((o: any) => [o.price, o.amount]);
    const realAsks = realOrders.filter((o: any) => o.side === 'sell').map((o: any) => [o.price, o.amount]);

    const midPrice = await getAMMPrice(tokenIn, tokenOut);
    const lastTradePrice = midPrice;

    const syntheticDepth = midPrice ? generateSyntheticDepth(midPrice) : { bids: [], asks: [] };

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

    return { bids, asks, lastTradePrice };
}

export function getMarkPrice(book: { bids: any[][], asks: any[][], lastTradePrice: number | null }) {
    const bestBid = book.bids[0]?.[0];
    const bestAsk = book.asks[0]?.[0];

    if (bestBid && bestAsk) {
        return (parseFloat(bestBid as string) + parseFloat(bestAsk as string)) / 2;
    }
    
    return book.lastTradePrice ?? null;
}

export async function getMarketState(pair: string) {
    const book = await getOrderBook(pair);
    if (!book) {
        return null;
    }
    
    const price = getMarkPrice(book);

    return {
        market: pair,
        price: price,
        bestBid: book.bids[0]?.[0] ?? null,
        bestAsk: book.asks[0]?.[0] ?? null,
        lastTrade: price, 
        volume24h: null, 
        bids: book.bids, 
        asks: book.asks, 
    };
}
