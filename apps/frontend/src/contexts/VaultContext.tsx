
import { createContext, useContext, useEffect, useState } from 'react';
import { getVaultTokens } from '@/lib/api';
import { useChainContext } from '@/contexts/chain-context';
import { VaultAsset } from '@/types/market-data';

interface VaultContextType {
  assets: VaultAsset[];
  isLoading: boolean;
}

const VaultContext = createContext<VaultContextType | undefined>(undefined);

export const VaultProvider = ({ children }: { children: React.ReactNode }) => {
  const { selectedChain } = useChainContext();
  const [assets, setAssets] = useState<VaultAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTokens = async () => {
      try {
        setIsLoading(true);
        const vaultAssets = await getVaultTokens();
        setAssets(vaultAssets);

      } catch (error) {
        console.error("Failed to fetch vault assets:", error);
        // Optionally, handle the error in the UI
      } finally {
        setIsLoading(false);
      }
    };

    fetchTokens();
  }, [selectedChain]);

  return (
    <VaultContext.Provider value={{ assets, isLoading }}>
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
