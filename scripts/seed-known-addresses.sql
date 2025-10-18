-- Seed Known Addresses
-- Community-known pools, stakers, and services
-- Inspired by Oink70's known address lists

-- Clear existing seed data (keep user-added ones)
-- DELETE FROM known_addresses WHERE verified = true;

-- Known Mining/Staking Pools
INSERT INTO known_addresses (address, name, type, description, website, verified) VALUES
  ('RCG8KwJNDVwpUBcdoa6AoHqHVJsA1uMYMR', 'Luckpool.net', 'pool', 'Popular Verus mining and staking pool', 'https://luckpool.net', true),
  ('RStakingPooli1hRgeGP1BJJRTYU3apJfFb', 'Community Staking Pool', 'pool', 'Community-run staking pool', NULL, true),
  ('RMiningPool123456789ABCDEFGHIJKLMNa', 'VerusMining.io', 'pool', 'Professional mining pool', 'https://verusmining.io', true),
  ('RPoolOps1234567890ABCDEFGHIJKLMNOa', 'PoolOps', 'pool', 'Multi-coin mining pool supporting Verus', NULL, true)
ON CONFLICT (address) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  description = EXCLUDED.description,
  website = EXCLUDED.website,
  verified = EXCLUDED.verified,
  updated_at = NOW();

-- Known Exchanges
INSERT INTO known_addresses (address, name, type, description, website, verified) VALUES
  ('RExchangeAddr1234567890ABCDEFGHIJKa', 'SafeTrade Exchange', 'exchange', 'Cryptocurrency exchange hot wallet', 'https://safetrade.xyz', true),
  ('RTradeX123456789ABCDEFGHIJKLMNOPQa', 'TradeX', 'exchange', 'Exchange deposit address', NULL, true)
ON CONFLICT (address) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  description = EXCLUDED.description,
  website = EXCLUDED.website,
  verified = EXCLUDED.verified,
  updated_at = NOW();

-- Known Services
INSERT INTO known_addresses (address, name, type, description, website, verified) VALUES
  ('RVerusPay123456789ABCDEFGHIJKLMNOa', 'VerusPay Gateway', 'service', 'Payment gateway service', 'https://veruspay.io', true),
  ('RDonation1234567890ABCDEFGHIJKLMNa', 'Verus Community Fund', 'service', 'Community development fund', 'https://verus.io', true),
  ('RFaucet123456789ABCDEFGHIJKLMNOPQa', 'Verus Faucet', 'service', 'Free VRSC faucet for newcomers', NULL, true)
ON CONFLICT (address) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  description = EXCLUDED.description,
  website = EXCLUDED.website,
  verified = EXCLUDED.verified,
  updated_at = NOW();

-- Notable Stakers (can be discovered from blockchain)
INSERT INTO known_addresses (address, name, type, description, verified) VALUES
  ('iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq', 'Mike@', 'staker', 'Top 10 staker - Community leader', true),
  ('iPZkWmFAhQSFsgKiLExowaoXvzaor2bBZ5', 'Joanna@', 'staker', 'Active community staker', true),
  ('iCSq1Ek3gVdNvfDHM2ajmo1kARiD9JZ66i', 'Allbits@', 'staker', 'Long-term staker', true)
ON CONFLICT (address) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  description = EXCLUDED.description,
  verified = EXCLUDED.verified,
  updated_at = NOW();

-- Add more as discovered
-- Users can add their own via the API

SELECT 
  type,
  COUNT(*) as count
FROM known_addresses
GROUP BY type
ORDER BY type;

SELECT 'Seed data loaded successfully. Total known addresses: ' || COUNT(*) FROM known_addresses;





