import { getTradingPairs, TradingPair } from '@forge/markets';

const pairs = getTradingPairs();
const tokens = Array.from(new Set(pairs.flatMap(p => [p.base, p.quote])));

export function getTokenBySymbol(symbol: string) {
    const normalizedSymbol = symbol.toUpperCase();
    const token = tokens.find(t => t.symbol.toUpperCase() === normalizedSymbol);
    if (!token) {
        console.warn(`Token with symbol '${symbol}' not found in internal registry.`);
        return null;
    }
    return token;
}

export function getPairBySymbol(symbol: string): TradingPair | undefined {
    return pairs.find(p => p.symbol.toUpperCase() === symbol.toUpperCase());
}
