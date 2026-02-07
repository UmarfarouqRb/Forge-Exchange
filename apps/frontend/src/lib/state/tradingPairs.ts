
import { TradingPair } from '../../types';

let pairsById: Record<string, TradingPair> = {}
let loaded = false

export async function initTradingPairs() {
  if (loaded) return

  const res = await fetch('/api/trading-pairs')
  if (!res.ok) throw new Error('Failed to load trading pairs')

  const pairs: TradingPair[] = await res.json()

  for (const p of pairs) {
    pairsById[p.id] = p
  }

  loaded = true
}

export function getTradingPair(id: string): TradingPair {
  const pair = pairsById[id]
  if (!pair) throw new Error(`Unknown trading pair: ${id}`)
  return pair
}

export function getAllTradingPairs() {
  return Object.values(pairsById)
}
