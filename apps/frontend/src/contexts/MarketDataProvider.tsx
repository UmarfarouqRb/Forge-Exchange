
import { ReactNode, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MarketDataContext } from './MarketDataContext';
import { getAllPairs, getMarket } from '@/lib/api';
import { subscribe, unsubscribe } from '@/lib/ws/market';
import type { Market, TradingPair } from '@/types';

export function MarketDataProvider({ children }: { children: ReactNode }) {
  const [markets, setMarkets] = useState(new Map<string, Market>());

  const { data: pairs, isLoading, isError } = useQuery<TradingPair[]>({
    queryKey: ['trading-pairs'],
    queryFn: getAllPairs,
    initialData: [],
  });

  useEffect(() => {
    if (!pairs) return;

    const subscribedPairs = new Set<string>();

    const updateMarketState = (marketData: Market) => {
      setMarkets(prevMarkets => {
        const newMarkets = new Map(prevMarkets);
        const existingMarket = newMarkets.get(marketData.id) || {};
        newMarkets.set(marketData.id, { ...existingMarket, ...marketData });
        return newMarkets;
      });
    };

    pairs.forEach(pair => {
      if (!pair.id) return;
      getMarket(pair.id).then(updateMarketState);
      if (!subscribedPairs.has(pair.id)) {
        subscribe(pair.id, updateMarketState);
        subscribedPairs.add(pair.id);
      }
    });

    return () => {
      subscribedPairs.forEach(pairId => {
        unsubscribe(pairId);
      });
    };
  }, [pairs]);

  const contextValue = {
    pairs: pairs || [],
    markets,
    isLoading,
    isError,
  };

  return (
    <MarketDataContext.Provider value={contextValue}>
      {children}
    </MarketDataContext.Provider>
  );
}
