import { useContext } from 'react';
import { ChainContext } from '@/contexts/chain-context';

export const useChain = () => {
  const context = useContext(ChainContext);
  if (context === undefined) {
    throw new Error('useChain must be used within a ChainProvider');
  }
  return context;
};
