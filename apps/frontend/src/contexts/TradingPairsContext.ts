
import { createContext } from 'react';
import type { TradingPair } from '@/types';

interface TradingPairsContextType {
  pairs: Map<string, TradingPair>;
  pairsList: TradingPair[];
}

export const TradingPairsContext = createContext<TradingPairsContextType | undefined>(
  undefined
);
