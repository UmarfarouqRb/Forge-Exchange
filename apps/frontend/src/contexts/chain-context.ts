import { createContext, useContext } from 'react';
import { base, baseSepolia, arbitrum, bsc } from 'viem/chains';

export const SUPPORTED_CHAINS = [base, baseSepolia, arbitrum, bsc] as const;

export type SupportedChain = typeof SUPPORTED_CHAINS[number];
export type SupportedChainId = SupportedChain['id'];

export interface ChainContextType {
  chains: readonly SupportedChain[];
  selectedChain: SupportedChain;
  switchChain: (chainId: SupportedChainId) => void;
}

export const ChainContext = createContext<ChainContextType | undefined>(undefined);

export const useChainContext = () => {
  const context = useContext(ChainContext);
  if (context === undefined) {
    throw new Error("useChainContext must be used within a ChainProvider");
  }
  return context;
};
