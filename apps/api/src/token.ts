export type Token = {
  id: string; // stable id
  address: string;
  symbol: string;
  name: string;
  decimals: number;
};

export const TOKENS: Record<string, Token> = {
  ETH: {
    id: "ETH",
    address: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  WETH: {
    id: "WETH",
    address: "0x4200000000000000000000000000000000000006",
    name: "Wrapped Ether",
    symbol: "WETH",
    decimals: 18,
  },
  USDC: {
    id: "USDC",
    address: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    name: "USD Coin",
    symbol: "USDC",
    decimals: 6,
  },
  BTC: {
    id: "BTC",
    address: "0xcbB7C0006F23900c38EB856149F799620fcb8A4a",
    name: "Coinbase Wrapped BTC",
    symbol: "BTC",
    decimals: 8,
  },
};
