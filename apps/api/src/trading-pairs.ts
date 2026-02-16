
import { TOKENS, Token } from "./token";

export type TradingPair = {
  id: string;
  base: Token;
  quote: Token;
  symbol: string;
};

const rawPairs: { id: string; base: string; quote: string }[] = [
  {
    id: "BTCUSDC",
    base: "BTC",
    quote: "USDC",
  },
  {
    id: "BTCUSDT",
    base: "BTC",
    quote: "USDT",
  },
  {
    id: "BTCETH",
    base: "BTC",
    quote: "ETH",
  },
  {
    id: "USDTUSDC",
    base: "USDT",
    quote: "USDC",
  },
  {
    id: "ETHUSDT",
    base: "ETH",
    quote: "USDT",
  },
  {
    id: "ETHUSDC",
    base: "ETH",
    quote: "USDC",
  },
  {
    id: "TRUMPUSDC",
    base: "TRUMP",
    quote: "USDC",
  },
  {
    id: "TRUMPUSDT",
    base: "TRUMP",
    quote: "USDT", 
  }, 
  {
    id:"AEROUSDC",
    base: "AERO",
    quote: "USDC", 
  },
  {
    id: "DAIUSDC",
    base: "DAI",
    quote: "USDC", 
  }
];

let tradingPairs: TradingPair[] | null = null;

export function getTradingPairs(): TradingPair[] {
  if (tradingPairs) {
    return tradingPairs;
  }

  tradingPairs = rawPairs.map((p) => {
    const baseToken = TOKENS[p.base];
    const quoteToken = TOKENS[p.quote];

    if (!baseToken || !quoteToken) {
      console.error(`Tokens not found for pair ${p.id}`);
      return null;
    }

    const symbol = `${p.base}${p.quote}`;

    return {
      id: symbol,
      base: baseToken,
      quote: quoteToken,
      symbol: symbol,
    };
  }).filter((p): p is TradingPair => p !== null);

  return tradingPairs;
}

// Initialize pairs on startup
getTradingPairs();

export function getTradingPairBySymbol(symbol: string): TradingPair | undefined {
  return getTradingPairs().find(p => p.symbol === symbol);
}
