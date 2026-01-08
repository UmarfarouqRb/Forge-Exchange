
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { relayerConfig } from '@forge/common';

const erc20Abi = [
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [
      {
        "name": "",
        "type": "uint8"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  }
] as const;

export async function getTokenDecimals(tokenAddress: string, chainId: number): Promise<number> {
    const network = relayerConfig.getNetworkByChainId(chainId);
    if (!network) {
        throw new Error(`Unsupported chainId: ${chainId}`);
    }

    const publicClient = createPublicClient({
        chain: base,
        transport: http(network.providerUrl),
    });

    try {
        const decimals = await publicClient.readContract({
            address: tokenAddress as `0x${string}`,
            abi: erc20Abi,
            functionName: 'decimals',
        });
        return decimals;
    } catch (error) {
        console.error(`Error fetching decimals for token ${tokenAddress}:`, error);
        return 18;
    }
}
