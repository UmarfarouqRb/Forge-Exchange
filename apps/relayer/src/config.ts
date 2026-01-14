import { createWalletClient, http, WalletClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base, foundry } from 'viem/chains';

interface NetworkConfig {
    chainId: number;
    providerUrl: string;
    intentSpotRouterAddress: string;
}

interface RelayerConfig {
    networks: {
        base: NetworkConfig;
        local: NetworkConfig;
        [key: string]: NetworkConfig;
    };
    getNetworkByChainId: (chainId: number) => (NetworkConfig & { name: string }) | undefined;
    getSigner: (network?: 'base' | 'local') => Promise<WalletClient>;
}

export const relayerConfig: RelayerConfig = {
    networks: {
        base: {
            chainId: 8453,
            providerUrl: process.env.BASE_PROVIDER_URL || 'https://mainnet.base.org',
            intentSpotRouterAddress: process.env.BASE_INTENT_SPOT_ROUTER_ADDRESS || '0x0000000000000000000000000000000000000000',
        },
        local: {
            chainId: 31337,
            providerUrl: process.env.LOCAL_PROVIDER_URL || 'http://localhost:8545',
            intentSpotRouterAddress: process.env.LOCAL_INTENT_SPOT_ROUTER_ADDRESS || '0x0000000000000000000000000000000000000000',
        },
    },
    getNetworkByChainId: function (chainId: number) {
        for (const networkName in this.networks) {
            const typedNetworkName = networkName as 'base' | 'local';
            const network = this.networks[typedNetworkName];
            if (network.chainId === chainId) {
                return { name: typedNetworkName, ...network };
            }
        }
        return undefined;
    },
    getSigner: async function (network: 'base' | 'local' = 'local') {
        const { providerUrl } = this.networks[network];
        const privateKey = process.env.RELAYER_PRIVATE_KEY;
        if (!privateKey) {
            throw new Error('RELAYER_PRIVATE_KEY environment variable not set');
        }
        
        const account = privateKeyToAccount(privateKey.startsWith('0x') ? privateKey as `0x${string}` : `0x${privateKey}`);
        
        const chain = network === 'base' ? base : foundry;

        const client = createWalletClient({
            account,
            chain,
            transport: http(providerUrl),
        });
        return client;
    }
};