
import { Token, TOKENS } from "./token";

/**
 * Converts settlement tokens into display tokens.
 * NEVER used for execution.
 */
export function toDisplayToken(token: Token): Token {
  // WETH should appear as ETH in UI
  if (token.id === "WETH") {
    return TOKENS.ETH;
  }

  return token;
}
