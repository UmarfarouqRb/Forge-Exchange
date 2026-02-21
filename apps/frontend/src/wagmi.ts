import { createConfig } from '@privy-io/wagmi';
import { http } from 'wagmi';
import { base, mainnet, bsc, arbitrum } from 'viem/chains';

export const wagmiConfig = createConfig({
  chains: [mainnet, base, bsc, arbitrum],
  transports: {
    [mainnet.id]: http(),
    [base.id]: http(),
    [bsc.id]: http(),
    [arbitrum.id]: http(),
  },
});
