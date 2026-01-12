
import { useReadContract, useBalance, useAccount } from 'wagmi';
import { VaultSpotAbi } from '@/abis/VaultSpot';
import { VAULT_SPOT_ADDRESS } from '@/config/contracts';

export function useVaultBalance(tokenAddress: `0x${string}` | undefined) {
  const { address } = useAccount();

  const { data: erc20Balance, refetch: refetchErc20 } = useReadContract({
    address: VAULT_SPOT_ADDRESS,
    abi: VaultSpotAbi,
    functionName: 'availableBalance',
    args: address && tokenAddress ? [address, tokenAddress] : undefined,
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

  const isNative = tokenAddress === '0x0000000000000000000000000000000000000000';

  return {
    data: isNative ? nativeBalance?.value : erc20Balance,
    refetch: isNative ? refetchNative : refetchErc20,
  };
}
