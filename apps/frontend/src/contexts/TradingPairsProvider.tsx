
import { ReactNode, useMemo, useState } from 'react';
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

  const [selectedTradingPair, setSelectedTradingPair] = useState<TradingPair | null>(null);

  const pairs = useMemo(() => {
    const pairsMap = new Map<string, TradingPair>();
    if (pairsList) {
      for (const pair of pairsList) {
        pairsMap.set(pair.symbol, pair);
      }
      if (!selectedTradingPair && pairsList.length > 0) {
        setSelectedTradingPair(pairsList[0]);
      }
    }
    return pairsMap;
  }, [pairsList, selectedTradingPair]);

  const contextValue = {
    pairs,
    pairsList: pairsList || [],
    selectedTradingPair,
    setSelectedTradingPair,
  };

  return (
    <TradingPairsContext.Provider value={contextValue}>
      {children}
    </TradingPairsContext.Provider>
  );
}
