import { db, tradingPairs, markets, tokens, eq } from '@forge/db';

interface TokenData {
    [symbol: string]: {
        address: string;
        decimals: number;
    };
}

interface Cache {
    pairsData: any | null;
    tokensData: Record<number, TokenData>;
    lastPairsFetch: number;
    lastTokensFetch: Record<number, number>;
}

const cache: Cache = {
    pairsData: null,
    tokensData: {},
    lastPairsFetch: 0,
    lastTokensFetch: {},
};

const CACHE_DURATION = 5000;

export async function getAllPairs() {
    const now = Date.now();
    if (cache.pairsData && (now - cache.lastPairsFetch < CACHE_DURATION)) {
        return cache.pairsData;
    }

    try {
        console.log('Fetching all pairs data');
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

        cache.pairsData = pairsWithMarketData as any;
        cache.lastPairsFetch = now;
        return pairsWithMarketData;
    } catch (error) {
        console.error('Error fetching all pairs:', error);
        throw new Error('Could not fetch all pairs');
    }
}

export async function getTokens(chainId: number): Promise<TokenData> {
    const now = Date.now();
    if (cache.tokensData[chainId] && (now - (cache.lastTokensFetch[chainId] ?? 0) < CACHE_DURATION)) {
        return cache.tokensData[chainId];
    }

    try {
        console.log(`Fetching tokens for chainId: ${chainId}`);
        const allTokens = await db.select().from(tokens).where(eq(tokens.chainId, chainId));

        const tokensMap = allTokens.reduce<TokenData>((acc, token) => {
            acc[token.symbol] = { address: token.address, decimals: token.decimals };
            return acc;
        }, {});

        cache.tokensData[chainId] = tokensMap;
        cache.lastTokensFetch[chainId] = now;
        return tokensMap;
    } catch (error) {
        console.error(`Error fetching tokens for chainId ${chainId}:`, error);
        throw new Error(`Could not fetch tokens for chainId ${chainId}`);
    }
}
