
export type Order = {
    id: string;
    symbol: string;
    side: 'buy' | 'sell';
    price: string;
    amount: string;
    total: string;
    status: string;
    createdAt?: number;
    leverage?: string;
  };
  
  export type Token = {
    address: string;
    name: string;
    symbol: string;
    decimals: number;
  };

  export type Asset = {
    id: string;
    asset: string;
    total: string;
    available: string;
    inOrder: string;
    usdValue: string;
  };
  
  export type Transaction = {
    id: string;
    timestamp: number;
    type: string;
    asset: string;
    amount: string;
    status: string;
    txHash: string | null;
  }
  
  export type Market = {
    symbol: string;
    baseAsset: string;
    quoteAsset: string;
    currentPrice: string;
    priceChange24h: string;
    volume24h: string;
    high24h: string;
    low24h: string;
    isFavorite: boolean;
    category: string;
    historicalData?: number[];
  };

  export type TradingPair = Market & {
    id: string;
  };

  export type Trade = {
    id: string;
    symbol: string;
    side: 'buy' | 'sell';
    price: string;
    amount: string;
    total: string;
    createdAt: number;
  };
