
import { base, baseSepolia } from 'viem/chains';

export const getChain = (chainId: number) => {
    if (chainId === base.id) {
        return base;
    }
    if (chainId === baseSepolia.id) {
        return baseSepolia;
    }
    throw new Error(`Unsupported chainId: ${chainId}`);
};
