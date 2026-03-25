import { db, tradingPairs, markets, eq } from '@forge/db';

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
        const allTradingPairs = await db.select().from(tradingPairs);

        const pairsWithMarketData = await Promise.all(allTradingPairs.map(async (pair) => {
            const marketData = await db.select().from(markets).where(eq(markets.tradingPairId, pair.id)).limit(1);
            const market = marketData[0];
            return {
                ...pair,
                lastPrice: market?.lastPrice ?? '0',
                priceChangePercent: 0,
                high24h: market?.high24h ?? '0', 
                low24h: market?.low24h ?? '0', 
                volume24h: market?.volume24h ?? '0', 
            };
        }));

        // For now, "trending" is just all pairs. 
        // In the future, we can add logic to determine trending pairs.

        cache.data = pairsWithMarketData as any;
        cache.lastFetch = now;

        return pairsWithMarketData;
    } catch (error) {
        console.error('Error fetching trending pairs:', error);
        throw new Error('Could not fetch trending pairs');
    }
}
