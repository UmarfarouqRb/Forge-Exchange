
import { db, tradingPairs, tokens, eq, alias } from '@forge/db';

// This function fetches all trading pairs from the database along with their base and quote token details.
export async function getAllPairs() {
    const baseToken = alias(tokens, 'base_token');
    const quoteToken = alias(tokens, 'quote_token');

    const allPairs = await db.select({
        id: tradingPairs.id,
        symbol: tradingPairs.symbol,
        isActive: tradingPairs.isActive,
        baseToken: {
            id: baseToken.id,
            chainId: baseToken.chainId,
            address: baseToken.address,
            symbol: baseToken.symbol,
            name: baseToken.name,
            decimals: baseToken.decimals,
            createdAt: baseToken.createdAt,
        },
        quoteToken: {
            id: quoteToken.id,
            chainId: quoteToken.chainId,
            address: quoteToken.address,
            symbol: quoteToken.symbol,
            name: quoteToken.name,
            decimals: quoteToken.decimals,
            createdAt: quoteToken.createdAt,
        }
    })
    .from(tradingPairs)
    .innerJoin(baseToken, eq(tradingPairs.baseTokenId, baseToken.id))
    .innerJoin(quoteToken, eq(tradingPairs.quoteTokenId, quoteToken.id));

    return allPairs.map(pair => ({
        id: pair.id,
        symbol: pair.symbol,
        baseToken: pair.baseToken,
        quoteToken: pair.quoteToken,
        isActive: pair.isActive,
    }));
}

export async function getPairBySymbol(symbol: string) {
    const baseToken = alias(tokens, 'base_token');
    const quoteToken = alias(tokens, 'quote_token');

    const result = await db.select({
        id: tradingPairs.id,
        symbol: tradingPairs.symbol,
        isActive: tradingPairs.isActive,
        baseToken: {
            id: baseToken.id,
            chainId: baseToken.chainId,
            address: baseToken.address,
            symbol: baseToken.symbol,
            name: baseToken.name,
            decimals: baseToken.decimals,
            createdAt: baseToken.createdAt,
        },
        quoteToken: {
            id: quoteToken.id,
            chainId: quoteToken.chainId,
            address: quoteToken.address,
            symbol: quoteToken.symbol,
            name: quoteToken.name,
            decimals: quoteToken.decimals,
            createdAt: quoteToken.createdAt,
        }
    })
    .from(tradingPairs)
    .where(eq(tradingPairs.symbol, symbol))
    .innerJoin(baseToken, eq(tradingPairs.baseTokenId, baseToken.id))
    .innerJoin(quoteToken, eq(tradingPairs.quoteTokenId, quoteToken.id))
    .limit(1);

    if (result.length === 0) {
        return null;
    }

    const pair = result[0];

    return {
        id: pair.id,
        symbol: pair.symbol,
        baseToken: pair.baseToken,
        quoteToken: pair.quoteToken,
        isActive: pair.isActive,
    };
}

export async function getPairById(id: string) {
    const baseToken = alias(tokens, 'base_token');
    const quoteToken = alias(tokens, 'quote_token');

    const result = await db.select({
        id: tradingPairs.id,
        symbol: tradingPairs.symbol,
        isActive: tradingPairs.isActive,
        baseToken: {
            id: baseToken.id,
            chainId: baseToken.chainId,
            address: baseToken.address,
            symbol: baseToken.symbol,
            name: baseToken.name,
            decimals: baseToken.decimals,
            createdAt: baseToken.createdAt,
        },
        quoteToken: {
            id: quoteToken.id,
            chainId: quoteToken.chainId,
            address: quoteToken.address,
            symbol: quoteToken.symbol,
            name: quoteToken.name,
            decimals: quoteToken.decimals,
            createdAt: quoteToken.createdAt,
        }
    })
    .from(tradingPairs)
    .where(eq(tradingPairs.id, id))
    .innerJoin(baseToken, eq(tradingPairs.baseTokenId, baseToken.id))
    .innerJoin(quoteToken, eq(tradingPairs.quoteTokenId, quoteToken.id))
    .limit(1);

    if (result.length === 0) {
        return null;
    }

    const pair = result[0];

    return {
        id: pair.id,
        symbol: pair.symbol,
        baseToken: pair.baseToken,
        quoteToken: pair.quoteToken,
        isActive: pair.isActive,
    };
}

// This function remains unchanged, as the chainId normalization is handled at the route level.
export async function getTokens(chainId: number) {
    return db.select().from(tokens).where(eq(tokens.chainId, chainId));
}
