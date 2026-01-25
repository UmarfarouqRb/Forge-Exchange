export interface MarketData {
  price: number;
  bids: [string, string][];
  asks: [string, string][];
}
