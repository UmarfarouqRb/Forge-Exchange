import { getAllTradingPairs } from '@forge/db';
import { getMarketState } from './market';

// Temporary in-memory cache to store trending pairs data
const cache = {
    data: null,
    lastFetch: 0,
};

// Cache duration in milliseconds (e.g., 5 seconds)
const CACHE_DURATION = 5000;

export async function getTrendingPairs() {
    const now = Date.now();

    // Check if cache is still valid
    if (cache.data && (now - cache.lastFetch < CACHE_DURATION)) {
        return cache.data;
    }

    try {
        console.log('Fetching fresh trending pairs data');
        const tradingPairs = await getAllTradingPairs();

        const pairsWithMarketData = await Promise.all(tradingPairs.map(async (pair) => {
            const marketState = await getMarketState(pair.symbol);
            return {
                ...pair,
                lastPrice: marketState?.price?.toString() || '0',
                priceChangePercent: marketState?.price ? ((marketState.price - parseFloat(pair.openPrice)) / parseFloat(pair.openPrice)) * 100 : 0,
                high24h: marketState?.price?.toString() || '0', 
                low24h: marketState?.price?.toString() || '0', 
                volume24h: '0', 
            };
        }));

        // Update cache
        cache.data = pairsWithMarketData as any;
        cache.lastFetch = now;

        return pairsWithMarketData;
    } catch (error) {
        console.error('Error fetching trending pairs:', error);
        throw new Error('Could not fetch trending pairs');
    }
}
