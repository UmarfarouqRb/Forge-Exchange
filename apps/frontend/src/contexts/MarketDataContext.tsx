import { createContext } from 'react';
import type { Market } from '@/types';

interface MarketDataContextValue {
  tradingPairs: Map<string, Market>;
  isLoading: boolean;
  isError: boolean;
}

export const MarketDataContext = createContext<MarketDataContextValue | undefined>(undefined);
