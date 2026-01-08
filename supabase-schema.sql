-- Supabase/PostgreSQL Schema for Forge Exchange
-- This script is generated based on the Drizzle ORM schema in `packages/shared-types/schema.ts`.
-- Run this in your Supabase SQL Editor to set up the database tables.

-- Enable the pgcrypto extension to generate UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- --- Tables ---

CREATE TABLE "chain" (
  "id" TEXT PRIMARY KEY
);

CREATE TABLE "users" (
  "address" TEXT PRIMARY KEY
);

CREATE TABLE "sessions" (
  "sessionKey" TEXT PRIMARY KEY,
  "expiration" BIGINT NOT NULL
);

-- Table for storing available trading pairs and their market data
CREATE TABLE "trading_pairs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "symbol" TEXT NOT NULL UNIQUE,
  "base_asset" TEXT NOT NULL,
  "quote_asset" TEXT NOT NULL,
  "current_price" DECIMAL(18, 8) NOT NULL,
  "price_change_24h" DECIMAL(10, 2) NOT NULL,
  "volume_24h" DECIMAL(18, 2) NOT NULL,
  "high_24h" DECIMAL(18, 8) NOT NULL,
  "low_24h" DECIMAL(18, 8) NOT NULL,
  "is_favorite" BOOLEAN DEFAULT false,
  "category" TEXT NOT NULL DEFAULT 'spot'
);

-- Table for storing historical market data for charts (candlesticks)
CREATE TABLE "market_data" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "symbol" TEXT NOT NULL,
  "timestamp" TIMESTAMP NOT NULL,
  "open" DECIMAL(18, 8) NOT NULL,
  "high" DECIMAL(18, 8) NOT NULL,
  "low" DECIMAL(18, 8) NOT NULL,
  "close" DECIMAL(18, 8) NOT NULL,
  "volume" DECIMAL(18, 2) NOT NULL
);

-- Table for storing user orders (both spot and futures)
CREATE TABLE "orders" (
  "id" TEXT PRIMARY KEY,
  "user" TEXT NOT NULL,
  "tokenIn" TEXT NOT NULL,
  "tokenOut" TEXT NOT NULL,
  "amountIn" TEXT NOT NULL,
  "minAmountOut" TEXT NOT NULL,
  "nonce" BIGINT NOT NULL,
  "status" TEXT NOT NULL,
  "symbol" TEXT NOT NULL,
  "side" TEXT NOT NULL,
  "price" TEXT NOT NULL,
  "amount" TEXT NOT NULL,
  "total" TEXT NOT NULL,
  "createdAt" BIGINT NOT NULL
);

-- Table for storing user asset balances
-- This acts as a cache. The ultimate source of truth is the on-chain vault.
CREATE TABLE "assets" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "wallet_address" TEXT NOT NULL,
  "asset" TEXT NOT NULL,
  "total" DECIMAL(18, 8) NOT NULL,
  "available" DECIMAL(18, 8) NOT NULL,
  "in_order" DECIMAL(18, 8) NOT NULL DEFAULT 0,
  "usd_value" DECIMAL(18, 2) NOT NULL,
  UNIQUE("wallet_address", "asset")
);

-- Table for storing user transactions (deposits, withdrawals, trades)
-- This is an immutable log built by the indexer from processed on-chain events.
CREATE TABLE "transactions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "wallet_address" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "asset" TEXT NOT NULL,
  "amount" DECIMAL(18, 8) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'completed',
  "tx_hash" TEXT,
  "timestamp" TIMESTAMP NOT NULL DEFAULT now()
);

-- --- CEX-Grade Indexer Tables ---
-- These tables are the core of our reliable, replayable, and reorg-safe indexing system.

-- Table to manage the indexer's state and progress (checkpointing).
-- This ensures the indexer knows where to resume after a restart.
CREATE TABLE "indexer_state" (
  "id" TEXT PRIMARY KEY, -- e.g., 'main_spot_indexer'
  "last_processed_block" BIGINT NOT NULL,
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Seeding the initial state. The indexer will start from this block.
-- Set this to your contract deployment block number in a real deployment.
INSERT INTO "indexer_state" ("id", "last_processed_block") VALUES ('main_spot_indexer', 0)
ON CONFLICT (id) DO NOTHING;

-- Table for storing raw, unprocessed on-chain events.
-- This provides an immutable, replayable log of everything that happens on-chain.
-- The UNIQUE constraint is the key to achieving idempotency.
CREATE TABLE "raw_onchain_events" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tx_hash" TEXT NOT NULL,
  "log_index" INTEGER NOT NULL,
  "block_number" BIGINT NOT NULL,
  "block_timestamp" TIMESTAMP WITH TIME ZONE NOT NULL,
  "contract_address" TEXT NOT NULL,
  "event_name" TEXT NOT NULL,
  "parameters" JSONB NOT NULL,
  "is_processed" BOOLEAN NOT NULL DEFAULT false, -- Tracks if the event has been applied to our state tables (e.g., 'assets')
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE("tx_hash", "log_index") -- The non-negotiable idempotency key
);


-- --- Indexes ---

CREATE INDEX "idx_market_data_symbol_timestamp" ON "market_data" ("symbol", "timestamp" DESC);
CREATE INDEX "idx_orders_user" ON "orders" ("user");
CREATE INDEX "idx_transactions_wallet_address" ON "transactions" ("wallet_address");

-- Indexes for efficient querying by the indexer processor
CREATE INDEX "idx_raw_onchain_events_block_number" ON "raw_onchain_events" ("block_number");
CREATE INDEX "idx_raw_onchain_events_is_processed" ON "raw_onchain_events" ("is_processed");

-- --- Comments ---

COMMENT ON TABLE "assets" IS 'This acts as a cache of user balances. The ultimate source of truth for funds is the on-chain vault contract.';
COMMENT ON TABLE "transactions" IS 'An immutable log of on-chain events (deposits, withdrawals) and off-chain trades, populated by the indexer.';
COMMENT ON TABLE "indexer_state" IS 'Checkpoint for the on-chain event indexer. Never trust memory for progress.';
COMMENT ON TABLE "raw_onchain_events" IS 'Immutable log of raw on-chain events. The UNIQUE constraint on tx_hash and log_index guarantees idempotency, making the system replayable and reorg-safe.';
