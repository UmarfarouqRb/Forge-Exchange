-- 002_tokens.sql
INSERT INTO tokens (
  id,
  chain_id,
  symbol,
  name,
  decimals,
  address
)
VALUES
  ('base:ETH', 'eip155:8453', 'ETH', 'Ethereum', 18, NULL), -- Native token has NULL address
  ('base:WETH', 'eip155:8453', 'WETH', 'Wrapped Ether', 18, '0x4200000000000000000000000000000000000006'),
  ('base:USDC', 'eip155:8453', 'USDC', 'USD Coin', 6, '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'),
  ('base:USDT', 'eip155:8453', 'USDT', 'USD Tether', 6, '0xfdeA615043833213F3423b4934414065654C54Fe'),
  ('base:DAI', 'eip155:8453', 'DAI', 'Dai Stablecoin', 18, '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'),
  ('base:cbBTC', 'eip155:8453', 'cbBTC', 'Coinbase Wrapped BTC', 8, '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf'),
  ('base:AERO', 'eip155:8453', 'AERO', 'Aerodrome Finance', 18, '0x940181a94A35A4569E4529A3CDfB74e38FD98631'),
  ('base:TRUMP', 'eip155:8453', 'TRUMP', 'MAGA', 18, '0xc27468b12ffA6d714B1b5fBC87eF403F38b82AD4'),
  ('base:SOL', 'eip155:8453', 'SOL', 'Solana', 9, '0x311935Cd80B76769bF2ecC9D8Ab7635b2139cf82'),
  ('optimism:ETH', 'eip155:10', 'ETH', 'Ethereum', 18, NULL),
  ('optimism:USDC', 'eip155:10', 'USDC', 'USD Coin', 6, '0x7F5c764cBc14f9669B88837ca1490cCa17c31607'),
  ('bnb:BNB', 'eip155:56', 'BNB', 'BNB', 18, NULL),
  ('bnb:USDC', 'eip155:56', 'USDC', 'USD Coin', 18, '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d')
ON CONFLICT (id) DO NOTHING;
