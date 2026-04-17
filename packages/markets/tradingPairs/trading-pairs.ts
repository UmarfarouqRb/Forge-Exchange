import { TOKENS, Token  } from "../tokens/token";

export type TradingPair = {
  id: string;
  base: Token;
  quote: Token;
  symbol: string;
};

const rawPairs: { id: string; base: string; quote: string, symbol: string }[] = [
  {
    id: "f38210ef-f97d-48c3-a959-90553428f3cd",
    base: "BTC",
    quote: "USDC",
    symbol: "BTCUSDC"
  },
  {
    id: "5ee40335-adc1-449d-8842-52198e70f598",
    base: "WETH",
    quote: "USDC",
    symbol: "WETHUSDC"
  },
  {
    id: "1ec60f1a-2f9a-4ce2-857a-d2f597851620",
    base: "EURC",
    quote: "USDC", 
    symbol: "EURCUSDC"
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

    return {
      id: p.id,
      base: baseToken,
      quote: quoteToken,
      symbol: p.symbol,
    };
  }).filter((p): p is TradingPair => p !== null);

  return tradingPairs;
}

// Initialize pairs on startup
getTradingPairs();

export function getTradingPairBySymbol(symbol: string): TradingPair | undefined {
  return getTradingPairs().find(p => p.symbol === symbol);
}
