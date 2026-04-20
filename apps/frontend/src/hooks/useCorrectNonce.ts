import { usePublicClient, useAccount } from 'wagmi';
import { getAddress } from 'viem';
import { INTENT_SPOT_ROUTER_ADDRESS } from '@/config/contracts';
import { IntentSpotRouterAbi } from '@/config/IntentSpotRouter';

const chainId = 84532; // Base Sepolia

export function useCorrectNonce() {
    const publicClient = usePublicClient();
    const { address: userAddress } = useAccount();

    const getNonce = async () => {
        if (!userAddress) {
            throw new Error('Wallet not connected');
        }

        const nonce = await publicClient.readContract({
            address: getAddress(INTENT_SPOT_ROUTER_ADDRESS[chainId]),
            abi: IntentSpotRouterAbi,
            functionName: 'nonces',
            args: [userAddress],
        });

        return nonce.toString();
    };

    return { getNonce };
}
