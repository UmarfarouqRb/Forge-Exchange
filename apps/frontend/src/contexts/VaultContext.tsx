
import { createContext, useContext, useCallback, useMemo } from 'react';
import { getVaultTokens, getMarkets } from '@/lib/api';
import { useChainContext } from '@/contexts/chain-context';
import { VaultToken, VaultAsset, Market, Token } from '@/types/market-data';
import { formatBalance } from '@/lib/format';
import { useAccount, useReadContracts } from 'wagmi';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useWatchContractEvent } from 'wagmi';
import { VAULT_SPOT_ADDRESS } from '@/config/contracts';
import { VaultSpotAbi } from '@/abis/VaultSpot';
import { safeAddress } from '@/lib/utils';
import { getDisplaySymbol } from '@/utils/tokenDisplay';

interface VaultContextType {
  assets: VaultAsset[];
  isLoading: boolean;
  totalAssetsValue: number;
  refetchVault: () => void;
  getVaultBalance: (tokenAddress: string) => bigint;
}

const VaultContext = createContext<VaultContextType | undefined>(undefined);

export const VaultProvider = ({ children }: { children: React.ReactNode }) => {
  const { selectedChain } = useChainContext();
  const { address } = useAccount();
  const queryClient = useQueryClient();

  const { data: vaultTokensStatic, isLoading: tokensLoading } = useQuery<VaultToken[]> ({
    queryKey: ['vaultTokensStatic'],
    queryFn: getVaultTokens,
  });

  const vaultTokens = useMemo(() => {
    if (!vaultTokensStatic) return [];
    return vaultTokensStatic.map(asset => asset.token);
  }, [vaultTokensStatic]);

  const { data: markets, isLoading: marketsLoading } = useQuery<Market[]> ({
    queryKey: ['markets'],
    queryFn: getMarkets,
  });

  const vaultAddress = safeAddress(VAULT_SPOT_ADDRESS);
  
  const balanceContracts = useMemo(() => {
    if (!vaultTokens.length || !address) return [];
    
    return vaultTokens.map((token: Token) => ({
      address: vaultAddress,
      abi: VaultSpotAbi,
      functionName: 'balances',
      args: [address, token.address as `0x${string}`],
      chainId: selectedChain.id,
    }));
  }, [vaultTokens, address, vaultAddress, selectedChain, VAULT_SPOT_ADDRESS]);

  const { data: balanceResults, refetch: refetchBalances, isLoading: balancesLoading } = useReadContracts({
    contracts: balanceContracts,
    query: {
      enabled: Boolean(address && selectedChain?.id && vaultTokens.length > 0),
    }
  });

  const [assets, totalAssetsValue] = useMemo(() => {
    if (!vaultTokensStatic || !balanceResults || !markets) {
      return [[], 0];
    }

    const marketMap = new Map(markets.map(m => [m.symbol.split('-')[0], m]));
    const stablecoins = ['USDC', 'DAI', 'USDT'];
    let totalValue = 0;
    const ethPrice = markets.find(m => m.symbol === 'WETHUSDC')?.lastPrice || '0';

    const assetsWithPrices: VaultAsset[] = vaultTokensStatic.map((asset: VaultToken, i: number) => {
      const token = asset.token;
      const balanceResult = balanceResults[i];
      const balance = balanceResult?.status === 'success' ? (balanceResult.result as bigint) : BigInt(0);

      let price = 0;
      const displaySymbol = getDisplaySymbol(token);

      if (displaySymbol === 'ETH') {
        price = parseFloat(ethPrice);
      } else if (stablecoins.includes(displaySymbol)) {
        price = 1;
      } else {
        const market = marketMap.get(displaySymbol);
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
    
    return [assetsWithPrices, totalValue];
  }, [vaultTokensStatic, balanceResults, markets]);
  
  const isLoading = tokensLoading || marketsLoading || balancesLoading;

  const refetchVault = useCallback(() => {
    refetchBalances();
    queryClient.invalidateQueries({ queryKey: ['markets'] });
  }, [refetchBalances, queryClient]);

  const getVaultBalance = useCallback((tokenAddress: string) => {
    const asset = assets.find(
      (a: VaultAsset) => a.token.address.toLowerCase() === tokenAddress.toLowerCase()
    );
    return asset?.balance ?? 0n;
  }, [assets]);

  useWatchContractEvent({
    address: vaultAddress,
    abi: VaultSpotAbi,
    eventName: 'Deposit',
    chainId: selectedChain.id,
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
    chainId: selectedChain.id,
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
    chainId: selectedChain.id,
    args: {
        user: address,
    },
    onLogs: () => {
        console.log('InternalTransfer event detected, refetching vault data');
        refetchVault();
    },
  });

  return (
    <VaultContext.Provider value={{ assets, isLoading, totalAssetsValue, refetchVault, getVaultBalance }}>
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
