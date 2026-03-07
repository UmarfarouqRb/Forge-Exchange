import { useReadContract } from 'wagmi';
import { VaultSpotAbi } from '@/abis/VaultSpot';
import { VAULT_SPOT_ADDRESS } from '@/config/contracts';
import { safeAddress } from '@/lib/utils';
import { useAccount } from 'wagmi';
import { useChainContext } from '@/contexts/chain-context';

export function useVaultBalance(tokenAddress: `0x${string}` | undefined) {
  const { address } = useAccount();
  const { selectedChain } = useChainContext();

  const chainId = selectedChain?.id;
  const vaultAddress = safeAddress(VAULT_SPOT_ADDRESS);

  return useReadContract({
    address: vaultAddress,

    abi: VaultSpotAbi,
    functionName: 'balances',
    args: address && tokenAddress ? [address, tokenAddress] : undefined,
    chainId: chainId as any,
    query: {
      enabled: !!address && !!tokenAddress,
    }
  });
}
