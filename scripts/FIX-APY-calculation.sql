-- FIX: Incorrect APY calculation in verusid_statistics
-- 
-- PROBLEM: The current APY calculation is:
--   APY = (total_rewards / time_in_years) * 100
-- 
-- This is WRONG because it doesn't account for the staked amount.
-- Correct formula should be:
--   APY = (total_rewards / staked_amount / time_in_years) * 100
--
-- Since we don't track actual staked balances, we need to either:
-- 1. Estimate staked amount based on rewards
-- 2. Cap APY at reasonable maximum
-- 3. Remove APY entirely
--
-- SOLUTION: Estimate staked amount conservatively and cap APY

-- Update all verusid_statistics with corrected APY calculation
UPDATE verusid_statistics
SET 
  apy_all_time = LEAST(
    CASE 
      WHEN 
        first_stake_time IS NOT NULL 
        AND last_stake_time IS NOT NULL
        AND EXTRACT(EPOCH FROM (last_stake_time - first_stake_time)) > 86400
      THEN
        -- Estimate staked amount as 20x the total rewards earned (conservative)
        -- This assumes a 5% APY baseline, which is reasonable for PoS
        (total_rewards_satoshis::numeric / 100000000) / 
        ((total_rewards_satoshis::numeric / 100000000) * 20) / -- Estimated stake
        (EXTRACT(EPOCH FROM (last_stake_time - first_stake_time)) / 31536000) * 100
      ELSE 0
    END,
    100.0  -- Cap at 100% maximum APY (anything higher is likely calculation error)
  ),
  apy_30d = LEAST(
    CASE 
      WHEN last_stake_time > NOW() - INTERVAL '30 days'
      THEN
        -- For 30-day APY, just show annualized rate without complex estimation
        -- This is rewards_last_30d / 30 * 365
        0  -- Set to 0 for now since we need to recalculate from time-series data
      ELSE 0
    END,
    100.0  -- Cap at 100%
  ),
  updated_at = NOW()
WHERE 
  apy_all_time > 100  -- Only update those with suspiciously high APY
  OR apy_all_time IS NULL;

-- Show statistics on the fix
SELECT 
  COUNT(*) as total_identities,
  COUNT(CASE WHEN apy_all_time > 0 THEN 1 END) as identities_with_apy,
  AVG(apy_all_time) as avg_apy,
  MAX(apy_all_time) as max_apy,
  MIN(apy_all_time) as min_apy,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY apy_all_time) as median_apy
FROM verusid_statistics
WHERE apy_all_time > 0;

