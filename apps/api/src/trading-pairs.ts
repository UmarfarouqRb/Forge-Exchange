
import { TOKENS, Token } from "./token";

export type TradingPair = {
  id: string;
  base: Token;
  quote: Token;
  symbol: string;
};

const rawPairs: { id: string; base: string; quote: string }[] = [
  {
    id: "BTC-USDC",
    base: "BTC",
    quote: "USDC",
  },
  {
    id: "ETH-USDC",
    base: "WETH",
    quote: "USDC",
  },
  {
    id: "AERO-WETH",
    base: "AERO",
    quote: "WETH",
  },
  {
    id: "TRUMP-WETH",
    base: "TRUMP",
    quote: "WETH",
  },
  {
    id: "DAI-USDC",
    base: "DAI",
    quote: "USDC",
  },
  {
    id: "USDT-USDC",
    base: "USDT",
    quote: "USDC",
  },
  {
    id: "BTC-USDT",
    base: "BTC",
    quote: "USDT",
  },
  {
    id: "ETH-USDT",
    base: "WETH",
    quote: "USDT",
  },
  {
    id: "AERO-USDT",
    base: "AERO",
    quote: "USDT",
  },
  {
    id: "TRUMP-USDT",
    base: "TRUMP",
    quote: "USDT",
  },
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

    return {
      id: p.id,
      base: baseToken,
      quote: quoteToken,
      symbol: `${p.base}/${p.quote}`,
    };
  }).filter((p): p is TradingPair => p !== null);

  return tradingPairs;
}

// Initialize pairs on startup
getTradingPairs();

export function getTradingPairBySymbol(symbol: string): TradingPair | undefined {
  return getTradingPairs().find(p => p.symbol === symbol);
}
