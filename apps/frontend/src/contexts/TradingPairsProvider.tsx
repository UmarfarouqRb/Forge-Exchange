
import { ReactNode, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAllPairs } from '@/lib/api';
import type { TradingPair } from '@/types';
import { TradingPairsContext } from './TradingPairsContext';

export function TradingPairsProvider({ children }: { children: ReactNode }) {
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

  const contextValue = {
    pairs,
    pairsList: pairsList || [],
  };

  return (
    <TradingPairsContext.Provider value={contextValue}>
      {children}
    </TradingPairsContext.Provider>
  );
}
