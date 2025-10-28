-- Add Stake Amount Tracking to Staking Rewards
-- This migration adds columns to track actual staked amounts for accurate APY calculation

-- Add stake_amount_sats column to staking_rewards table
ALTER TABLE staking_rewards 
ADD COLUMN IF NOT EXISTS stake_amount_sats BIGINT DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN staking_rewards.stake_amount_sats IS 
  'Actual amount staked (in satoshis) to earn this reward. NULL if not yet extracted.';

-- Add index for queries that filter by stake amount availability
CREATE INDEX IF NOT EXISTS idx_staking_rewards_stake_amount 
ON staking_rewards(stake_amount_sats) 
WHERE stake_amount_sats IS NOT NULL;

-- Add index for identity + stake amount queries
CREATE INDEX IF NOT EXISTS idx_staking_rewards_identity_stake_amount
ON staking_rewards(identity_address, stake_amount_sats)
WHERE stake_amount_sats IS NOT NULL;

-- Add columns to verusid_statistics to track APY calculation quality
ALTER TABLE verusid_statistics 
ADD COLUMN IF NOT EXISTS apy_calculation_method VARCHAR(20) DEFAULT 'estimated',
ADD COLUMN IF NOT EXISTS stakes_with_real_amounts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS avg_stake_amount_vrsc DECIMAL(20,8) DEFAULT NULL;

-- Add comments for new tracking columns
COMMENT ON COLUMN verusid_statistics.apy_calculation_method IS 
  'Method used for APY calculation: "actual" (from real stake amounts), "estimated" (approximated), or "hybrid"';

COMMENT ON COLUMN verusid_statistics.stakes_with_real_amounts IS 
  'Number of stakes with actual stake_amount_sats data extracted';

COMMENT ON COLUMN verusid_statistics.avg_stake_amount_vrsc IS 
  'Average amount staked per stake (in VRSC), calculated from actual stake amounts';

-- Create a view to easily see APY calculation quality across all VerusIDs
CREATE OR REPLACE VIEW verusid_apy_quality AS
SELECT 
  address,
  friendly_name,
  total_stakes,
  stakes_with_real_amounts,
  CASE 
    WHEN total_stakes > 0 
    THEN ROUND((stakes_with_real_amounts::DECIMAL / total_stakes * 100), 1)
    ELSE 0
  END as data_completeness_pct,
  apy_calculation_method,
  apy_all_time,
  avg_stake_amount_vrsc,
  last_calculated
FROM verusid_statistics
WHERE total_stakes > 0
ORDER BY stakes_with_real_amounts DESC;

-- Grant access to the view
COMMENT ON VIEW verusid_apy_quality IS 
  'Shows APY calculation quality and data completeness for all VerusIDs';

-- Create function to update statistics when stake amounts are added
CREATE OR REPLACE FUNCTION update_verusid_stake_statistics(target_address VARCHAR)
RETURNS TABLE(
  total_stakes INTEGER,
  stakes_with_amounts INTEGER,
  avg_stake_amount BIGINT,
  data_completeness_pct DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_stakes,
    COUNT(*) FILTER (WHERE stake_amount_sats IS NOT NULL)::INTEGER as stakes_with_amounts,
    AVG(stake_amount_sats)::BIGINT as avg_stake_amount,
    CASE 
      WHEN COUNT(*) > 0 
      THEN ROUND((COUNT(*) FILTER (WHERE stake_amount_sats IS NOT NULL)::DECIMAL / COUNT(*) * 100), 2)
      ELSE 0
    END as data_completeness_pct
  FROM staking_rewards
  WHERE identity_address = target_address
    AND source_address = identity_address;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_verusid_stake_statistics IS 
  'Calculate stake amount statistics for a specific VerusID';

-- Show summary of changes
SELECT 
  'staking_rewards' as table_name,
  COUNT(*) as total_rows,
  COUNT(*) FILTER (WHERE stake_amount_sats IS NOT NULL) as with_stake_amounts,
  CASE 
    WHEN COUNT(*) > 0 
    THEN ROUND((COUNT(*) FILTER (WHERE stake_amount_sats IS NOT NULL)::DECIMAL / COUNT(*) * 100), 2)
    ELSE 0
  END as completeness_pct
FROM staking_rewards
WHERE source_address = identity_address;

PRINT 'Migration complete! Run this to apply:';
PRINT 'psql $DATABASE_URL < scripts/add-stake-amount-tracking.sql';

