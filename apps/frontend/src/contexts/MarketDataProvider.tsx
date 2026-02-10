
import { ReactNode, useEffect, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MarketDataContext } from './MarketDataContext';
import { getAllPairs, getMarketBySymbol } from '@/lib/api';
import { subscribe, unsubscribe } from '@/lib/ws/market';
import type { Market, TradingPair } from '@/types';

export function MarketDataProvider({ children }: { children: ReactNode }) {
  const [markets, setMarkets] = useState(new Map<string, Market>());

  const { data: pairsList } = useQuery<TradingPair[]>({
    queryKey: ['trading-pairs'],
    queryFn: getAllPairs,
    initialData: [],
  });

  const pairs = useMemo(() => {
    const pairsMap = new Map<string, TradingPair>();
    if (pairsList) {
      for (const pair of pairsList) {
        pairsMap.set(pair.symbol, pair);
      }
    }
    return pairsMap;
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
        });
      if (!subscribedSymbols.has(pair.symbol)) {
        subscribe(pair.symbol, updateMarketState);
        subscribedSymbols.add(pair.symbol);
      }
    });

    return () => {
      subscribedSymbols.forEach(symbol => {
        unsubscribe(symbol);
      });
    };
  }, [pairsList]);

  const contextValue = {
    pairs,
    markets,
  };

  return (
    <MarketDataContext.Provider value={contextValue}>
      {children}
    </MarketDataContext.Provider>
  );
}
