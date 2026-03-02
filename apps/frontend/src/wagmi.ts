import {http} from 'wagmi';
import {mainnet, base, bsc, arbitrum, baseSepolia} from 'wagmi/chains';

import {createConfig} from '@privy-io/wagmi';

export const config = createConfig({
  chains: [mainnet, base, bsc, arbitrum, baseSepolia],
  transports: {
    [mainnet.id]: http(),
    [base.id]: http(),
    [bsc.id]: http(),
    [arbitrum.id]: http(),
    [baseSepolia.id]: http(),
  },
});

declare module 'wagmi' {
  interface Register {
    config: typeof config;
  }
}
