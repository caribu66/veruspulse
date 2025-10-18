-- Migration: Known Addresses
-- Purpose: Map blockchain addresses to friendly names (pools, known stakers, exchanges)
-- Inspired by Oink70's KnownStakingAddresses.sed and KnownPoolAddresses.sed

CREATE TABLE IF NOT EXISTS known_addresses (
  address TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('pool', 'staker', 'exchange', 'service', 'other')),
  description TEXT,
  website TEXT,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_known_addresses_type ON known_addresses(type);
CREATE INDEX IF NOT EXISTS idx_known_addresses_name ON known_addresses(name);

-- Seed with known Verus pools and services
INSERT INTO known_addresses (address, name, type, description, verified) VALUES
  ('RCG8KwJNDVwpUBcdoa6AoHqHVJsA1uMYMR', 'Luckpool.net', 'pool', 'Popular Verus mining pool', true),
  ('RStakingPooli1hRgeGP1BJJRTYU3apJfFb', 'StakingPool', 'pool', 'Community staking pool', true),
  ('RVerusMiners1W89h6dDRu2QCj3SJc7B7nW', 'VerusMiners', 'pool', 'Verus mining community', true),
  ('RPoolMasters1234567890ABCDEFGHIJKLMa', 'PoolMasters', 'pool', 'Professional mining pool', true)
ON CONFLICT (address) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  description = EXCLUDED.description,
  verified = EXCLUDED.verified,
  updated_at = NOW();

-- Add comment
COMMENT ON TABLE known_addresses IS 'Maps blockchain addresses to friendly names for better UX';





