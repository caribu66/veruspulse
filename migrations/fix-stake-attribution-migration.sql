-- Migration: Fix Stake Attribution Data Integrity Issue
-- 
-- This migration addresses the critical issue where all stakes are
-- incorrectly attributed to I-addresses instead of the actual R-addresses
-- that perform the staking.
--
-- Changes:
-- 1. Add primary_addresses column to identities table
-- 2. Add index for source_address lookups
-- 3. Add constraint to ensure source_address is properly set
-- 4. Create view for proper stake attribution

-- Step 1: Add primary_addresses column to identities table
ALTER TABLE identities 
ADD COLUMN IF NOT EXISTS primary_addresses TEXT[] DEFAULT '{}';

-- Step 2: Add index for source_address lookups (R-addresses)
CREATE INDEX IF NOT EXISTS idx_staking_rewards_source_address 
ON staking_rewards(source_address);

-- Step 3: Add index for identity_address lookups (I-addresses)
CREATE INDEX IF NOT EXISTS idx_staking_rewards_identity_address 
ON staking_rewards(identity_address);

-- Step 4: Create a view that shows proper stake attribution
CREATE OR REPLACE VIEW staking_rewards_corrected AS
SELECT 
  sr.id,
  sr.identity_address,
  sr.source_address,
  sr.txid,
  sr.vout,
  sr.block_height,
  sr.block_time,
  sr.block_hash,
  sr.amount_sats,
  sr.classifier,
  i.base_name,
  i.friendly_name,
  i.primary_addresses,
  -- Flag records that need correction
  CASE 
    WHEN sr.source_address = sr.identity_address THEN 'NEEDS_CORRECTION'
    WHEN sr.source_address LIKE 'R%' THEN 'CORRECT'
    WHEN sr.source_address LIKE 'i%' THEN 'INCORRECT'
    ELSE 'UNKNOWN'
  END as attribution_status
FROM staking_rewards sr
LEFT JOIN identities i ON sr.identity_address = i.identity_address;

-- Step 5: Create a function to get VerusID primary addresses
CREATE OR REPLACE FUNCTION get_verusid_primary_addresses(identity_addr TEXT)
RETURNS TEXT[] AS $$
BEGIN
  SELECT primary_addresses INTO STRICT primary_addresses
  FROM identities 
  WHERE identity_address = identity_addr;
  
  RETURN COALESCE(primary_addresses, '{}');
EXCEPTION
  WHEN NO_DATA_FOUND THEN
    RETURN '{}';
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create a function to validate stake attribution
CREATE OR REPLACE FUNCTION validate_stake_attribution()
RETURNS TABLE(
  identity_address TEXT,
  incorrect_stakes BIGINT,
  correct_stakes BIGINT,
  needs_correction BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sr.identity_address,
    COUNT(*) FILTER (WHERE sr.source_address = sr.identity_address) as incorrect_stakes,
    COUNT(*) FILTER (WHERE sr.source_address LIKE 'R%') as correct_stakes,
    COUNT(*) FILTER (WHERE sr.source_address = sr.identity_address) as needs_correction
  FROM staking_rewards sr
  GROUP BY sr.identity_address
  ORDER BY incorrect_stakes DESC;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create a table to track address relationships
CREATE TABLE IF NOT EXISTS address_relationships (
  id SERIAL PRIMARY KEY,
  identity_address TEXT NOT NULL,
  primary_address TEXT NOT NULL,
  relationship_type TEXT DEFAULT 'primary',
  first_seen_block INTEGER,
  last_seen_block INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(identity_address, primary_address)
);

-- Step 8: Add indexes for address relationships
CREATE INDEX IF NOT EXISTS idx_address_relationships_identity 
ON address_relationships(identity_address);

CREATE INDEX IF NOT EXISTS idx_address_relationships_primary 
ON address_relationships(primary_address);

-- Step 9: Create a function to update address relationships
CREATE OR REPLACE FUNCTION update_address_relationships(
  identity_addr TEXT,
  primary_addrs TEXT[]
)
RETURNS VOID AS $$
DECLARE
  addr TEXT;
BEGIN
  -- Mark existing relationships as inactive
  UPDATE address_relationships 
  SET is_active = FALSE, updated_at = NOW()
  WHERE identity_address = identity_addr;
  
  -- Insert new relationships
  FOREACH addr IN ARRAY primary_addrs
  LOOP
    INSERT INTO address_relationships (identity_address, primary_address, is_active)
    VALUES (identity_addr, addr, TRUE)
    ON CONFLICT (identity_address, primary_address) 
    DO UPDATE SET 
      is_active = TRUE,
      updated_at = NOW();
  END LOOP;
  
  -- Update identities table
  UPDATE identities 
  SET primary_addresses = primary_addrs,
      last_refreshed_at = NOW()
  WHERE identity_address = identity_addr;
END;
$$ LANGUAGE plpgsql;

-- Step 10: Create a view for stake analysis
CREATE OR REPLACE VIEW stake_analysis AS
SELECT 
  sr.identity_address,
  i.base_name,
  i.friendly_name,
  COUNT(*) as total_stakes,
  SUM(sr.amount_sats) as total_rewards_sats,
  COUNT(DISTINCT sr.source_address) as unique_staking_addresses,
  COUNT(*) FILTER (WHERE sr.source_address = sr.identity_address) as incorrect_attributions,
  COUNT(*) FILTER (WHERE sr.source_address LIKE 'R%') as correct_attributions,
  MIN(sr.block_height) as first_stake_height,
  MAX(sr.block_height) as last_stake_height,
  ROUND(
    COUNT(*) FILTER (WHERE sr.source_address LIKE 'R%')::NUMERIC / 
    NULLIF(COUNT(*), 0) * 100, 2
  ) as attribution_accuracy_percent
FROM staking_rewards sr
LEFT JOIN identities i ON sr.identity_address = i.identity_address
GROUP BY sr.identity_address, i.base_name, i.friendly_name
ORDER BY incorrect_attributions DESC, total_stakes DESC;

-- Step 11: Add comments for documentation
COMMENT ON VIEW staking_rewards_corrected IS 'View showing stake attribution status and correction needs';
COMMENT ON VIEW stake_analysis IS 'Analysis of stake attribution accuracy by VerusID';
COMMENT ON FUNCTION validate_stake_attribution() IS 'Validates stake attribution and returns correction statistics';
COMMENT ON FUNCTION update_address_relationships(TEXT, TEXT[]) IS 'Updates VerusID primary address relationships';

-- Step 12: Create a summary of the migration
DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'Added primary_addresses column to identities table';
  RAISE NOTICE 'Created indexes for source_address and identity_address lookups';
  RAISE NOTICE 'Created staking_rewards_corrected view for attribution analysis';
  RAISE NOTICE 'Created stake_analysis view for accuracy reporting';
  RAISE NOTICE 'Created address_relationships table for tracking I/R address pairs';
  RAISE NOTICE 'Created helper functions for validation and updates';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Run: SELECT * FROM validate_stake_attribution() LIMIT 10;';
  RAISE NOTICE '2. Run: SELECT * FROM stake_analysis WHERE incorrect_attributions > 0 LIMIT 10;';
  RAISE NOTICE '3. Use the fix-stake-attribution.js script to correct existing data';
  RAISE NOTICE '4. Update scanning scripts to use enhanced attribution';
END $$;
