#!/bin/bash
# Quick script to recalculate statistics from current staking_rewards data

echo "Recalculating statistics from staking_rewards..."

PGPASSWORD="${POSTGRES_PASSWORD:-verus_secure_2024}" psql -U "${POSTGRES_USER:-verus_user}" -d "${POSTGRES_DB:-verus_utxo_db}" << 'EOF'
TRUNCATE TABLE verusid_statistics;

INSERT INTO verusid_statistics (address, friendly_name, total_stakes, total_rewards_satoshis, first_stake_time, last_stake_time, avg_reward_amount_satoshis, highest_reward_satoshis, lowest_reward_satoshis, last_calculated)
SELECT 
    sr.identity_address,
    COALESCE(i.friendly_name, i.base_name || '.VRSC@', 'unknown'),
    COUNT(*)::int,
    SUM(sr.amount_sats),
    MIN(sr.block_time),
    MAX(sr.block_time),
    AVG(sr.amount_sats)::bigint,
    MAX(sr.amount_sats),
    MIN(sr.amount_sats),
    NOW()
FROM staking_rewards sr
LEFT JOIN identities i ON sr.identity_address = i.identity_address
GROUP BY sr.identity_address, i.friendly_name, i.base_name;

WITH ranked AS (
    SELECT address, ROW_NUMBER() OVER (ORDER BY total_stakes DESC) as rank
    FROM verusid_statistics
)
UPDATE verusid_statistics vs
SET network_rank = r.rank
FROM ranked r
WHERE vs.address = r.address;

SELECT 
    '✅ Statistics updated!' as status,
    COUNT(*) as verusids,
    SUM(total_stakes) as total_stakes,
    ROUND((SUM(total_rewards_satoshis) / 100000000.0)::numeric, 2) as total_rewards_vrsc
FROM verusid_statistics;
EOF

echo ""
echo "✅ Done! Statistics have been updated."

