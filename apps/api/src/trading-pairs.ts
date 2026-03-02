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

    const symbol = p.id.includes('WETH') ? p.id.replace('WETH', 'ETH') : p.id;

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
  const internalSymbol = symbol.replace('ETH', 'WETH');
  const pairs = getTradingPairs();
  return pairs.find(p => p.id === internalSymbol);
}
