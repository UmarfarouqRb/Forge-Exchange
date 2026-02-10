
import { TradingPair } from '../../types';

let pairsBySymbol: Record<string, TradingPair> = {}
let loaded = false

export async function initTradingPairs() {
  if (loaded) return

  const res = await fetch('/api/trading-pairs')
  if (!res.ok) throw new Error('Failed to load trading pairs')

  const pairs: TradingPair[] = await res.json()

  pairsBySymbol = {}
  for (const p of pairs) {
    pairsBySymbol[p.symbol] = p
  }

  loaded = true
}

export function getTradingPair(symbol: string): TradingPair {
  const pair = pairsBySymbol[symbol]
  if (!pair) throw new Error(`Unknown trading pair: ${symbol}`)
  return pair
}

export function getAllTradingPairs() {
  return Object.values(pairsBySymbol)
}
