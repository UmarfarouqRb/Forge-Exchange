
import { useReadContract } from 'wagmi';
import { VaultSpotAbi } from '@/abis/VaultSpot';
import { VAULT_SPOT_ADDRESS } from '@/config/contracts';
import { safeAddress } from '@/lib/utils';
import { useAccount } from 'wagmi';

export function useVaultBalance(tokenAddress: `0x${string}` | undefined) {
  const { address } = useAccount();

  const safeTokenAddress = safeAddress(tokenAddress);
  const safeVaultAddress = safeAddress(VAULT_SPOT_ADDRESS);

  return useReadContract({
    address: safeVaultAddress,
    abi: VaultSpotAbi,
    functionName: 'balances',
    args: address && safeTokenAddress ? [address, safeTokenAddress] : undefined,
    query: {
      enabled: !!address && !!safeTokenAddress,
    }
  });
}
