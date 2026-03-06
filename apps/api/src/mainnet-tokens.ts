export type Token = {
  id: string; // stable id
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  wrapped?: string;
};

export const MAINNET_TOKENS: Record<string, Token> = {
  WETH: {
    id: "WETH",
    address: "0x4200000000000000000000000000000000000006",
    name: "Wrapped Ethereum",
    symbol: "WETH",
    decimals: 18,
  },
  USDC: {
    id: "USDC",
    address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    name: "USD Coin",
    symbol: "USDC",
    decimals: 6,
  },
  BTC: {
    id: "BTC",
    address: "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf",
    name: "Coinbase Wrapped BTC",
    symbol: "BTC",
    decimals: 8,
  },
};
