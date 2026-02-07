
export type Token = {
  id: number;
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
    isActive?: boolean;
    status: 'active' | 'inactive';
}

export type Order = {
  id: string;
  userAddress: string;
  tradingPairId: string;
  side: 'buy' | 'sell';
  price: string;
  quantity: string;
  filledQuantity: string;
  status: 'open' | 'filled' | 'cancelled';
  createdAt: string;
};

export type InsertOrder = {
  userAddress: string;
  tradingPairId: string;
  side: 'buy' | 'sell';
  price?: string;
  quantity: string;
  type?: 'limit' | 'market';
}

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
  source?: 'live' | 'cached' | 'unavailable';
};
