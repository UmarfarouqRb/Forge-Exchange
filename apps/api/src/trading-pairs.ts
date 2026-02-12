
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

export const TRADING_PAIRS: TradingPair[] = rawPairs.map((p) => ({
  id: p.id,
  base: TOKENS[p.base],
  quote: TOKENS[p.quote],
  symbol: `${p.base}/${p.quote}`,
}));

export function getTradingPairs(): TradingPair[] {
  return TRADING_PAIRS;
}

export function getTradingPairBySymbol(symbol: string): TradingPair | undefined {
  return TRADING_PAIRS.find(p => p.symbol === symbol);
}
