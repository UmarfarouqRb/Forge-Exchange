
import { createContext, useContext, useEffect, useState } from 'react';
import { getVaultTokens } from '@/lib/api';
import { useChainContext } from '@/contexts/chain-context';

interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI: string;
  chainId: number;
  deposit_enabled: boolean;
  withdraw_enabled: boolean;
}

interface VaultContextType {
  tokens: Token[];
  isLoading: boolean;
}

const VaultContext = createContext<VaultContextType | undefined>(undefined);

export const VaultProvider = ({ children }: { children: React.ReactNode }) => {
  const { selectedChain } = useChainContext();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTokens = async () => {
      try {
        setIsLoading(true);
        const vaultTokens = await getVaultTokens();
        setTokens(vaultTokens);
      } catch (error) {
        console.error("Failed to fetch vault tokens:", error);
        // Optionally, handle the error in the UI
      } finally {
        setIsLoading(false);
      }
    };

    fetchTokens();
  }, [selectedChain]);

  return (
    <VaultContext.Provider value={{ tokens, isLoading }}>
      {children}
    </VaultContext.Provider>
  );
};

export const useVault = () => {
  const context = useContext(VaultContext);
  if (context === undefined) {
    throw new Error('useVault must be used within a VaultProvider');
  }
  return context;
};
