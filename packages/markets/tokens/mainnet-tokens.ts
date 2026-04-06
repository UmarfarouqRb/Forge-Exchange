export type Token = {
  id: string; // stable id
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  wrapped?: string;
};

export const MAINNET_TOKENS: Record<string, Token> = {
  ETH: {
    id: "ETH",
    address: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    name: "Ethereum",
    symbol: "ETH",
    decimals: 18,
    wrapped: "WETH",
  },
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
  LINK: {
    id: "LINK",
    address: "0x88Fb150BDc53A65fe94Dea0c9BA0a6dAf8C6e196",
    name: "Chainlink",
    symbol: "LINK",
    decimals: 18,
  },
};
