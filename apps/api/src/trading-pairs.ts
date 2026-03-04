
import { TOKENS, Token } from "./token";
import { toDisplayToken } from "./token-display";

export type TradingPair = {
  id: string;
  base: Token;
  quote: Token;
  symbol: string;
  displayBase: Token;
  displayQuote: Token;
};

const rawPairs: { id: string; base: string; quote: string }[] = [
  {
    id: "BTCUSDC",
    base: "BTC",
    quote: "USDC",
  },
  {
    id: "WETHUSDC",
    base: "WETH",
    quote: "USDC",
  },
  {
    id: "USDCWETH",
    base: "USDC",
    quote: "WETH",
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

    const displayBase = toDisplayToken(baseToken);
    const displayQuote = toDisplayToken(quoteToken);

    return {
      id: p.id,
      base: baseToken,
      quote: quoteToken,
      displayBase,
      displayQuote,
      symbol: `${displayBase.symbol}${displayQuote.symbol}`,
    };
  }).filter((p): p is TradingPair => p !== null);

  return tradingPairs;
}

// Initialize pairs on startup
getTradingPairs();

export function getTradingPairBySymbol(symbol: string): TradingPair | undefined {
  return getTradingPairs().find(p => p.symbol === symbol);
}
