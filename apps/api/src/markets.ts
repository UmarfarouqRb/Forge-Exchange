
import { getTradingPairs } from "./trading-pairs";
import { getMarket, MarketState } from "./market";
import { mockMarketStats } from "./market-stats";

export async function getMarkets(): Promise<Partial<MarketState>[]> {
  const tradingPairs = getTradingPairs();
  const marketPromises = tradingPairs.map(pair => getMarket(pair.id));
  const results = await Promise.allSettled(marketPromises);

  const markets = results.map((result, index): Partial<MarketState> => {
    const pair = tradingPairs[index];
    if (result.status === 'fulfilled' && result.value) {
      return result.value;
    } else {
      if (result.status === 'rejected') {
        console.error(`Failed to fetch market data for ${pair.id}:`, result.reason);
      }
      // Return a default state for the failed market
      const mockStat = mockMarketStats.find(m => m.id === pair.id);
      if (mockStat) {
        return {
            id: pair.id,
            symbol: pair.symbol,
            price: parseFloat(mockStat.currentPrice),
            lastPrice: mockStat.lastPrice,
            priceChangePercent: mockStat.priceChangePercent,
            high24h: mockStat.high24h,
            low24h: mockStat.low24h,
            volume24h: mockStat.volume24h,
            currentPrice: mockStat.currentPrice,
            bids: [],
            asks: [],
            source: 'mock',
            isActive: true,
        };
      }
      return {
        id: pair.id,
        symbol: `${pair.base.symbol}${pair.quote.symbol}`,
        price: null,
        lastPrice: null,
        priceChangePercent: 0,
        high24h: null,
        low24h: null,
        volume24h: null,
        currentPrice: null,
        bids: [],
        asks: [],
        source: 'unavailable',
        isActive: false,
      };
    }
  });

  return markets;
}
