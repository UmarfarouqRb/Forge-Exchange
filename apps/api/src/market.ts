
import { getOrdersByPair, Order, getMarketBySymbol, Market } from '@forge/db';
import { http, createPublicClient, parseUnits, formatUnits, getAddress, isAddress } from 'viem';
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
    source: 'live' | 'cached' | 'unavailable';
};

// --- UTILITY FUNCTIONS ---

function safeAddress(addr?: string | null): `0x${string}` | null {
  if (!addr) return null;
  // This is a temp fix for the invalid address in the config
  if (addr === '0xfdeA615043833213F3423b4934414065654C54Fe') {
      console.warn('Skipping known invalid address: 0xfdeA615043833213F3423b4934414065654C54Fe');
      return null;
  }
  if (!isAddress(addr)) {
    console.warn(`Invalid address provided: ${addr}`);
    return null;
  }
  return getAddress(addr); // Return checksum-corrected address
}

function normalizeChainId(chainId: string | number): number {
  if (typeof chainId === 'number') return chainId;
  if (chainId.startsWith('eip155:')) {
    const numericId = Number(chainId.split(':')[1]);
    if (!isNaN(numericId)) {
        return numericId;
    }
  }
  const numericId = Number(chainId);
  if (!isNaN(numericId)) {
      return numericId;
  }
  throw new Error(`Invalid or unparseable chainId: ${chainId}`);
}

// --- CACHING ---
const cache: { [key: string]: { data: MarketState, lastFetch: number } } = {};
const CACHE_DURATION = 5000; // 5 seconds

// --- LIVE DATA FETCHING ---

const transport = http('https://mainnet.base.org');
const client = createPublicClient({ chain: base, transport });

async function getAMMPrice(tokenIn: { address: `0x${string}`; decimals: number }, tokenOut: { address: `0x${string}`; decimals: number }): Promise<number | null> {
    const safeTokenInAddress = safeAddress(tokenIn.address);
    const safeTokenOutAddress = safeAddress(tokenOut.address);

    if (!safeTokenInAddress || !safeTokenOutAddress) {
        console.warn(`AMM call skipped due to invalid token address.`);
        return null;
    }

    try {
        const amountOut = await client.readContract({
            address: INTENT_SPOT_ROUTER_ADDRESS[base.id],
            abi: intentSpotRouterABI,
            functionName: 'getAmountOut',
            args: [safeTokenInAddress, safeTokenOutAddress, parseUnits('1', tokenIn.decimals)],
        });
        return amountOut ? parseFloat(formatUnits(amountOut as bigint, tokenOut.decimals)) : null;
    } catch (error) {
        console.error(`Error fetching AMM price from IntentSpotRouter:`, error);
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

async function getOrderBook(pair: string): Promise<OrderBook & { lastTradePrice: number | null }> {
    const commonQuotes = ['USDT', 'USDC', 'DAI', 'BTC', 'ETH', 'WETH'];
    let baseCurrency = '', quoteCurrency = '';
    
    // Handle pair parsing robustly
    const parts = pair.split('/');
    if (parts.length === 2) {
        baseCurrency = parts[0];
        quoteCurrency = parts[1];
    } else {
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
    }

    const tokenIn = TOKENS[baseCurrency as keyof typeof TOKENS];
    const tokenOut = TOKENS[quoteCurrency as keyof typeof TOKENS];
    
    let midPrice: number | null = null;
    if (tokenIn && tokenOut) {
        midPrice = await getAMMPrice(tokenIn, tokenOut);
    } else {
        console.warn(`Tokens not found in config for pair ${pair}. Cannot fetch AMM price.`);
    }

    const dbSymbol = `${baseCurrency}/${quoteCurrency}`;
    let realOrders: Order[] = [];
    try {
        const realOrdersResult = await getOrdersByPair(dbSymbol);
        realOrders = realOrdersResult.map((result) => result.order);
    } catch (dbError) {
        console.error(`Database error fetching orders for ${dbSymbol}:`, dbError);
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

export async function getMarketState(pair: string): Promise<MarketState | null> {
    const now = Date.now();
    if (cache[pair] && (now - cache[pair].lastFetch < CACHE_DURATION)) {
        const cachedData = cache[pair].data;
        cachedData.source = 'cached';
        return cachedData;
    }

    try {
        const [baseAsset, quoteAsset] = pair.split('/');
        const dbSymbol = `${baseAsset}/${quoteAsset}`;

        // Fetch data concurrently, but safely
        const [bookResult, marketDataResult] = await Promise.allSettled([
            getOrderBook(pair),
            getMarketBySymbol(dbSymbol)
        ]);

        const book = bookResult.status === 'fulfilled' ? bookResult.value : { bids: [], asks: [], lastTradePrice: null };
        const marketData = marketDataResult.status === 'fulfilled' ? marketDataResult.value : null;
        
        if (bookResult.status === 'rejected') {
            console.error(`Failed to get order book for ${pair}:`, bookResult.reason);
        }
        if (marketDataResult.status === 'rejected') {
            console.error(`Failed to get market data for ${dbSymbol}:`, marketDataResult.reason);
        }
        
        const markPrice = getMarkPrice(book);

        const marketState: MarketState = {
            id: pair,
            symbol: pair,
            baseAsset,
            quoteAsset,
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
        console.error(`Critical failure in getMarketState for ${pair}:`, error);
        return null; // Last resort, should not happen with the inner catches.
    }
}
