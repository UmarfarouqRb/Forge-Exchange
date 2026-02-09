import { createContext } from 'react';
import type { Market, TradingPair } from '@/types/market-data';

interface MarketDataContextValue {
  pairs: Map<string, TradingPair>;
  markets: Map<string, Market>;
}

export const MarketDataContext = createContext<MarketDataContextValue>({ pairs: new Map(), markets: new Map() });
