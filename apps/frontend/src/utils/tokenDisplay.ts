
import { Token } from "@/types";

export function getDisplaySymbol(token: Token): string {
  if (token.symbol === "WETH") return "ETH";
  return token.symbol;
}

export function getDisplaySymbolBySymbol(symbol: string): string {
  if (symbol === "WETH") return "ETH";
  // a bit of a hack, but it works for now
  if (symbol.startsWith("WETH")) return symbol.replace("WETH", "ETH");
  return symbol;
}

export function getDisplayName(token: Token): string {
  if (token.symbol === "WETH") return "Ethereum";
  return token.name;
}

export function getDisplayIcon(token: Token): string {
  if (token.symbol === "WETH") return "/icons/eth.svg";
  return `/icons/${token.symbol.toLowerCase()}.svg`;
}
