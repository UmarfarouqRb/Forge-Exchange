import { getOrdersByPairId, Order, getMarketById } from '@forge/db';
import { isAddress } from 'viem';
import type { Token } from './token';
import { TOKENS } from './token';
import { getTradingPairs } from './trading-pairs';
import { get24hMarketData } from './market-data';

// --- TYPE DEFINITIONS ---

export type OrderBook = {
    bids: [string, string][];
    asks: [string, string][];
};

export type MarketState = {
    id: string;
    symbol: string;
    price: number | null;
    lastPrice: string | null;
    priceChangePercent: number;
    high24h: string | null;
    low24h: string | null;
    volume24h: string | null;
    currentPrice: string | null;
    bids: [string, string][];
    asks: [string, string][];
    source: 'live' | 'cached' | 'unavailable' | 'mock';
    isActive: boolean;
};

// --- OFF-CHAIN PRICE FETCHING ---

const COINGECKO_ID_MAP: Record<string, string> = {
    'ETH': 'ethereum',
    'USDC': 'usd-coin',
    'DAI': 'dai',
    'BTC': 'wrapped-bitcoin',
};

async function getOffChainPrice(baseToken: Token): Promise<number | null> {
    const baseId = COINGECKO_ID_MAP[baseToken.symbol];
    if (!baseId) {
        console.warn(`No CoinGecko ID for symbol ${baseToken.symbol}`);
        return null;
    }

    try {
        const url = `https://api.coingecko.com/api/v3/simple/price?ids=${baseId}&vs_currencies=usd`;
        const response = await fetch(url);
        if (!response.ok) {
            console.error(`CoinGecko API request failed: ${response.status} ${response.statusText}`);
            return null;
        }
        const data = await response.json();
        const price = data[baseId]?.usd;
        return price ? Number(price) : null;

    } catch (error) {
        console.error(`Error fetching off-chain price for ${baseToken.symbol}:`, error);
        return null;
    }
}


// --- SYNTHETIC ORDER BOOK ---

const syntheticPriceOffsets: { [pairId: string]: number } = {};
const SYNTHETIC_UPDATE_INTERVAL = 3000;
let lastSyntheticUpdate: { [pairId: string]: number } = {};
let syntheticDepthCache: { [pairId: string]: OrderBook } = {};

function generateSyntheticDepth(midPrice: number, pairId: string): OrderBook {
    const now = Date.now();
    if (!lastSyntheticUpdate[pairId] || (now - lastSyntheticUpdate[pairId] > SYNTHETIC_UPDATE_INTERVAL)) {
        syntheticPriceOffsets[pairId] = (Math.random() * 0.002 - 0.001);
        lastSyntheticUpdate[pairId] = now;
    }
    const currentMidPriceOffset = syntheticPriceOffsets[pairId] || 0;
    const fluctuatingMidPrice = midPrice * (1 + currentMidPriceOffset);

    const bids: [string, string][] = [];
    const asks: [string, string][] = [];
    for (let i = 1; i <= 10; i++) {
        const priceBid = fluctuatingMidPrice * (1 - i * 0.002 - (Math.random() * 0.0001));
        const quantityBid = (Math.random() * 15 + 5) * (1 + (Math.random() * 0.05 - 0.025));
        bids.push([priceBid.toFixed(4), quantityBid.toFixed(2)]);

        const priceAsk = fluctuatingMidPrice * (1 + i * 0.002 + (Math.random() * 0.0001));
        const quantityAsk = (Math.random() * 15 + 5) * (1 + (Math.random() * 0.05 - 0.025));
        asks.push([priceAsk.toFixed(4), quantityAsk.toFixed(2)]);
    }
    return { bids, asks };
}

async function getOrderBook(baseToken: Token, quoteToken: Token, pairId: string): Promise<OrderBook & { lastTradePrice: number | null }> {
    const midPrice: number | null = await getOffChainPrice(baseToken);

    let realOrders: Order[] = [];
    try {
        realOrders = await getOrdersByPairId(pairId);
    } catch (dbError) {
        console.error(`Database error fetching orders for ${pairId}:`, dbError);
    }

    const aggregateAndSort = (orders: [string, string][], reverse = false): [string, string][] => {
        const book = new Map<string, number>();
        orders.forEach(([price, size]) => {
            book.set(price, (book.get(price) || 0) + parseFloat(size));
        });
        const sorted = Array.from(book.entries()).sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]));
        if (reverse) sorted.reverse();
        return sorted.map(([price, size]) => [price, String(size)]);
    };

    let bids: [string, string][];
    let asks: [string, string][];

    if (realOrders.length > 0) {
        const realBids = realOrders.filter(o => o.side === 'buy').map(o => [o.price, o.quantity] as [string, string]);
        const realAsks = realOrders.filter(o => o.side === 'sell').map(o => [o.price, o.quantity] as [string, string]);
        bids = aggregateAndSort(realBids, true);
        asks = aggregateAndSort(realAsks);
    } else {
        if (midPrice) {
            const now = Date.now();
            if (!lastSyntheticUpdate[pairId] || (now - lastSyntheticUpdate[pairId] > SYNTHETIC_UPDATE_INTERVAL)) {
                const newSyntheticDepth = generateSyntheticDepth(midPrice, pairId);
                syntheticDepthCache[pairId] = newSyntheticDepth;
                lastSyntheticUpdate[pairId] = now;
            }
            bids = syntheticDepthCache[pairId]?.bids || [];
            asks = syntheticDepthCache[pairId]?.asks || [];
        } else {
            bids = [];
            asks = [];
        }
    }

    return {
        bids,
        asks,
        lastTradePrice: midPrice
    };
}

export function getMarkPrice(book: OrderBook & { lastTradePrice: number | null }): number | null {
    const bestBid = book.bids[0]?.[0];
    const bestAsk = book.asks[0]?.[0];
    if (bestBid && bestAsk) return (parseFloat(bestBid) + parseFloat(bestAsk)) / 2;
    return book.lastTradePrice;
}

export async function getMarket(pairId: string): Promise<MarketState | null> {
    try {
        const pairInfo = getTradingPairs().find(p => p.id === pairId);
        if (!pairInfo) {
            return null;
        }

        const baseToken = TOKENS[pairInfo.base.symbol];
        const quoteToken = TOKENS[pairInfo.quote.symbol];

        const [bookResult, marketDataResult, marketData24hResult] = await Promise.allSettled([
            getOrderBook(baseToken, quoteToken, pairId),
            getMarketById(pairId),
            get24hMarketData(baseToken, quoteToken)
        ]);

        const book = bookResult.status === 'fulfilled' ? bookResult.value : { bids: [], asks: [], lastTradePrice: null };
        const marketData = marketDataResult.status === 'fulfilled' ? marketDataResult.value : null;
        const marketData24h = marketData24hResult.status === 'fulfilled' ? marketData24hResult.value : null;

        if (bookResult.status === 'rejected') {
            console.error(`Failed to get order book for ${pairInfo.id}:`, bookResult.reason);
        }
        if (marketDataResult.status === 'rejected') {
            console.error(`Failed to get market data for ${pairInfo.id}:`, marketDataResult.reason);
        }
        if (marketData24hResult.status === 'rejected') {
            console.error(`Failed to get 24h market data for ${pairInfo.id}:`, marketData24hResult.reason);
        }

        const markPrice = getMarkPrice(book);
        const lastPrice = marketData?.lastPrice ?? book.lastTradePrice?.toString() ?? null;

        const marketState: MarketState = {
            id: pairId,
            symbol: pairInfo.symbol,
            price: markPrice,
            lastPrice: lastPrice,
            priceChangePercent: marketData24h?.priceChangePercent ?? 0,
            high24h: marketData24h?.high24h.toString() ?? null,
            low24h: marketData24h?.low24h.toString() ?? null,
            volume24h: marketData24h?.volume24h.toString() ?? null,
            currentPrice: markPrice?.toString() ?? null,
            bids: book.bids,
            asks: book.asks,
            source: 'cached',
            isActive: true,
        };

        return marketState;
    } catch (error) {
        console.error(`Critical failure in getMarket for ${pairId}:`, error);
        return null;
    }
}

export async function getMarketBySymbol(symbol: string): Promise<MarketState | null> {
    const pair = getTradingPairs().find(p => p.symbol === symbol);
    if (!pair) {
        return null;
    }
    return getMarket(pair.id);
}
