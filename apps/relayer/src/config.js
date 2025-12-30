"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.relayerConfig = void 0;
const ethers_1 = require("ethers");
exports.relayerConfig = {
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
    getNetworkByChainId: function (chainId) {
        for (const networkName in this.networks) {
            const typedNetworkName = networkName;
            const network = this.networks[typedNetworkName];
            if (network.chainId === chainId) {
                return { name: typedNetworkName, ...network };
            }
        }
        return undefined;
    },
    getSigner: async function (network = 'local') {
        const { providerUrl } = this.networks[network];
        const provider = new ethers_1.ethers.providers.JsonRpcProvider(providerUrl);
        const privateKey = process.env.RELAYER_PRIVATE_KEY;
        if (!privateKey) {
            throw new Error('RELAYER_PRIVATE_KEY environment variable not set');
        }
        const wallet = new ethers_1.ethers.Wallet(privateKey, provider);
        return wallet;
    }
};
