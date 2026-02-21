
import { useReadContract, useBalance, useAccount } from 'wagmi';
import { VaultSpotAbi } from '@/abis/VaultSpot';
import { VAULT_SPOT_ADDRESS } from '@/config/contracts';
import { safeAddress } from '@/lib/utils';

export function useVaultBalance(tokenAddress: `0x${string}` | undefined) {
  const { address } = useAccount();

  const safeTokenAddress = safeAddress(tokenAddress);
  const safeVaultAddress = safeAddress(VAULT_SPOT_ADDRESS);

  const { data: erc20Balance, refetch: refetchErc20, isLoading: isErc20Loading } = useReadContract({
    address: safeVaultAddress,
    abi: VaultSpotAbi,
    functionName: 'availableBalance',
    args: address && safeTokenAddress ? [address, safeTokenAddress] : undefined,
    query: {
      enabled: !!address && !!safeTokenAddress && safeTokenAddress !== '0x0000000000000000000000000000000000000000',
    }
  });

  const { data: nativeBalance, refetch: refetchNative, isLoading: isNativeLoading } = useBalance({
    address: address,
    query: {
        enabled: !!address && safeTokenAddress === '0x0000000000000000000000000000000000000000',
    }
  });

  const isNative = safeTokenAddress === '0x0000000000000000000000000000000000000000';

  return {
    data: isNative ? nativeBalance?.value : erc20Balance,
    refetch: isNative ? refetchNative : refetchErc20,
    isLoading: isNative ? isNativeLoading : isErc20Loading,
  };
}
