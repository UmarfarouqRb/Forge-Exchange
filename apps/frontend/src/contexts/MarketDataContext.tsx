
import { createContext } from 'react';
import type { Market, TradingPair } from '@/types';

export interface MarketDataContextValue {
  pairs: Map<string, TradingPair>;
  markets: Map<string, Market>;
  marketSymbols: string[];
}

export const MarketDataContext = createContext<MarketDataContextValue | undefined>(
  undefined
);
