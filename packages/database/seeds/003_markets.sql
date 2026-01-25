INSERT INTO markets (
  id,
  symbol,
  base_token_id,
  quote_token_id,
  status
)
VALUES
  ('BTCUSDT', 'BTC/USDT', 'base:BTC', 'base:USDT', 'active'),
  ('ETHUSDT', 'ETH/USDT', 'base:ETH', 'base:USDT', 'active'),
  ('DAIUSDT', 'DAI/USDT', 'base:DAI', 'base:USDT', 'active'),
  ('SOLUSDT', 'SOL/USDT', 'base:SOL', 'base:USDT', 'active'),
  ('AEROUSDT', 'AERO/USDT', 'base:AERO', 'base:USDT', 'active')
ON CONFLICT (id) DO NOTHING;
