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
    address: "0x4200000000000000000000000000000000000006",
    name: "Wrapped Ether",
    symbol: "ETH",
    decimals: 18,
  },
  USDC: {
    id: "USDC",
    address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    name: "USD Coin",
    symbol: "USDC",
    decimals: 6,
  },
  USDT: {
    id: "USDT",
    address: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
    name: "Tether",
    symbol: "USDT",
    decimals: 6,
  },
  DAI: {
    id: "DAI",
    address: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb",
    name: "Dai",
    symbol: "DAI",
    decimals: 18,
  },
  BTC: {
    id: "BTC",
    address: "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf",
    name: "Wrapped Bitcoin",
    symbol: "BTC",
    decimals: 8,
  },
  AERO: {
    id: "AERO",
    address: "0x940181a94A35A4569E4529A3CDfB74e38FD98631",
    name: "Aerodrome Finance",
    symbol: "AERO",
    decimals: 18,
  },
  TRUMP: {
    id: "TRUMP",
    address: "0xc27468b12ffA6d714B1b5fBC87eF403F38b82AD4",
    name: "MAGA",
    symbol: "TRUMP",
    decimals: 18,
  },
};
