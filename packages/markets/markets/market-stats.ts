
export type MarketStat = {
    id: string;
    symbol: string;
    currentPrice: string;
    priceChangePercent: number;
    high24h: string;
    low24h: string;
    volume24h: string;
    lastPrice: string;
    source: string;
};

// Mock data for market stats. To be replaced with actual data from an API.
export const mockMarketStats: MarketStat[] = [
    {
        id: 'BTCUSDC',
        symbol: 'BTCUSDC',
        currentPrice: '68000',
        priceChangePercent: 2.5,
        high24h: '69000',
        low24h: '67000',
        volume24h: '1000000000',
        lastPrice: '67900',
        source: 'mock',
    },
    {
        id: 'ETHUSDC',
        symbol: 'ETHUSDC',
        currentPrice: '3800',
        priceChangePercent: -1.2,
        high24h: '3850',
        low24h: '3750',
        volume24h: '500000000',
        lastPrice: '3810',
        source: 'mock',
    },
    {
      id: "BTCUSDT",
      symbol: "BTCUSDT",
      currentPrice: "68000",
      priceChangePercent: 2.5,
      high24h: "69000",
      low24h: "67000",
      volume24h: "1000000000",
      lastPrice: "67900",
      source: "mock",
    },
    {
        id: "BTCETH",
        symbol: "BTCETH",
        currentPrice: "17.89",
        priceChangePercent: 2.5,
        high24h: "18.16",
        low24h: "17.22",
        volume24h: "1000000000",
        lastPrice: "17.89",
        source: "mock",
    },
    {
        id: "USDTUSDC",
        symbol: "USDTUSDC",
        currentPrice: "1",
        priceChangePercent: 2.5,
        high24h: "1.1",
        low24h: "0.98",
        volume24h: "1000000000",
        lastPrice: "1",
        source: "mock",
    },
    {
        id: "ETHUSDT",
        symbol: "ETHUSDT",
        currentPrice: "3800",
        priceChangePercent: -1.2,
        high24h: "3850",
        low24h: "3750",
        volume24h: "500000000",
        lastPrice: "3810",
        source: "mock",
    },
    {
        id: "TRUMPUSDC",
        symbol: "TRUMPUSDC",
        currentPrice: "0.1",
        priceChangePercent: 50,
        high24h: "0.15",
        low24h: "0.05",
        volume24h: "10000000",
        lastPrice: "0.09",
        source: "mock",
    },
    {
        id: "TRUMPETH",
        symbol: "TRUMPETH",
        currentPrice: "0.000026",
        priceChangePercent: 45,
        high24h: "0.00003",
        low24h: "0.00002",
        volume24h: "5000000",
        lastPrice: "0.000025",
        source: "mock",
    },
    {
      id: "AEROETH",
      symbol: "AEROETH",
      currentPrice: "0.0003",
      priceChangePercent: 15,
      high24h: "0.00035",
      low24h: "0.00025",
      volume24h: "2000000",
      lastPrice: "0.00029",
      source: "mock",
  },
  {
      id: "AEROUSDC",
      symbol: "AEROUSDC",
      currentPrice: "1.14",
      priceChangePercent: 12,
      high24h: "1.20",
      low24h: "1.10",
      volume24h: "3000000",
      lastPrice: "1.13",
      source: "mock",
  },
  {
      id: "DAIUSDC",
      symbol: "DAIUSDC",
      currentPrice: "1.00",
      priceChangePercent: -0.1,
      high24h: "1.01",
      low24h: "0.99",
      volume24h: "4000000",
      lastPrice: "1.00",
      source: "mock",
  }
];
