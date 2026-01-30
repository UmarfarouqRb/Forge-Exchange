
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
export { eq } from 'drizzle-orm';


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
    userAddress: text('user_address').notNull(),
    tradingPairId: uuid('trading_pair_id').references(() => tradingPairs.id),
    side: text('side', { enum: ['buy', 'sell'] }).notNull(),
    price: numeric('price').notNull(),
    quantity: numeric('quantity').notNull(),
    filledQuantity: numeric('filled_quantity').default('0'),
    status: text('status', { enum: ['open', 'filled', 'cancelled'] }).default('open'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const markets = pgTable('markets', {
    tradingPairId: uuid('trading_pair_id').primaryKey().references(() => tradingPairs.id),
    lastPrice: numeric('last_price'),
    volume24h: numeric('volume_24h').default('0'),
    high24h: numeric('high_24h'),
    low24h: numeric('low_24h'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
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

