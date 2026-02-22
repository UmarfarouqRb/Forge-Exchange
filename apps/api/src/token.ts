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
  SOL: {
    id: "SOL",
    address: "0x311935cd80b76769bf2ecc9d8ab7635b2139cf82",
    name: "Solana",
    symbol: "SOL",
    decimals: 18,
  },
  EUROC: {
    id: "EUROC",
    address: "0x60a3e35cc302bfa44cb288bc5a4f316fdb1adb42",
    name: "Euro Coin",
    symbol: "EUROC",
    decimals: 6,
  },
  ZORA: {
    id: "ZORA",
    address: "0x1111111111166b7fe7bd91427724b487980afc69",
    name: "Zora",
    symbol: "ZORA",
    decimals: 18,
  },
  XRP: {
    id: "XRP",
    address: "0xcb585250f852c6c6bf90434ab21a00f02833a4af",
    name: "cbXRP",
    symbol: "XRP",
    decimals: 18,
  },
  VIRTUAL: {
    id: "VIRTUAL",
    address: "0x0b3e328455c4059eeb9e3f84b5543f74e24e7e1b",
    name: "Virtual",
    symbol: "VIRTUAL",
    decimals: 18,
  },
  AAVE: {
    id: "AAVE",
    address: "0x63706e401c06ac8513145b7687a14804d17f814b",
    name: "Aave",
    symbol: "AAVE",
    decimals: 18,
  },
  HYPE: {
    id: "HYPE",
    address: "0x15d0e0c55a3e7ee67152ad7e89acf164253ff68d",
    name: "Hype",
    symbol: "HYPE",
    decimals: 18,
  },
};
