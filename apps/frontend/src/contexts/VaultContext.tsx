
import { createContext, useContext, useEffect, useState } from 'react';
import { getVaultTokens, getMarkets } from '@/lib/api';
import { useChainContext } from '@/contexts/chain-context';
import { VaultAsset } from '@/types/market-data';
import { formatBalance } from '@/lib/format';

interface VaultContextType {
  assets: VaultAsset[];
  isLoading: boolean;
  totalAssetsValue: number;
}

const VaultContext = createContext<VaultContextType | undefined>(undefined);

export const VaultProvider = ({ children }: { children: React.ReactNode }) => {
  const { selectedChain } = useChainContext();
  const [assets, setAssets] = useState<VaultAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalAssetsValue, setTotalAssetsValue] = useState(0);

  useEffect(() => {
    const fetchAndProcessAssets = async () => {
      try {
        setIsLoading(true);
        const [vaultAssets, markets] = await Promise.all([
          getVaultTokens(),
          getMarkets(),
        ]);

        const stablecoins = ['USDC', 'DAI', 'USDT'];
        let totalValue = 0;

        const assetsWithPrices = vaultAssets.map(asset => {
          let price = 0;
          if (stablecoins.includes(asset.token.symbol)) {
            price = 1;
          } else {
            const market = markets.find(m => m.symbol.startsWith(asset.token.symbol + '-'));
            if (market && market.lastPrice) {
              price = parseFloat(market.lastPrice);
            }
          }
          
          const balance = parseFloat(formatBalance(BigInt(asset.balance), asset.token.decimals));
          const balanceUSD = balance * price;
          totalValue += balanceUSD;
          
          return {
            ...asset,
            price,
            balanceUSD,
          };
        });
        
        setAssets(assetsWithPrices);
        setTotalAssetsValue(totalValue);

      } catch (error) {
        console.error("Failed to fetch vault assets:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAndProcessAssets();
  }, [selectedChain]);

  return (
    <VaultContext.Provider value={{ assets, isLoading, totalAssetsValue }}>
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
