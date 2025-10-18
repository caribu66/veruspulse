-- Migration: Add primary_addresses column to identities table
-- This allows caching of primary addresses to avoid RPC calls

-- Add primary_addresses column as JSONB to store array of addresses
ALTER TABLE identities 
ADD COLUMN IF NOT EXISTS primary_addresses JSONB DEFAULT '[]'::jsonb;

-- Add index for efficient queries on primary_addresses
CREATE INDEX IF NOT EXISTS idx_identities_primary_addresses 
ON identities USING GIN (primary_addresses);

-- Add comment to document the column
COMMENT ON COLUMN identities.primary_addresses IS 'Array of primary addresses associated with this VerusID, stored as JSONB';








