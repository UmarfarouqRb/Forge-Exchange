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

-- STEP 2: CREATE CANONICAL TABLES (DO NOT MODIFY LATER)

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
  user_address text NOT NULL,
  trading_pair_id uuid REFERENCES trading_pairs(id),
  side text CHECK (side IN ('buy','sell')) NOT NULL,
  price numeric NOT NULL,
  quantity numeric NOT NULL,
  filled_quantity numeric DEFAULT 0,
  status text CHECK (status IN ('open','filled','cancelled')) DEFAULT 'open',
  created_at timestamptz DEFAULT now()
);

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

-- STEP 3: SEED BASE DATA
INSERT INTO tokens (chain_id, address, symbol, name, decimals)
VALUES
(8453, '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', 'ETH', 'Ether', 18),
(8453, '0xdac17f958d2ee523a2206206994597c13d831ec7', 'USDT', 'Tether', 6);

INSERT INTO trading_pairs (base_token_id, quote_token_id, symbol)
SELECT t1.id, t2.id, 'ETHUSDT'
FROM tokens t1, tokens t2
WHERE t1.symbol='ETH' AND t2.symbol='USDT';

INSERT INTO markets (trading_pair_id)
SELECT id FROM trading_pairs;

