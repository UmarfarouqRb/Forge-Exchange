
import {
  pgTable,
  uuid,
  integer,
  text,
  timestamp,
  boolean,
  numeric,
  unique,
  primaryKey,
} from 'drizzle-orm/pg-core';
import type { InferModel } from 'drizzle-orm';
// Re-export the 'eq' operator to be used throughout the monorepo
export { eq, or } from 'drizzle-orm';


// --- SCHEMA DEFINITIONS ---

export const tokens = pgTable('tokens', {
    id: uuid('id').primaryKey().defaultRandom(),
    chainId: integer('chain_id').notNull(),
    address: text('address').notNull(),
    symbol: text('symbol').notNull(),
    name: text('name'),
    decimals: integer('decimals').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
    unique_chain_address: unique('tokens_chain_id_address_key').on(table.chainId, table.address),
}));

export const tradingPairs = pgTable('trading_pairs', {
    id: uuid('id').primaryKey().defaultRandom(),
    baseTokenId: uuid('base_token_id').references(() => tokens.id),
    quoteTokenId: uuid('quote_token_id').references(() => tokens.id),
    symbol: text('symbol').notNull().unique('trading_pairs_symbol_key'),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const orders = pgTable('orders', {
    id: uuid('id').primaryKey().defaultRandom(),
    intentId: text('intent_id').unique(),
    userAddress: text('user_address').notNull(),
    tradingPairId: uuid('trading_pair_id').references(() => tradingPairs.id).notNull(),
    side: text('side', { enum: ['buy', 'sell'] }).notNull(),
    price: numeric('price'),
    quantity: numeric('quantity').notNull(),
    filledQuantity: numeric('filled_quantity').default('0'),
    status: text('status', {
      enum: ['open', 'filled', 'cancelled', 'pending', 'processing', 'partial', 'failed', 'matching']
    }).default('open'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    orderType: text('order_type', { enum: ['market', 'limit'] }).notNull(),
    signature: text('signature').notNull(),
    tokenIn: text('token_in').notNull(),
    tokenOut: text('token_out').notNull(),
    amountIn: text('amount_in').notNull(),
    minAmountOut: text('min_amount_out').notNull(),
    deadline: text('deadline').notNull(),
    nonce: text('nonce').notNull(),
    adapter: text('adapter').notNull(),
    relayerFee: text('relayer_fee').notNull(),
    retryCount: integer('retry_count').default(0),
    lastError: text('last_error'),
    lastAttemptAt: timestamp('last_attempt_at', { withTimezone: true }),
});

export const markets = pgTable('markets', {
    tradingPairId: uuid('trading_pair_id').primaryKey().references(() => tradingPairs.id),
    lastPrice: numeric('last_price'),
    volume24h: numeric('volume_24h').default('0'),
    high24h: numeric('high_24h'),
    low24h: numeric('low_24h'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const trade_executions = pgTable('trade_executions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tx_hash: text('tx_hash'),
  user_address: text('user_address'),
  token_in: text('token_in'),
  token_out: text('token_out'),
  amount_in: numeric('amount_in'),
  amount_out: numeric('amount_out'),
  amount_usd: numeric('amount_usd'),
  protocol_fee: numeric('protocol_fee'),
  relayer_fee: numeric('relayer_fee'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const tvl_snapshots = pgTable('tvl_snapshots', {
  id: uuid('id').primaryKey().defaultRandom(),
  tvl_usd: numeric('tvl_usd'),
  timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow(),
});

// --- TYPE INFERENCE ---
// This creates TypeScript types from your schema, ensuring type safety.

export type Token = InferModel<typeof tokens>;
export type InsertToken = InferModel<typeof tokens, 'insert'>;

export type TradingPair = InferModel<typeof tradingPairs>;
export type InsertTradingPair = InferModel<typeof tradingPairs, 'insert'>;

export type Order = InferModel<typeof orders>;
export type InsertOrder = InferModel<typeof orders, 'insert'>;

export type Market = InferModel<typeof markets>;
export type InsertMarket = InferModel<typeof markets, 'insert'>;

export type TradeExecution = InferModel<typeof trade_executions>;
export type InsertTradeExecution = InferModel<typeof trade_executions, 'insert'>;

export type TvlSnapshot = InferModel<typeof tvl_snapshots>;
export type InsertTvlSnapshot = InferModel<typeof tvl_snapshots, 'insert'>;
