import { ethers } from 'ethers';
import { relayerConfig } from '@forge/common';

const networkConfig = relayerConfig.getNetworkByChainId(8453);
if (!networkConfig) {
    throw new Error('Base Mainnet network configuration not found');
}

export const provider = new ethers.JsonRpcProvider(networkConfig.providerUrl);
