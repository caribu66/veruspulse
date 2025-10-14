-- Calculate and populate verusid_statistics from staking_rewards
-- Matches the actual table schema

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
    avg_days_between_stakes,
    stakes_per_week,
    stakes_per_month,
    staking_efficiency,
    avg_reward_amount_satoshis,
    eligible_utxos,
    current_utxos,
    total_value_satoshis,
    network_rank,
    network_percentile,
    highest_reward_satoshis,
    highest_reward_date,
    lowest_reward_satoshis,
    last_calculated,
    created_at,
    updated_at
)
SELECT 
    sr.identity_address as address,
    COALESCE(i.friendly_name, i.base_name || '.VRSC@', 'unknown') as friendly_name,
    COUNT(*) as total_stakes,
    SUM(sr.amount_sats) as total_rewards_satoshis,
    MIN(sr.block_time) as first_stake_time,
    MAX(sr.block_time) as last_stake_time,
    
    -- APY all time
    CASE 
        WHEN EXTRACT(EPOCH FROM (MAX(sr.block_time) - MIN(sr.block_time))) > 86400 
        THEN (SUM(sr.amount_sats)::numeric / 100000000) / 
             (EXTRACT(EPOCH FROM (MAX(sr.block_time) - MIN(sr.block_time))) / 31536000) * 100
        ELSE 0 
    END as apy_all_time,
    
    -- APY 30 days
    CASE 
        WHEN MAX(sr.block_time) > NOW() - INTERVAL '30 days'
        THEN (
            SELECT COALESCE(SUM(amount_sats)::numeric, 0) / 100000000 
            FROM staking_rewards 
            WHERE identity_address = sr.identity_address 
            AND block_time > NOW() - INTERVAL '30 days'
        ) / 30 * 365 * 100
        ELSE 0 
    END as apy_30d,
    
    -- Average days between stakes
    CASE 
        WHEN COUNT(*) > 1 
        THEN EXTRACT(EPOCH FROM (MAX(sr.block_time) - MIN(sr.block_time))) / (COUNT(*) - 1) / 86400
        ELSE 0 
    END as avg_days_between_stakes,
    
    -- Stakes per week
    CASE 
        WHEN EXTRACT(EPOCH FROM (MAX(sr.block_time) - MIN(sr.block_time))) > 86400 
        THEN COUNT(*) / (EXTRACT(EPOCH FROM (MAX(sr.block_time) - MIN(sr.block_time))) / 604800)
        ELSE 0 
    END as stakes_per_week,
    
    -- Stakes per month
    CASE 
        WHEN EXTRACT(EPOCH FROM (MAX(sr.block_time) - MIN(sr.block_time))) > 86400 
        THEN COUNT(*) / (EXTRACT(EPOCH FROM (MAX(sr.block_time) - MIN(sr.block_time))) / 2592000)
        ELSE 0 
    END as stakes_per_month,
    
    -- Staking efficiency
    CASE 
        WHEN EXTRACT(EPOCH FROM (MAX(sr.block_time) - MIN(sr.block_time))) > 86400 
        THEN (COUNT(*) / (EXTRACT(EPOCH FROM (MAX(sr.block_time) - MIN(sr.block_time))) / 86400))::numeric(5,4)
        ELSE 0 
    END as staking_efficiency,
    
    -- Average reward amount
    AVG(sr.amount_sats)::bigint as avg_reward_amount_satoshis,
    
    0 as eligible_utxos,
    0 as current_utxos,
    SUM(sr.amount_sats) as total_value_satoshis,
    NULL::int as network_rank,
    NULL::numeric as network_percentile,
    
    -- Highest/lowest rewards
    MAX(sr.amount_sats) as highest_reward_satoshis,
    (SELECT block_time FROM staking_rewards WHERE identity_address = sr.identity_address ORDER BY amount_sats DESC LIMIT 1) as highest_reward_date,
    MIN(sr.amount_sats) as lowest_reward_satoshis,
    
    NOW() as last_calculated,
    NOW() as created_at,
    NOW() as updated_at
    
FROM staking_rewards sr
LEFT JOIN identities i ON sr.identity_address = i.identity_address
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
    network_rank = r.rank::int,
    network_percentile = ((1 - (r.rank::numeric / r.total_count)) * 100)::numeric(5,2)
FROM ranked r
WHERE vs.address = r.address;

-- Show summary
SELECT 
    '=== STATISTICS CALCULATED ===' as status,
    COUNT(*) as total_verusids_with_stats,
    SUM(total_stakes) as total_network_stakes,
    (SUM(total_rewards_satoshis) / 100000000.0)::numeric(20,2) as total_network_rewards_vrsc,
    ROUND(AVG(apy_all_time), 2) as avg_network_apy,
    MAX(total_stakes) as max_stakes_by_one_id
FROM verusid_statistics;

-- Show caribu66 specifically
SELECT 
    '=== CARIBU66 STATS ===' as status,
    friendly_name,
    total_stakes,
    (total_rewards_satoshis / 100000000.0)::numeric(20,8) as rewards_vrsc,
    ROUND(apy_all_time, 2) as apy_percent,
    ROUND(stakes_per_month, 1) as stakes_per_month,
    network_rank
FROM verusid_statistics
WHERE friendly_name ILIKE '%caribu66%' OR address IN (SELECT identity_address FROM identities WHERE base_name = 'caribu66');

-- Show top 10
SELECT 
    '=== TOP 10 STAKERS ===' as status,
    friendly_name,
    total_stakes,
    (total_rewards_satoshis / 100000000.0)::numeric(20,2) as rewards_vrsc,
    ROUND(apy_all_time, 2) as apy_percent,
    network_rank
FROM verusid_statistics
ORDER BY total_stakes DESC
LIMIT 10;

