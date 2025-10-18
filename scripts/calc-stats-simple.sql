-- Simple statistics calculation from staking_rewards

TRUNCATE TABLE verusid_statistics;

INSERT INTO verusid_statistics (
    address,
    friendly_name,
    total_stakes,
    total_rewards_satoshis,
    first_stake_time,
    last_stake_time,
    apy_all_time,
    apy_30d,
    avg_reward_amount_satoshis,
    highest_reward_satoshis,
    lowest_reward_satoshis,
    avg_days_between_stakes,
    last_calculated
)
SELECT 
    sr.identity_address,
    COALESCE(i.friendly_name, 'unknown'),
    COUNT(*) as total_stakes,
    SUM(sr.amount_sats) as total_rewards,
    MIN(sr.block_time) as first_stake,
    MAX(sr.block_time) as last_stake,
    -- Simple APY
    CASE WHEN EXTRACT(DAY FROM (MAX(sr.block_time) - MIN(sr.block_time))) > 1
         THEN ((SUM(sr.amount_sats)::numeric / 100000000) / 
              EXTRACT(DAY FROM (MAX(sr.block_time) - MIN(sr.block_time))) * 365 * 100)
         ELSE 0 
    END as apy_all,
    -- APY 30d
    CASE WHEN MAX(sr.block_time) > NOW() - INTERVAL '30 days'
         THEN (SELECT COALESCE(SUM(amount_sats)::numeric, 0) / 100000000 / 30 * 365 * 100
               FROM staking_rewards 
               WHERE identity_address = sr.identity_address 
               AND block_time > NOW() - INTERVAL '30 days')
         ELSE 0 
    END as apy_30,
    AVG(sr.amount_sats)::bigint as avg_reward,
    MAX(sr.amount_sats) as highest_reward,
    MIN(sr.amount_sats) as lowest_reward,
    CASE WHEN COUNT(*) > 1
         THEN EXTRACT(DAY FROM (MAX(sr.block_time) - MIN(sr.block_time))) / (COUNT(*) - 1)
         ELSE 0
    END as avg_days,
    NOW() as calculated
FROM staking_rewards sr
LEFT JOIN identities i ON sr.identity_address = i.identity_address
GROUP BY sr.identity_address, i.friendly_name;

-- Network ranks
WITH ranked AS (
    SELECT address, 
           ROW_NUMBER() OVER (ORDER BY total_stakes DESC) as rank,
           COUNT(*) OVER () as total
    FROM verusid_statistics
)
UPDATE verusid_statistics vs
SET network_rank = r.rank,
    network_percentile = ((1 - r.rank::numeric / r.total) * 100)::numeric(5,2)
FROM ranked r
WHERE vs.address = r.address;

-- Show results
\echo '\n=== STATISTICS SUMMARY ==='
SELECT 
    COUNT(*) as "Total VerusIDs",
    SUM(total_stakes) as "Total Stakes",
    (SUM(total_rewards_satoshis) / 100000000.0)::numeric(20,2) as "Total Rewards VRSC"
FROM verusid_statistics;

\echo '\n=== CARIBU66 STATS ==='
SELECT 
    friendly_name as "Name",
    total_stakes as "Stakes",
    (total_rewards_satoshis / 100000000.0)::numeric(20,8) as "Rewards VRSC",
    ROUND(apy_all_time, 2) as "APY %",
    network_rank as "Rank"
FROM verusid_statistics
WHERE address = 'iCDYc7VjEREzSBwj442MXrWLHLWJrDVdiB';

\echo '\n=== TOP 10 STAKERS ==='
SELECT 
    friendly_name as "Name",
    total_stakes as "Stakes",
    (total_rewards_satoshis / 100000000.0)::numeric(20,2) as "Rewards VRSC",
    network_rank as "Rank"
FROM verusid_statistics
ORDER BY total_stakes DESC
LIMIT 10;

