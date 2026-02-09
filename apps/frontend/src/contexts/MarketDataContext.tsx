import { createContext } from 'react';
import type { Market, TradingPair } from '@/types/market-data';

interface MarketDataContextValue {
  pairs: TradingPair[];
  markets: Map<string, Market>;
  isLoading: boolean;
  isError: boolean;
}

export const MarketDataContext = createContext<MarketDataContextValue | undefined>(undefined);
