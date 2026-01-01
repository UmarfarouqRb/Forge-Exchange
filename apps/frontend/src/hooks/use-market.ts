import { useContext } from 'react';
import { MarketDataContext } from '@/contexts/MarketDataContext';

export function useMarket() {
  const context = useContext(MarketDataContext);
  if (context === undefined) {
    throw new Error('useMarket must be used within a MarketDataProvider');
  }
  return context;
}
