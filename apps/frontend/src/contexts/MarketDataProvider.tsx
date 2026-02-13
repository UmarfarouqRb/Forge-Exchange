
import { ReactNode, useEffect, useState, useMemo, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MarketDataContext } from './MarketDataContext';
import { getMarketBySymbol } from '@/lib/api';
import { subscribe, unsubscribe } from '@/lib/ws/market';
import type { Market } from '@/types';
import { TradingPairsContext } from './TradingPairsContext';

export function MarketDataProvider({ children }: { children: ReactNode }) {
  const [markets, setMarkets] = useState(new Map<string, Market>());
  const tradingPairsContext = useContext(TradingPairsContext);

  if (!tradingPairsContext) {
    throw new Error('MarketDataProvider must be used within a TradingPairsProvider');
  }

  const { pairsList } = tradingPairsContext;

  const marketSymbols = useMemo(() => {
    return pairsList ? pairsList.map(pair => pair.symbol) : [];
  }, [pairsList]);

  useEffect(() => {
    if (!pairsList) return;

    const subscribedSymbols = new Set<string>();

    const updateMarketState = (marketData: Market) => {
      setMarkets(prevMarkets => {
        const newMarkets = new Map(prevMarkets);
        const existingMarket = newMarkets.get(marketData.symbol) || {};
        newMarkets.set(marketData.symbol, { ...existingMarket, ...marketData });
        return newMarkets;
      });
    };

    pairsList.forEach(pair => {
      if (!pair.symbol) return;
      getMarketBySymbol(pair.symbol)
        .then(updateMarketState)
        .catch(error => {
          console.error(`Failed to fetch market data for ${pair.symbol}:`, error);
          // Create a placeholder market if the API call fails
          const placeholderMarket: Market = {
            id: pair.id,
            symbol: pair.symbol,
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
          updateMarketState(placeholderMarket);
        });
      if (!subscribedSymbols.has(pair.symbol)) {
        subscribe(`prices:${pair.symbol}`, (marketUpdate: Partial<Market>) => {
          updateMarketState({ ...marketUpdate, symbol: pair.symbol } as Market);
        });
        subscribedSymbols.add(pair.symbol);
      }
    });

    return () => {
      subscribedSymbols.forEach(symbol => {
        unsubscribe(`prices:${symbol}`);
      });
    };
  }, [pairsList]);

  const contextValue = {
    markets,
    marketSymbols,
  };

  return (
    <MarketDataContext.Provider value={contextValue}>
      {children}
    </MarketDataContext.Provider>
  );
}
