
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

// --- ✅ FINAL EXCHANGE SCHEMA (LOCKED) ---

// This schema is a direct 1-to-1 mapping of the SQL script you executed.
// It uses `text({ enum: [...] })` to match the `text CHECK(...)` constraints in SQL,
// preventing Drizzle from trying to create new ENUM types.

// 1. tokens
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

// 2. trading_pairs
export const tradingPairs = pgTable('trading_pairs', {
    id: uuid('id').primaryKey().defaultRandom(),
    baseTokenId: uuid('base_token_id').references(() => tokens.id),
    quoteTokenId: uuid('quote_token_id').references(() => tokens.id),
    symbol: text('symbol').notNull().unique('trading_pairs_symbol_key'),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// 3. orders
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

// 4. order_books
export const orderBooks = pgTable('order_books', {
    tradingPairId: uuid('trading_pair_id').references(() => tradingPairs.id).notNull(),
    side: text('side', { enum: ['buy', 'sell'] }).notNull(),
    price: numeric('price').notNull(),
    quantity: numeric('quantity').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
    pk: primaryKey({ columns: [table.tradingPairId, table.side, table.price] }),
}));

// 5. trades
export const trades = pgTable('trades', {
    id: uuid('id').primaryKey().defaultRandom(),
    tradingPairId: uuid('trading_pair_id').references(() => tradingPairs.id),
    price: numeric('price').notNull(),
    quantity: numeric('quantity').notNull(),
    makerOrderId: uuid('maker_order_id'), // Can be null
    takerOrderId: uuid('taker_order_id'), // Can be null
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// 6. markets
export const markets = pgTable('markets', {
    tradingPairId: uuid('trading_pair_id').primaryKey().references(() => tradingPairs.id),
    lastPrice: numeric('last_price'),
    volume24h: numeric('volume_24h').default('0'),
    high24h: numeric('high_24h'),
    low24h: numeric('low_24h'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export type Order = InferModel<typeof orders, 'insert'>;
