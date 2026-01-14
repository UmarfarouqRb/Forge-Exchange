import { http, createPublicClient } from "viem";
import { foundry } from "viem/chains";

export const TOKENS = {
  WETH: {
    address: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    name: "Wrapped Ether",
    symbol: "WETH",
    decimals: 18,
  },
  USDC: {
    address: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    name: "USD Coin",
    symbol: "USDC",
    decimals: 6,
  },
};

export const publicClient = createPublicClient({
  chain: foundry,
  transport: http(),
});

export const RELAYER_URL = import.meta.env.VITE_RELAYER_URL || "http://localhost:3001";
