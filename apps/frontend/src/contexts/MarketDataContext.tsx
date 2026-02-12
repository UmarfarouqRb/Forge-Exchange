
import { createContext } from 'react';
import type { Market } from '@/types';

interface MarketDataContextType {
  markets: Map<string, Market>;
  marketSymbols: string[];
}

export const MarketDataContext = createContext<MarketDataContextType | undefined>(
  undefined
);
