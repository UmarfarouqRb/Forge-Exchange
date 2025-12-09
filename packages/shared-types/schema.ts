import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Trading Pairs
export const tradingPairs = pgTable("trading_pairs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  symbol: text("symbol").notNull().unique(), // e.g., "BTCUSDT"
  baseAsset: text("base_asset").notNull(), // e.g., "BTC"
  quoteAsset: text("quote_asset").notNull(), // e.g., "USDT"
  currentPrice: decimal("current_price", { precision: 18, scale: 8 }).notNull(),
  priceChange24h: decimal("price_change_24h", { precision: 10, scale: 2 }).notNull(),
  volume24h: decimal("volume_24h", { precision: 18, scale: 2 }).notNull(),
  high24h: decimal("high_24h", { precision: 18, scale: 8 }).notNull(),
  low24h: decimal("low_24h", { precision: 18, scale: 8 }).notNull(),
  isFavorite: boolean("is_favorite").default(false),
  category: text("category").notNull().default("spot"), // "spot" or "futures"
});

// Market Data (historical prices for charts)
export const marketData = pgTable("market_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  symbol: text("symbol").notNull(),
  timestamp: timestamp("timestamp").notNull(),
  open: decimal("open", { precision: 18, scale: 8 }).notNull(),
  high: decimal("high", { precision: 18, scale: 8 }).notNull(),
  low: decimal("low", { precision: 18, scale: 8 }).notNull(),
  close: decimal("close", { precision: 18, scale: 8 }).notNull(),
  volume: decimal("volume", { precision: 18, scale: 2 }).notNull(),
});

// Orders (Spot and Futures)
export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: text("wallet_address").notNull(),
  symbol: text("symbol").notNull(),
  orderType: text("order_type").notNull(), // "market" or "limit"
  side: text("side").notNull(), // "buy" or "sell"
  price: decimal("price", { precision: 18, scale: 8 }),
  amount: decimal("amount", { precision: 18, scale: 8 }).notNull(),
  total: decimal("total", { precision: 18, scale: 8 }).notNull(),
  status: text("status").notNull().default("pending"), // "pending", "filled", "cancelled"
  category: text("category").notNull().default("spot"), // "spot" or "futures"
  leverage: integer("leverage").default(1),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Assets (User wallet balances)
export const assets = pgTable("assets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: text("wallet_address").notNull(),
  asset: text("asset").notNull(),
  total: decimal("total", { precision: 18, scale: 8 }).notNull(),
  available: decimal("available", { precision: 18, scale: 8 }).notNull(),
  inOrder: decimal("in_order", { precision: 18, scale: 8 }).notNull().default("0"),
  usdValue: decimal("usd_value", { precision: 18, scale: 2 }).notNull(),
});

// Transactions
export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: text("wallet_address").notNull(),
  type: text("type").notNull(), // "deposit", "withdrawal", "trade"
  asset: text("asset").notNull(),
  amount: decimal("amount", { precision: 18, scale: 8 }).notNull(),
  status: text("status").notNull().default("completed"), // "pending", "completed", "failed"
  txHash: text("tx_hash"),
  timestamp: timestamp("timestamp").notNull().default(sql`now()`),
});

// Insert schemas
export const insertTradingPairSchema = createInsertSchema(tradingPairs).omit({ id: true });
export const insertMarketDataSchema = createInsertSchema(marketData).omit({ id: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true });
export const insertAssetSchema = createInsertSchema(assets).omit({ id: true });
export const insertTransactionSchema = createInsertSchema(transactions).omit({ id: true, timestamp: true });

// Types
export type InsertTradingPair = z.infer<typeof insertTradingPairSchema>;
export type TradingPair = typeof tradingPairs.$inferSelect;

export type InsertMarketData = z.infer<typeof insertMarketDataSchema>;
export type MarketData = typeof marketData.$inferSelect;

export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

export type InsertAsset = z.infer<typeof insertAssetSchema>;
export type Asset = typeof assets.$inferSelect;

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;

// Wallet connection state (frontend only)
export type WalletState = {
  address: string | null;
  isConnected: boolean;
  chainId: number | null;
};
