import { z } from 'zod';

export const Order = z.object({
  id: z.string(),
  user: z.string(),
  pair: z.string(),
  side: z.enum(['buy', 'sell']),
  type: z.enum(['limit', 'market']),
  price: z.string(),
  amount: z.string(),
  filled: z.string(),
  status: z.enum(['open', 'filled', 'canceled']),
  createdAt: z.string(),
  symbol: z.string(),
  total: z.string(),
  leverage: z.string().optional(),
});

export const InsertOrder = Order.omit({ id: true, status: true, filled: true, createdAt: true });

export const TradingPair = z.object({
  id: z.string(),
  symbol: z.string(),
  baseAsset: z.string(),
  quoteAsset: z.string(),
  currentPrice: z.string(),
  priceChange24h: z.string(),
  volume24h: z.string(),
  high24h: z.string(),
  low24h: z.string(),
  isFavorite: z.boolean(),
  category: z.string(),
});

export const InsertTradingPair = TradingPair.omit({ id: true });

export const MarketData = z.object({
  id: z.string(),
  symbol: z.string(),
  timestamp: z.date(),
  open: z.string(),
  high: z.string(),
  low: z.string(),
  close: z.string(),
  volume: z.string(),
});

export const InsertMarketData = MarketData.omit({ id: true });

export const Asset = z.object({
  id: z.string(),
  walletAddress: z.string(),
  asset: z.string(),
  total: z.string(),
  available: z.string(),
  inOrder: z.string(),
  usdValue: z.string(),
});

export const InsertAsset = Asset.omit({ id: true });

export const Transaction = z.object({
  id: z.string(),
  walletAddress: z.string(),
  type: z.string(),
  asset: z.string(),
  amount: z.string(),
  status: z.string(),
  txHash: z.string().nullable(),
  timestamp: z.string(),
});

export const InsertTransaction = Transaction.omit({ id: true });

export type Order = z.infer<typeof Order>;
export type InsertOrder = z.infer<typeof InsertOrder>;
export type TradingPair = z.infer<typeof TradingPair>;
export type InsertTradingPair = z.infer<typeof InsertTradingPair>;
export type MarketData = z.infer<typeof MarketData>;
export type InsertMarketData = z.infer<typeof InsertMarketData>;
export type Asset = z.infer<typeof Asset>;
export type InsertAsset = z.infer<typeof InsertAsset>;
export type Transaction = z.infer<typeof Transaction>;
export type InsertTransaction = z.infer<typeof InsertTransaction>;
