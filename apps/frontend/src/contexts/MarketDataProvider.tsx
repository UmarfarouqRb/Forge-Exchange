
import { ReactNode, useEffect, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MarketDataContext } from './MarketDataContext';
import { getAllPairs, getMarket } from '@/lib/api';
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
        pairsMap.set(pair.id, pair);
      }
    }
    return pairsMap;
  }, [pairsList]);

  useEffect(() => {
    if (!pairsList) return;

    const subscribedPairs = new Set<string>();

    const updateMarketState = (marketData: Market) => {
      setMarkets(prevMarkets => {
        const newMarkets = new Map(prevMarkets);
        const existingMarket = newMarkets.get(marketData.id) || {};
        newMarkets.set(marketData.id, { ...existingMarket, ...marketData });
        return newMarkets;
      });
    };

    pairsList.forEach(pair => {
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
