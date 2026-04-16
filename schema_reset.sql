-- STEP 1: DROP ALL OLD TABLES FOR A CLEAN SLATE
-- Dropping all tables from your plan and our previous attempts.
DROP TABLE IF EXISTS trades CASCADE;
DROP TABLE IF EXISTS order_books CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS markets CASCADE;
DROP TABLE IF EXISTS trading_pairs CASCADE;
DROP TABLE IF EXISTS tokens CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS assets CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS chain CASCADE;
DROP TABLE IF EXISTS indexer_state CASCADE;
DROP TABLE IF EXISTS raw_onchain_events CASCADE;
DROP TABLE IF EXISTS user_points CASCADE;
DROP TABLE IF EXISTS point_events CASCADE;
DROP TABLE IF EXISTS invite_codes CASCADE;


-- STEP 2: CREATE CANONICAL TABLES (DO NOT MODIFY LATER)

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- users table
CREATE TABLE public.users (
  id uuid NOT NULL,
  wallet_address text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_wallet_address_key UNIQUE (wallet_address),
  CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Add a trigger to update the updated_at column on the users table
CREATE TRIGGER set_users_timestamp
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- tokens table
CREATE TABLE tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chain_id int NOT NULL,
  address text NOT NULL,
  symbol text NOT NULL,
  name text,
  decimals int NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (chain_id, address)
);

-- trading_pairs table
CREATE TABLE trading_pairs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  base_token_id uuid REFERENCES tokens(id),
  quote_token_id uuid REFERENCES tokens(id),
  symbol text NOT NULL UNIQUE,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- orders table
CREATE TABLE orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    intent_id TEXT UNIQUE,
    user_address TEXT NOT NULL,
    trading_pair_id UUID NOT NULL REFERENCES trading_pairs(id),
    side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
    price NUMERIC,
    quantity NUMERIC NOT NULL,
    filled_quantity NUMERIC DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'filled', 'cancelled', 'pending', 'processing', 'partial', 'failed', 'matching')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    order_type TEXT NOT NULL CHECK (order_type IN ('market', 'limit')),
    signature TEXT NOT NULL,
    token_in TEXT NOT NULL,
    token_out TEXT NOT NULL,
    amount_in TEXT NOT NULL,
    min_amount_out TEXT NOT NULL,
    deadline TEXT NOT NULL,
    nonce TEXT NOT NULL,
    adapter TEXT NOT NULL,
    relayer_fee TEXT NOT NULL,
    retry_count integer DEFAULT 0,
    last_error text,
    last_attempt_at timestamp with time zone
);

-- Add indexes to orders table
CREATE INDEX idx_orders_user ON orders(user_address);
CREATE INDEX idx_orders_pair ON orders(trading_pair_id);
CREATE INDEX idx_orders_status ON orders(status);


-- order_books table
CREATE TABLE order_books (
  trading_pair_id uuid REFERENCES trading_pairs(id),
  side text CHECK (side IN ('buy','sell')),
  price numeric NOT NULL,
  quantity numeric NOT NULL,
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (trading_pair_id, side, price)
);

-- trades table
CREATE TABLE trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trading_pair_id uuid REFERENCES trading_pairs(id),
  price numeric NOT NULL,
  quantity numeric NOT NULL,
  maker_order_id uuid,
  taker_order_id uuid,
  created_at timestamptz DEFAULT now()
);

-- markets table
CREATE TABLE markets (
  trading_pair_id uuid PRIMARY KEY REFERENCES trading_pairs(id),
  last_price numeric,
  volume_24h numeric DEFAULT 0,
  high_24h numeric,
  low_24h numeric,
  updated_at timestamptz DEFAULT now()
);

-- user_points table
CREATE TABLE public.user_points (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  total_points integer NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_points_pkey PRIMARY KEY (id),
  CONSTRAINT user_points_user_id_key UNIQUE (user_id)
);

-- Add a trigger to update the updated_at column on UserPoints table
CREATE TRIGGER set_user_points_timestamp
BEFORE UPDATE ON public.user_points
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- point_events table
CREATE TABLE public.point_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  event_type text NOT NULL,
  points_awarded integer NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT point_events_pkey PRIMARY KEY (id)
);

-- invite_codes table
CREATE TABLE public.invite_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL,
  is_used boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  used_by_user_id text,
  CONSTRAINT invite_codes_pkey PRIMARY KEY (id),
  CONSTRAINT invite_codes_code_key UNIQUE (code)
);


-- STEP 3: SEED BASE DATA
INSERT INTO tokens (chain_id, address, symbol, name, decimals)
VALUES
(84532, '0x4200000000000000000000000000000000000006', 'WETH', 'Wrapped Ether', 18),
(84532, '0x036CbD53842c5426634e7929541eC2318f3dCF7e', 'USDC', 'USD Coin', 6),
(84532, '0xcbB7C0006F23900c38EB856149F799620fcb8A4a', 'BTC', 'Coinbase Wrapped BTC', 8),
(84532, '0x808456652fdb597867f38412077A9182bf77359F', 'EURC', 'Euro Coin', 6);

INSERT INTO trading_pairs (base_token_id, quote_token_id, symbol)
SELECT t1.id, t2.id, 'WETHUSDC'
FROM tokens t1, tokens t2
WHERE t1.symbol='WETH' AND t2.symbol='USDC' AND t1.chain_id = 84532 AND t2.chain_id = 84532;

INSERT INTO trading_pairs (base_token_id, quote_token_id, symbol)
SELECT t1.id, t2.id, 'BTCUSDC'
FROM tokens t1, tokens t2
WHERE t1.symbol='BTC' AND t2.symbol='USDC' AND t1.chain_id = 84532 AND t2.chain_id = 84532;

INSERT INTO trading_pairs (base_token_id, quote_token_id, symbol)
SELECT t1.id, t2.id, 'EURCUSDC'
FROM tokens t1, tokens t2
WHERE t1.symbol='EURC' AND t2.symbol='USDC' AND t1.chain_id = 84532 AND t2.chain_id = 84532;

INSERT INTO markets (trading_pair_id)
SELECT id FROM trading_pairs;


CREATE OR REPLACE FUNCTION fetch_and_lock_orders() RETURNS TABLE (LIKE orders) AS $$
BEGIN
    RETURN QUERY
    WITH locked AS (
        SELECT id FROM orders
        WHERE status IN ('pending', 'processing') AND order_type = 'limit'
        FOR UPDATE SKIP LOCKED
    )
    UPDATE orders
    SET status = 'matching'
    WHERE id IN (SELECT id FROM locked)
    RETURNING *;
END; $$ LANGUAGE plpgsql;