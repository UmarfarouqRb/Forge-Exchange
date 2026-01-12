import { useAccount, useReadContract } from "wagmi";
import { VaultSpotAbi } from "@/abis/VaultSpot";
import { VAULT_SPOT_ADDRESS } from "@/config/contracts";

export function useVaultBalance(token: `0x${string}`) {
  const { address } = useAccount();

  return useReadContract({
    address: VAULT_SPOT_ADDRESS,
    abi: VaultSpotAbi,
    functionName: "availableBalance",
    args: address ? [address, token] : undefined,
  });
}