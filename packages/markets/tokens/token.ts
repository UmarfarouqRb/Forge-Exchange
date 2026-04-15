export type Token = {
  id: string; // stable id
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  wrapped?: string;
};

export const TOKENS: Record<string, Token> = {
  WETH: {
    id: "WETH",
    address: "0x4200000000000000000000000000000000000006",
    name: "Wrapped Ethereum",
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
  LINK: {
    id: "EUROC",
    address: "0x808456652fdb597867f38412077A9182bf77359F",
    name: "EURO Coin",
    symbol: "EUROC",
    decimals: 6,
  },
};
