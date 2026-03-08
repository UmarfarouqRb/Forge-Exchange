
import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { getVaultTokens, getMarkets } from '@/lib/api';
import { useChainContext } from '@/contexts/chain-context';
import { VaultAsset, Market, Token } from '@/types/market-data';
import { formatBalance } from '@/lib/format';
import { useAccount, useReadContracts } from 'wagmi';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useWatchContractEvent } from 'wagmi';
import { VAULT_SPOT_ADDRESS } from '@/config/contracts';
import { VaultSpotAbi } from '@/abis/VaultSpot';
import { safeAddress } from '@/lib/utils';

interface VaultContextType {
  assets: VaultAsset[];
  isLoading: boolean;
  totalAssetsValue: number;
  refetchVault: () => void;
}

const VaultContext = createContext<VaultContextType | undefined>(undefined);

export const VaultProvider = ({ children }: { children: React.ReactNode }) => {
  const { selectedChain } = useChainContext();
  const { address } = useAccount();
  const queryClient = useQueryClient();

  const [assets, setAssets] = useState<VaultAsset[]>([]);
  const [totalAssetsValue, setTotalAssetsValue] = useState(0);

  const { data: vaultAssetsResponse, isLoading: tokensLoading } = useQuery<VaultAsset[]>({
    queryKey: ['vaultTokensStatic'],
    queryFn: getVaultTokens,
  });

  const vaultTokens = useMemo(() => {
    if (!vaultAssetsResponse) return [];
    return vaultAssetsResponse.map(asset => asset.token);
  }, [vaultAssetsResponse]);

  const { data: markets, isLoading: marketsLoading } = useQuery<Market[]> ({
    queryKey: ['markets'],
    queryFn: getMarkets,
  });

  const vaultAddress = safeAddress(VAULT_SPOT_ADDRESS);
  const balanceContracts = useMemo(() => {
    if (!vaultTokens || !address) return [];
    return vaultTokens.map((token: Token) => ({
      address: vaultAddress,
      abi: VaultSpotAbi,
      functionName: 'balances',
      args: [address, token.address as `0x${string}`],
      chainId: selectedChain?.id as any,
    }));
  }, [vaultTokens, address, vaultAddress, selectedChain]);

  const { data: balanceResults, refetch: refetchBalances, isLoading: balancesLoading } = useReadContracts({
    contracts: balanceContracts,
    query: {
      enabled: !!address && vaultTokens.length > 0,
    }
  });

  useEffect(() => {
    if (vaultAssetsResponse && balanceResults && markets) {

      const marketMap = new Map(
        markets.map(m => [m.symbol.split('-')[0], m])
      );
      
      const stablecoins = ['USDC', 'DAI', 'USDT'];
      let totalValue = 0;

      const assetsWithPrices: VaultAsset[] = vaultAssetsResponse.map((asset: VaultAsset, i: number) => {
        const token = asset.token;
        const balanceResult = balanceResults[i];
        const balance = balanceResult.status === 'success' ? (balanceResult.result as bigint) : BigInt(0);

        let price = 0;
        if (stablecoins.includes(token.symbol)) {
          price = 1;
        } else {
          const market = marketMap.get(token.symbol);
          if (market && market.lastPrice) {
            price = parseFloat(market.lastPrice);
          }
        }
        
        const balanceFormatted = formatBalance(balance, token.decimals);
        const balanceFloat = parseFloat(balanceFormatted);
        const balanceUSD = balanceFloat * price;
        totalValue += balanceUSD;

        return {
          ...asset,
          balance,
          balanceFormatted,
          price,
          balanceUSD,
        };
      });
      
      setAssets(assetsWithPrices);
      setTotalAssetsValue(totalValue);
    }
  }, [vaultAssetsResponse, balanceResults, markets]);
  
  const isLoading = tokensLoading || marketsLoading || balancesLoading;

  const refetchVault = useCallback(() => {
    refetchBalances();
    queryClient.invalidateQueries({ queryKey: ['markets'] });
  }, [refetchBalances, queryClient]);

  useWatchContractEvent({
    address: vaultAddress,
    abi: VaultSpotAbi,
    eventName: 'Deposit',
    chainId: selectedChain?.id as any,
    args: {
        user: address,
    },
    onLogs: () => {
        console.log('Deposit event detected, refetching vault data');
        refetchVault();
    },
  });

  useWatchContractEvent({
    address: vaultAddress,
    abi: VaultSpotAbi,
    eventName: 'Withdraw',
    chainId: selectedChain?.id as any,
    args: {
        user: address,
    },
    onLogs: () => {
        console.log('Withdraw event detected, refetching vault data');
        refetchVault();
    },
  });

  useWatchContractEvent({
    address: vaultAddress,
    abi: VaultSpotAbi,
    eventName: 'InternalTransfer',
    chainId: selectedChain?.id as any,
    args: {
        user: address,
    },
    onLogs: () => {
        console.log('InternalTransfer event detected, refetching vault data');
        refetchVault();
    },
  });

  return (
    <VaultContext.Provider value={{ assets, isLoading, totalAssetsValue, refetchVault }}>
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
