import { ReactNode } from 'react';
import { MarketDataContext } from './MarketDataContext';
import { useMarketData } from '@/hooks/use-market-data';

export function MarketDataProvider({ children }: { children: ReactNode }) {
  const marketData = useMarketData();
  return (
    <MarketDataContext.Provider value={marketData}>
      {children}
    </MarketDataContext.Provider>
  );
}
