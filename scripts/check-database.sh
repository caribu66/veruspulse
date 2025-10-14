#!/bin/bash
# Check the database for collected stake data

DB_URL="postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db"

echo "=================================================="
echo "  Database Statistics"
echo "=================================================="
echo ""

echo "📊 Stake Events:"
psql "$DB_URL" -c "
SELECT 
    COUNT(*) as total_events,
    COUNT(DISTINCT address) as unique_stakers,
    MIN(block_time) as earliest,
    MAX(block_time) as latest,
    SUM(reward_amount)/100000000.0 as total_rewards_vrsc
FROM stake_events;
" 2>&1

echo ""
echo "🏆 Top 10 Stakers:"
psql "$DB_URL" -c "
SELECT 
    address,
    COUNT(*) as stakes,
    SUM(reward_amount)/100000000.0 as total_vrsc
FROM stake_events 
GROUP BY address 
ORDER BY stakes DESC 
LIMIT 10;
" 2>&1

echo ""
echo "📦 Block Analytics:"
psql "$DB_URL" -c "
SELECT 
    COUNT(*) as total_blocks,
    COUNT(*) FILTER (WHERE block_type = 'pos') as pos_blocks,
    COUNT(*) FILTER (WHERE block_type = 'pow') as pow_blocks,
    MIN(block_time) as earliest,
    MAX(block_time) as latest
FROM block_analytics;
" 2>&1

echo ""
echo "📈 Recent Activity (Last 24 hours):"
psql "$DB_URL" -c "
SELECT 
    COUNT(*) as stakes_last_24h,
    COUNT(DISTINCT address) as unique_stakers,
    SUM(reward_amount)/100000000.0 as rewards_vrsc
FROM stake_events 
WHERE block_time > NOW() - INTERVAL '24 hours';
" 2>&1

echo ""

