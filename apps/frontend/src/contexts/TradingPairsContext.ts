
import { createContext, useContext } from 'react';
import type { TradingPair } from '@/types';

interface TradingPairsContextType {
  pairs: Map<string, TradingPair>;
  pairsList: TradingPair[];
  selectedTradingPair: TradingPair | null;
  setSelectedTradingPair: (pair: TradingPair | null) => void;
}

export const TradingPairsContext = createContext<TradingPairsContextType | undefined>(
  undefined
);

export const useTradingPairs = () => {
  const context = useContext(TradingPairsContext);
  if (context === undefined) {
    throw new Error('useTradingPairs must be used within a TradingPairsProvider');
  }
  return context;
};
