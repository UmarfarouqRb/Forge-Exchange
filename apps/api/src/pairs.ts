
import { db, tradingPairs, tokens, eq } from '@forge/db';
import { getMarketState } from './market';

// This function fetches all trading pairs from the database and enriches them with live market data.
// It is designed to be resilient, ensuring that a failure to fetch data for one pair does not prevent others from being returned.
export async function getAllPairs() {
    const allPairs = await db.select({
        id: tradingPairs.id,
        symbol: tradingPairs.symbol,
        baseTokenId: tradingPairs.baseTokenId,
        quoteTokenId: tradingPairs.quoteTokenId,
        isActive: tradingPairs.isActive,
    }).from(tradingPairs);

    const enrichedPairs = await Promise.all(allPairs.map(async (pair) => {
        // The getMarketState function is now resilient and will return partial data even if some sources fail.
        const marketState = await getMarketState(pair.symbol);

        // We construct the pair object with the available data, defaulting to null if market data is unavailable.
        return {
            id: pair.id,
            symbol: pair.symbol,
            baseToken: pair.baseTokenId,
            quoteToken: pair.quoteTokenId,
            status: pair.isActive ? 'active' : 'inactive',
            price: marketState?.price ?? null,
            priceChangePercent: marketState?.priceChangePercent ?? 0,
            volume24h: marketState?.volume24h ?? null,
            lastPrice: marketState?.lastPrice ?? null,
            source: marketState?.source ?? 'unavailable',
        };
    }));

    // The function will now always return a list of all pairs, with market data filled in where available.
    return enrichedPairs;
}

// This function remains unchanged, as the chainId normalization is handled at the route level.
export async function getTokens(chainId: number) {
    return db.select().from(tokens).where(eq(tokens.chainId, chainId));
}
