
import { useReadContract, useBalance, useAccount } from 'wagmi';
import { VaultSpotAbi } from '@/abis/VaultSpot';
import { VAULT_SPOT_ADDRESS } from '@/config/contracts';
import { useRefetchContext } from '@/contexts/RefetchContext';
import { useEffect } from 'react';

export function useVaultBalance(tokenAddress: string | undefined) {
  const { address } = useAccount();
  const { refetchCounter } = useRefetchContext();

  const { data: erc20Balance, refetch: refetchErc20 } = useReadContract({
    address: VAULT_SPOT_ADDRESS,
    abi: VaultSpotAbi,
    functionName: 'availableBalance',
    args: address && tokenAddress ? [address, tokenAddress as `0x${string}`] : undefined,
    query: {
      enabled: !!address && !!tokenAddress && tokenAddress !== '0x0000000000000000000000000000000000000000',
    },
  });

  const { data: nativeBalance, refetch: refetchNative } = useBalance({
    address: address,
    query: {
        enabled: !!address && tokenAddress === '0x0000000000000000000000000000000000000000',
    }
  });

  useEffect(() => {
    if (tokenAddress) {
      if (tokenAddress === '0x0000000000000000000000000000000000000000') {
        refetchNative();
      } else {
        refetchErc20();
      }
    }
  }, [refetchCounter, tokenAddress]);

  const isNative = tokenAddress === '0x0000000000000000000000000000000000000000';

  return {
    data: isNative ? nativeBalance?.value : erc20Balance,
    refetch: isNative ? refetchNative : refetchErc20,
  };
}
