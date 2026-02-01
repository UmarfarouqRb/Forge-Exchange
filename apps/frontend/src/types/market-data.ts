export type Token = {
  id: string;
  chainId: number;
  address: string;
  symbol: string;
  name: string;
  decimals: number;
};

export type TradingPair = {
  id: string;
  symbol: string;
  baseToken: Token;
  quoteToken: Token;
  status: string;
};

export type Order = {
  id: string;
  walletAddress: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: 'limit' | 'market';
  price: string;
  amount: string;
  total: string;
  status: 'open' | 'filled' | 'cancelled';
  createdAt: string;
  updatedAt: string;
};

export type OrderBook = {
  bids: [string, string][];
  asks: [string, string][];
};

export type Market = {
  id: string;
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  lastPrice: string | null;
  priceChangePercent: number;
  high24h: string | null;
  low24h: string | null;
  volume24h: string | null;
  bids: [string, string][];
  asks: [string, string][];
  source: 'live' | 'cached' | 'unavailable';
};