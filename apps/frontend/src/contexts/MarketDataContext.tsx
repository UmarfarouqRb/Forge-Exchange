import { createContext } from 'react';
import type { TradingPair } from '@/types';

interface MarketDataContextValue {
  tradingPairs: Map<string, TradingPair>;
  isLoading: boolean;
  isError: boolean;
}

export const MarketDataContext = createContext<MarketDataContextValue | undefined>(undefined);
