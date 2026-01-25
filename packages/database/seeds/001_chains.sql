INSERT INTO chains (id, name, chain_id, native_symbol)
VALUES
  ('eip155:8453', 'Base', 8453, 'ETH'),
  ('eip155:42161', 'Arbitrum', 42161, 'ETH'),
  ('eip155:10', 'Optimism', 10, 'ETH'),
  ('eip155:56', 'BNB Smart Chain', 56, 'BNB')
ON CONFLICT (id) DO NOTHING;
