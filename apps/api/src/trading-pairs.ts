import { TOKENS } from "./token";

export type TradingPair = {
  id: string;
  base: string;
  quote: string;
};

export const TRADING_PAIRS: TradingPair[] = [
  {
    id: "BTC-USDC",
    base: TOKENS.BTC.symbol,
    quote: TOKENS.USDC.symbol,
  },
  {
    id: "ETH-USDC",
    base: TOKENS.WETH.symbol,
    quote: TOKENS.USDC.symbol,
  },
  {
    id: "AERO-WETH",
    base: TOKENS.AERO.symbol,
    quote: TOKENS.WETH.symbol,
  },
  {
    id: "TRUMP-WETH",
    base: TOKENS.TRUMP.symbol,
    quote: TOKENS.WETH.symbol,
  },
  {
    id: "DAI-USDC",
    base: TOKENS.DAI.symbol,
    quote: TOKENS.USDC.symbol,
  },
  {
    id: "USDT-USDC",
    base: TOKENS.USDT.symbol,
    quote: TOKENS.USDC.symbol,
  },
];
