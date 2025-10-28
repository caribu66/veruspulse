-- Calculate and populate verusid_statistics from staking_rewards
-- This creates comprehensive statistics for each VerusID

-- Clear existing statistics
TRUNCATE TABLE verusid_statistics;

-- Calculate comprehensive statistics for each VerusID
INSERT INTO verusid_statistics (
    address,
    friendly_name,
    total_stakes,
    total_rewards_satoshis,
    first_stake_time,
    last_stake_time,
    apy_all_time,
    apy_30d,
    staking_efficiency,
    network_rank,
    network_percentile,
    eligible_utxos,
    current_utxos,
    avg_stake_interval_seconds,
    longest_streak_days,
    total_stake_days,
    created_at,
    updated_at
)
SELECT 
    sr.identity_address as address,
    COALESCE(i.friendly_name, i.base_name || '.VRSC@') as friendly_name,
    COUNT(*) as total_stakes,
    SUM(sr.amount_sats) as total_rewards_satoshis,
    MIN(sr.block_time) as first_stake_time,
    MAX(sr.block_time) as last_stake_time,
    -- Realistic APY calculation (rewards / estimated_stake_amount * 365 / days)
    CASE 
        WHEN EXTRACT(EPOCH FROM (MAX(sr.block_time) - MIN(sr.block_time))) > 0 
        THEN (SUM(sr.amount_sats)::float / 100000000) / 
             (CASE 
                WHEN (SUM(sr.amount_sats)::float / 100000000) > 10000 THEN 50000  -- Large stakers: 50k VRSC
                WHEN (SUM(sr.amount_sats)::float / 100000000) > 5000 THEN 25000   -- Medium stakers: 25k VRSC
                WHEN (SUM(sr.amount_sats)::float / 100000000) > 1000 THEN 10000   -- Small stakers: 10k VRSC
                ELSE 5000  -- Minimum estimate: 5k VRSC
              END) * 
             (365.0 / (EXTRACT(EPOCH FROM (MAX(sr.block_time) - MIN(sr.block_time))) / 86400)) * 100
        ELSE 0 
    END as apy_all_time,
    -- 30-day APY (more realistic calculation)
    CASE 
        WHEN EXTRACT(EPOCH FROM (MAX(sr.block_time) - MIN(sr.block_time))) > 0 
        AND MAX(sr.block_time) > NOW() - INTERVAL '30 days'
        THEN (
            SELECT SUM(amount_sats)::float / 100000000 
            FROM staking_rewards 
            WHERE identity_address = sr.identity_address 
            AND source_address = identity_address  -- CRITICAL: Only count direct I-address stakes
            AND block_time > NOW() - INTERVAL '30 days'
        ) / 
        (CASE 
            WHEN (SUM(sr.amount_sats)::float / 100000000) > 10000 THEN 50000
            WHEN (SUM(sr.amount_sats)::float / 100000000) > 5000 THEN 25000
            WHEN (SUM(sr.amount_sats)::float / 100000000) > 1000 THEN 10000
            ELSE 5000
          END) * (365.0 / 30.0) * 100
        ELSE 0 
    END as apy_30d,
    -- Staking efficiency (stakes per day)
    CASE 
        WHEN EXTRACT(EPOCH FROM (MAX(sr.block_time) - MIN(sr.block_time))) > 0 
        THEN COUNT(*)::float / 
             (EXTRACT(EPOCH FROM (MAX(sr.block_time) - MIN(sr.block_time))) / 86400)
        ELSE 0 
    END as staking_efficiency,
    NULL::int as network_rank,
    NULL::numeric as network_percentile,
    0 as eligible_utxos,
    0 as current_utxos,
    -- Average time between stakes
    CASE 
        WHEN COUNT(*) > 1 
        THEN EXTRACT(EPOCH FROM (MAX(sr.block_time) - MIN(sr.block_time))) / (COUNT(*) - 1)
        ELSE 0 
    END as avg_stake_interval_seconds,
    0 as longest_streak_days,
    EXTRACT(DAY FROM (MAX(sr.block_time) - MIN(sr.block_time))) as total_stake_days,
    NOW() as created_at,
    NOW() as updated_at
FROM staking_rewards sr
JOIN identities i ON sr.identity_address = i.identity_address
WHERE sr.source_address = sr.identity_address  -- CRITICAL: Only count direct I-address stakes
GROUP BY sr.identity_address, i.friendly_name, i.base_name
HAVING COUNT(*) > 0;

-- Calculate network ranks
WITH ranked AS (
    SELECT 
        address,
        ROW_NUMBER() OVER (ORDER BY total_stakes DESC) as rank,
        COUNT(*) OVER () as total_count
    FROM verusid_statistics
)
UPDATE verusid_statistics vs
SET 
    network_rank = r.rank,
    network_percentile = (1 - (r.rank::numeric / r.total_count)) * 100
FROM ranked r
WHERE vs.address = r.address;

-- Show summary
SELECT 
    COUNT(*) as total_verusids_with_stats,
    SUM(total_stakes) as total_network_stakes,
    SUM(total_rewards_satoshis) / 100000000.0 as total_network_rewards_vrsc,
    AVG(apy_all_time) as avg_network_apy,
    MAX(total_stakes) as max_stakes_by_one_id
FROM verusid_statistics;

-- Show top 10
SELECT 
    friendly_name,
    total_stakes,
    total_rewards_satoshis / 100000000.0 as rewards_vrsc,
    ROUND(apy_all_time::numeric, 2) as apy_percent,
    network_rank
FROM verusid_statistics
ORDER BY total_stakes DESC
LIMIT 10;

