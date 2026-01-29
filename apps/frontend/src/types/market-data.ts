export interface Token {
  id: string;
  chainId: number;
  address: string;
  symbol: string;
  name: string | null;
  decimals: number;
  createdAt: string;
}

export interface TradingPair {
  id:string;
  baseTokenId: string;
  quoteTokenId: string;
  symbol: string;
  isActive: boolean;
  createdAt: string;
}

export interface Order {
  id: string;
  userAddress: string;
  tradingPairId: string;
  side: "buy" | "sell";
  price: string;
  quantity: string;
  filledQuantity: string;
  status: "open" | "filled" | "cancelled";
  createdAt: string;
  symbol?: string;
  amount?: string;
  total?: string;
}

// This type represents the detailed market information provided by the API
export interface Market {
    id: string;
    symbol: string;
    lastPrice: string | null;
    volume24h: string;
    high24h: string | null;
    low24h: string | null;
    priceChangePercent: number;
    baseAsset?: string;
    quoteAsset?: string;
    price?: number | null;
    currentPrice?: string | null;
    bids: [string, string][];
    asks: [string, string][];
}

export interface OrderBook {
    bids: [string, string][];
    asks: [string, string][];
}
