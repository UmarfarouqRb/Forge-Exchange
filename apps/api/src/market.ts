
import { getOrdersByPair, Order, getMarketBySymbol, Market } from '@forge/db';
import { http, createPublicClient, parseUnits, formatUnits } from 'viem';
import { base } from 'viem/chains';
import { TOKENS } from '../../frontend/src/config';
import { INTENT_SPOT_ROUTER_ADDRESS } from '../../frontend/src/config/contracts';
import { intentSpotRouterABI } from '../../frontend/src/abis/IntentSpotRouter';

// --- TYPE DEFINITIONS ---

export type OrderBook = {
    bids: [string, string][];
    asks: [string, string][];
};

// This is the composite type that the API returns, combining DB data with live data.
export type MarketState = Omit<Market, 'tradingPairId' | 'updatedAt'> & {
    id: string;
    symbol: string;
    baseAsset: string;
    quoteAsset: string;
    price: number | null; // Mark Price
    priceChangePercent: number;
    currentPrice: string | null;
    bids: [string, string][];
    asks: [string, string][];
    source: 'live';
};

// --- CACHING ---
const cache: { [key: string]: { data: MarketState, lastFetch: number } } = {};
const CACHE_DURATION = 5000; // 5 seconds

// --- LIVE DATA FETCHING ---

const transport = http('https://mainnet.base.org');
const client = createPublicClient({ chain: base, transport });

async function getAMMPrice(tokenIn: { address: `0x${string}`; decimals: number }, tokenOut: { address: `0x${string}`; decimals: number }): Promise<number | null> {
    try {
        const amountOut = await client.readContract({
            address: INTENT_SPOT_ROUTER_ADDRESS[base.id],
            abi: intentSpotRouterABI,
            functionName: 'getAmountOut',
            args: [tokenIn.address, tokenOut.address, parseUnits('1', tokenIn.decimals)],
        });
        return amountOut ? parseFloat(formatUnits(amountOut as bigint, tokenOut.decimals)) : null;
    } catch (error) {
        console.error(`Error fetching from IntentSpotRouter:`, error);
        return null;
    }
}

function generateSyntheticDepth(midPrice: number): OrderBook {
    const bids: [string, string][] = [];
    const asks: [string, string][] = [];
    for (let i = 1; i <= 10; i++) {
        bids.push([(midPrice * (1 - i * 0.002)).toFixed(4), (Math.random() * 15 + 5).toFixed(2)]);
        asks.push([(midPrice * (1 + i * 0.002)).toFixed(4), (Math.random() * 15 + 5).toFixed(2)]);
    }
    return { bids, asks };
}

async function getOrderBook(pair: string): Promise<OrderBook & { lastTradePrice: number | null }> {
    const commonQuotes = ['USDT', 'USDC', 'DAI', 'BTC', 'ETH', 'WETH'];
    let baseCurrency = '', quoteCurrency = '';
    for (const quote of commonQuotes) {
        if (pair.endsWith(quote)) {
            baseCurrency = pair.slice(0, -quote.length);
            quoteCurrency = quote;
            break;
        }
    }
    if (!baseCurrency) {
        baseCurrency = pair.slice(0, 3);
        quoteCurrency = pair.slice(3);
    }

    const tokenIn = TOKENS[baseCurrency as keyof typeof TOKENS];
    const tokenOut = TOKENS[quoteCurrency as keyof typeof TOKENS];
    if (!tokenIn || !tokenOut) throw new Error(`Invalid market or tokens for pair ${pair}`);

    const [realOrdersResult, midPrice] = await Promise.all([
        getOrdersByPair(pair),
        getAMMPrice(tokenIn, tokenOut),
    ]);
    
    const realOrders: Order[] = realOrdersResult.map((result) => result.order);

    if (realOrders.length === 0 && midPrice === null) {
        throw new Error('Could not fetch real orders or AMM price.');
    }

    const realBids: [string, string][] = realOrders.filter(o => o.side === 'buy').map(o => [o.price, o.quantity]);
    const realAsks: [string, string][] = realOrders.filter(o => o.side === 'sell').map(o => [o.price, o.quantity]);

    const syntheticDepth = midPrice ? generateSyntheticDepth(midPrice) : { bids: [], asks: [] };

    const aggregateAndSort = (real: [string, string][], synthetic: [string, string][], reverse = false): [string, string][] => {
        const book = new Map<string, number>();
        [...real, ...synthetic].forEach(([price, size]) => {
            book.set(price, (book.get(price) || 0) + parseFloat(size));
        });
        const sorted = Array.from(book.entries()).sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]));
        if (reverse) sorted.reverse();
        return sorted.map(([price, size]) => [price, String(size)]);
    };

    return {
        bids: aggregateAndSort(realBids, syntheticDepth.bids, true),
        asks: aggregateAndSort(realAsks, syntheticDepth.asks),
        lastTradePrice: midPrice
    };
}

export function getMarkPrice(book: OrderBook & { lastTradePrice: number | null }): number | null {
    const bestBid = book.bids[0]?.[0];
    const bestAsk = book.asks[0]?.[0];
    if (bestBid && bestAsk) return (parseFloat(bestBid) + parseFloat(bestAsk)) / 2;
    return book.lastTradePrice;
}

export async function getMarketState(pair: string): Promise<MarketState | null> {
    const now = Date.now();
    if (cache[pair] && (now - cache[pair].lastFetch < CACHE_DURATION)) return cache[pair].data;

    try {
        const [book, marketData] = await Promise.all([
            getOrderBook(pair),
            getMarketBySymbol(pair)
        ]);
        
        const markPrice = getMarkPrice(book);

        const marketState: MarketState = {
            id: pair,
            symbol: pair,
            baseAsset: pair.slice(0, 3),
            quoteAsset: pair.slice(3),
            price: markPrice,
            lastPrice: marketData?.lastPrice ?? book.lastTradePrice?.toString() ?? null,
            priceChangePercent: 0, // This calculation is not yet implemented
            high24h: marketData?.high24h ?? null,
            low24h: marketData?.low24h ?? null,
            volume24h: marketData?.volume24h ?? null,
            currentPrice: markPrice?.toString() ?? null,
            bids: book.bids,
            asks: book.asks,
            source: 'live',
        };

        cache[pair] = { data: marketState, lastFetch: now };
        return marketState;
    } catch (error) {
        console.error(`Failed to get market state for ${pair}:`, error);
        return null;
    }
}
