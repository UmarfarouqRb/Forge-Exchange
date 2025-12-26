import { ethers } from "ethers";

export const relayerConfig = {
    networks: {
        base: {
            providerUrl: process.env.BASE_PROVIDER_URL || 'https://mainnet.base.org',
            intentSpotRouterAddress: process.env.BASE_INTENT_SPOT_ROUTER_ADDRESS || '0x0000000000000000000000000000000000000000',
        },
        local: {
            providerUrl: process.env.LOCAL_PROVIDER_URL || 'http://localhost:8545',
            intentSpotRouterAddress: process.env.LOCAL_INTENT_SPOT_ROUTER_ADDRESS || '0x0000000000000000000000000000000000000000',
        },
    },
    getSigner: async function(network: 'base' | 'local' = 'local') {
        const { providerUrl } = this.networks[network];
        const provider = new ethers.providers.JsonRpcProvider(providerUrl);
        // This assumes the relayer's private key is stored in an environment variable
        // For production, consider a more secure key management solution
        const privateKey = process.env.RELAYER_PRIVATE_KEY;
        if (!privateKey) {
            throw new Error('RELAYER_PRIVATE_KEY environment variable not set');
        }
        const wallet = new ethers.Wallet(privateKey, provider);
        return wallet;
    }
};
