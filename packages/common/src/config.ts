
import { ethers } from "ethers";

type NetworkName = 'base' | 'local';

type NetworkConfig = {
    chainId: number;
    providerUrl: string;
    intentSpotRouterAddress: string;
    sessionKeyManagerAddress: string;
};

type Networks = {
    [key in NetworkName]: NetworkConfig;
};

export const relayerConfig = {
    relayerUrl: process.env.RELAYER_URL || 'http://localhost:3000',
    networks: {
        base: {
            chainId: 8453,
            providerUrl: process.env.BASE_PROVIDER_URL || 'https://mainnet.base.org',
            intentSpotRouterAddress: process.env.BASE_INTENT_SPOT_ROUTER_ADDRESS || '0x0000000000000000000000000000000000000000',
            sessionKeyManagerAddress: process.env.BASE_SESSION_KEY_MANAGER_ADDRESS || '0x0000000000000000000000000000000000000000',
        },
        local: {
            chainId: 31337,
            providerUrl: process.env.LOCAL_PROVIDER_URL || 'http://localhost:8545',
            intentSpotRouterAddress: process.env.LOCAL_INTENT_SPOT_ROUTER_ADDRESS || '0x0000000000000000000000000000000000000000',
            sessionKeyManagerAddress: process.env.LOCAL_SESSION_KEY_MANAGER_ADDRESS || '0x0000000000000000000000000000000000000000',
        },
    } as Networks,

    getNetworkByChainId: function(chainId: number): (NetworkConfig & { name: NetworkName }) | undefined {
        for (const networkName in this.networks) {
            const typedNetworkName = networkName as NetworkName;
            const network = this.networks[typedNetworkName];
            if (network.chainId === chainId) {
                return { name: typedNetworkName, ...network };
            }
        }
        return undefined;
    },

    getSigner: async function(network: NetworkName = 'local') {
        const { providerUrl } = this.networks[network];
        const provider = new ethers.JsonRpcProvider(providerUrl);
        const privateKey = process.env.RELAYER_PRIVATE_KEY;
        if (!privateKey) {
            throw new Error('RELAYER_PRIVATE_KEY environment variable not set');
        }
        const wallet = new ethers.Wallet(privateKey, provider);
        return wallet;
    }
};
