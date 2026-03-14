
export type Token = {
  id: string;
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  wrapped?: string;
  logoURI?: string;
};

export type VaultToken = {
  token: Token;
  displayToken: Token;
  deposit_enabled: boolean;
  withdraw_enabled: boolean;
  vault_spot_supported: boolean;
};

export type VaultAsset = VaultToken & {
  balance: bigint;
  balanceFormatted: string;
  price?: number;
  balanceUSD?: number;
};

export type TradingPair = {
    id: string;
    symbol: string;
    base: Token;
    quote: Token;
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
  price?: string | null;
  lastPrice?: string | null;
  priceChangePercent?: number;
  high24h?: string | null;
  low24h?: string | null;
  volume24h?: string | null;
  currentPrice?: string | null;
  bids?: [string, string][];
  asks?: [string, string][];
  source?: 'live' | 'cached' | 'unavailable';
  isActive?: boolean;
};
