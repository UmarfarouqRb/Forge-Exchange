import { TRADING_PAIRS } from "./trading-pairs";
import { getMarket, MarketState } from "./market";

export async function getMarkets(): Promise<Partial<MarketState>[]> {
  const marketPromises = TRADING_PAIRS.map(pair => getMarket(pair.id));
  const results = await Promise.allSettled(marketPromises);

  const markets = results.map((result, index): Partial<MarketState> => {
    const pair = TRADING_PAIRS[index];
    if (result.status === 'fulfilled' && result.value) {
      return result.value;
    } else {
      if (result.status === 'rejected') {
        console.error(`Failed to fetch market data for ${pair.id}:`, result.reason);
      }
      // Return a default state for the failed market
      return {
        id: pair.id,
        symbol: `${pair.base}/${pair.quote}`,
        baseAsset: pair.base,
        quoteAsset: pair.quote,
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
