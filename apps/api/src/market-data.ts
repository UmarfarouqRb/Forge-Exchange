import { Token } from './token';

const COINGECKO_ID_MAP: Record<string, string> = {
    'ETH': 'ethereum',
    'USDC': 'usd-coin',
    'USDT': 'tether',
    'DAI': 'dai',
    'BTC': 'wrapped-bitcoin',
    'AERO': 'aerodrome-finance',
    'TRUMP': 'maga',
    'SOL': 'solana',
    'EUROC': 'euro-coin',
    'ZORA': 'zora',
    'XRP': 'ripple',
    'VIRTUAL': 'virtual',
    'AAVE': 'aave',
    'HYPE': 'hype-token',
};

export type MarketData24h = {
    priceChangePercent: number;
    high24h: number;
    low24h: number;
    volume24h: number;
};

const marketDataCache = new Map<string, { timestamp: number; data: MarketData24h }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function get24hMarketData(baseToken: Token, quoteToken: Token): Promise<MarketData24h | null> {
    const cacheKey = `${baseToken.symbol}-${quoteToken.symbol}`;
    const cached = marketDataCache.get(cacheKey);

    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
        return cached.data;
    }

    const baseId = COINGECKO_ID_MAP[baseToken.symbol];
    if (!baseId) {
        console.warn(`No CoinGecko ID for symbol ${baseToken.symbol}`);
        return null;
    }

    const vsCurrency = 'usd';

    try {
        const url = `https://api.coingecko.com/api/v3/coins/${baseId}/market_chart?vs_currency=${vsCurrency}&days=1`;
        const response = await fetch(url);
        if (!response.ok) {
            console.error(`CoinGecko API request failed: ${response.status} ${response.statusText}`);
            return null;
        }

        const chartData = await response.json();

        const prices = chartData.prices as [number, number][];
        const volumes = chartData.total_volumes as [number, number][];

        if (!prices || prices.length < 2) {
            console.warn(`Not enough price data for ${baseToken.symbol}`);
            return null;
        }
        
        const high24h = Math.max(...prices.map((p) => p[1]));
        const low24h = Math.min(...prices.map((p) => p[1]));
        
        const volume24h = volumes.reduce((acc, curr) => acc + curr[1], 0);

        const openPrice = prices[0][1];
        const closePrice = prices[prices.length - 1][1];
        const priceChangePercent = ((closePrice - openPrice) / openPrice) * 100;

        const result: MarketData24h = {
            priceChangePercent,
            high24h,
            low24h,
            volume24h,
        };

        marketDataCache.set(cacheKey, { timestamp: Date.now(), data: result });

        return result;
    } catch (error) {
        console.error(`Error fetching 24h market data for ${baseToken.symbol}:`, error);
        return null;
    }
}
