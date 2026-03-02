import { TOKENS } from "./token";

export function getTokens() {
  return Object.values(TOKENS).filter((token) => token.symbol !== 'WETH');
}
