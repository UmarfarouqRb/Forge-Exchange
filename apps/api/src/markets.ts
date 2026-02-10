import { TRADING_PAIRS } from "./trading-pairs";

export function getMarkets() {
  return TRADING_PAIRS.map(p => ({
    id: p.id,
    symbol: `${p.base}/${p.quote}`,
    base: p.base,
    quote: p.quote,
  }));
}
