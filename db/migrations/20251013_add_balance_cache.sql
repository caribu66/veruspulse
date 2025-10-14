-- Address balance cache table
-- Stores balance, received, and sent amounts for each address
-- with timestamp for cache invalidation (5 minute TTL)

CREATE TABLE IF NOT EXISTS address_balances (
  address TEXT PRIMARY KEY,
  balance BIGINT NOT NULL,      -- Balance in satoshis
  received BIGINT NOT NULL,     -- Total received in satoshis
  sent BIGINT NOT NULL,          -- Total sent in satoshis
  cached_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for quick lookup and cache invalidation
CREATE INDEX IF NOT EXISTS ix_balance_cached_at ON address_balances(cached_at DESC);

-- Function to clean up old cache entries (older than 10 minutes)
CREATE OR REPLACE FUNCTION cleanup_old_balances() RETURNS void AS $$
BEGIN
  DELETE FROM address_balances WHERE cached_at < NOW() - INTERVAL '10 minutes';
END;
$$ LANGUAGE plpgsql;


