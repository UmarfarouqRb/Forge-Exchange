
import { getOrdersByPairId, Order, getMarketById, Market } from '@forge/db';
import {
    http,
    createPublicClient,
    parseUnits,
    formatUnits,
    getAddress,
    isAddress
} from 'viem';
import { base } from 'viem/chains';
import { INTENT_SPOT_ROUTER_ADDRESS } from '../../frontend/src/config/contracts';
import { intentSpotRouterABI } from '../../frontend/src/abis/IntentSpotRouter';
import { getPairById, getPairBySymbol } from './pairs';
import type { Token } from '@forge/db';

// --- TYPE DEFINITIONS ---

export type OrderBook = {
    bids: [string, string][];
    asks: [string, string][];
};

// This is the composite type that the API returns, combining DB data with live data.
export type MarketState = {
    id: string;
    symbol: string;
    baseAsset: string;
    quoteAsset: string;
    price: number | null; // Mark Price
    lastPrice: string | null;
    priceChangePercent: number;
    high24h: string | null;
    low24h: string | null;
    volume24h: string | null;
    currentPrice: string | null;
    bids: [string, string][];
    asks: [string, string][];
    source: 'live' | 'cached' | 'unavailable';
    isActive: boolean;
};

// --- UTILITY FUNCTIONS ---

function safeAddress(addr?: string | null): `0x${string}` | null {
    if (!addr) return null;
    if (!isAddress(addr)) {
        console.warn(`Invalid address provided: ${addr}`);
        return null;
    }
    return getAddress(addr); // Return checksum-corrected address
}

// --- CACHING ---
const cache: { [key: string]: { data: MarketState, lastFetch: number } } = {};
const CACHE_DURATION = 600000; // 10 minutes

// --- LIVE DATA FETCHING ---

const alchemyRpcUrl = process.env.ALCHEMY_RPC_URL;
const publicRpcUrl = 'https://mainnet.base.org';

// Prioritize Alchemy RPC if available
const primaryTransport = alchemyRpcUrl ? http(alchemyRpcUrl) : http(publicRpcUrl);
const primaryClient = createPublicClient({ chain: base, transport: primaryTransport });

// Define a fallback client if Alchemy is used
const fallbackClient = alchemyRpcUrl ? createPublicClient({ chain: base, transport: http(publicRpcUrl) }) : null;


async function getAMMPrice(tokenIn: { address: string; decimals: number }, tokenOut: { address: string; decimals: number }): Promise < number | null > {
    const safeTokenInAddress = safeAddress(tokenIn.address);
    const safeTokenOutAddress = safeAddress(tokenOut.address);

    if (!safeTokenInAddress || !safeTokenOutAddress) {
        console.warn(`AMM call skipped due to invalid token address.`);
        return null;
    }

    const contractCall = {
        address: INTENT_SPOT_ROUTER_ADDRESS[base.id],
        abi: intentSpotRouterABI,
        functionName: 'getAmountOut',
        args: [safeTokenInAddress, safeTokenOutAddress, parseUnits('1', tokenIn.decimals)],
    } as const;

    try {
        const amountOut = await primaryClient.readContract(contractCall);
        return amountOut ? parseFloat(formatUnits(amountOut as bigint, tokenOut.decimals)) : null;
    } catch (error) {
        console.error(`Error fetching AMM price from primary RPC:`, error);
        if (fallbackClient) {
            console.log('Falling back to public RPC...');
            try {
                const amountOut = await fallbackClient.readContract(contractCall);
                return amountOut ? parseFloat(formatUnits(amountOut as bigint, tokenOut.decimals)) : null;
            } catch (fallbackError) {
                console.error(`Error fetching AMM price from fallback RPC:`, fallbackError);
            }
        }
        return null; // Never throw, always return a value
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

async function getOrderBook(baseToken: Token, quoteToken: Token, pairId: string): Promise < OrderBook & { lastTradePrice: number | null } > {
    let midPrice: number | null = await getAMMPrice(baseToken, quoteToken);

    let realOrders: Order[] = [];
    try {
        realOrders = await getOrdersByPairId(pairId);
    } catch (dbError) {
        console.error(`Database error fetching orders for ${pairId}:`, dbError);
        // Continue without real orders
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

export async function getMarketState(pairId: string): Promise < MarketState | null > {
    const now = Date.now();
    if (cache[pairId] && (now - cache[pairId].lastFetch < CACHE_DURATION)) {
        const cachedData = cache[pairId].data;
        cachedData.source = 'cached';
        return cachedData;
    }

    try {
        const pairInfo = await getPairById(pairId);
        if (!pairInfo) {
            return null; // Or handle as a 404 earlier
        }

        const { symbol: pair, baseToken, quoteToken, isActive } = pairInfo;

        // Fetch data concurrently, but safely
        const [bookResult, marketDataResult] = await Promise.allSettled([
            getOrderBook(baseToken, quoteToken, pairId),
            getMarketById(pairId)
        ]);

        const book = bookResult.status === 'fulfilled' ? bookResult.value : { bids: [], asks: [], lastTradePrice: null };
        const marketData = marketDataResult.status === 'fulfilled' ? marketDataResult.value : null;

        if (bookResult.status === 'rejected') {
            console.error(`Failed to get order book for ${pair}:`, bookResult.reason);
        }
        if (marketDataResult.status === 'rejected') {
            console.error(`Failed to get market data for ${pair}:`, marketDataResult.reason);
        }

        const markPrice = getMarkPrice(book);
        const lastPrice = marketData?.lastPrice ?? book.lastTradePrice?.toString() ?? null;

        let priceChangePercent = 0;
        // @ts-ignore - open24h is not defined in the shared type, but is expected from the DB
        const openPrice24h = marketData?.open24h;

        if (lastPrice && openPrice24h) {
            const last = parseFloat(lastPrice);
            const open = parseFloat(openPrice24h);
            if (open !== 0) {
                priceChangePercent = ((last - open) / open) * 100;
            }
        }

        const marketState: MarketState = {
            id: pairId,
            symbol: pair,
            baseAsset: baseToken.symbol,
            quoteAsset: quoteToken.symbol,
            price: markPrice,
            lastPrice: lastPrice,
            priceChangePercent: priceChangePercent,
            high24h: marketData?.high24h ?? null,
            low24h: marketData?.low24h ?? null,
            volume24h: marketData?.volume24h ?? null,
            currentPrice: markPrice?.toString() ?? null,
            bids: book.bids,
            asks: book.asks,
            source: 'live',
            isActive: isActive ?? false,
        };

        cache[pairId] = { data: marketState, lastFetch: now };
        return marketState;
    } catch (error) {
        console.error(`Critical failure in getMarketState for ${pairId}:`, error);
        return null; // Last resort, should not happen with the inner catches.
    }
}

export async function getMarketStateBySymbol(symbol: string): Promise<MarketState | null> {
    const pair = await getPairBySymbol(symbol);
    if (!pair) {
        return null;
    }
    return getMarketState(pair.id);
}
