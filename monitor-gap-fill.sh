#!/bin/bash

echo "🔍 GAP-FILL SCANNER MONITOR"
echo "=========================="
echo ""

# Check if scanner is running
SCANNER_PID=$(ps aux | grep "gap-fill-scanner.js 1186194" | grep -v grep | awk '{print $2}')
if [ -z "$SCANNER_PID" ]; then
    echo "❌ Scanner is NOT running!"
    exit 1
else
    echo "✅ Scanner is running (PID: $SCANNER_PID)"
fi

# Get scanner stats
echo ""
echo "📊 SCANNER STATISTICS:"
echo "----------------------"

# Process info
ps -p $SCANNER_PID -o pid,ppid,cmd,etime,pcpu,pmem

# Database progress
echo ""
echo "📈 DATABASE PROGRESS:"
echo "--------------------"
PGPASSWORD=verus_secure_2024 psql -U verus_user -d verus_utxo_db -c "
SELECT 
    COUNT(*) as total_stakes,
    COUNT(DISTINCT identity_address) as unique_verusids,
    MIN(block_height) as earliest_block,
    MAX(block_height) as latest_block
FROM staking_rewards 
WHERE block_height BETWEEN 1186194 AND 3091681;
"

# Pancho77@ specific progress
echo ""
echo "🎯 PANCHO77@ PROGRESS:"
echo "----------------------"
PGPASSWORD=verus_secure_2024 psql -U verus_user -d verus_utxo_db -c "
SELECT 
    COUNT(*) as total_stakes,
    SUM(amount_sats)/100000000.0 as total_vrsc_staked,
    MIN(block_height) as first_stake,
    MAX(block_height) as last_stake
FROM staking_rewards 
WHERE identity_address = 'iJG7qqfGpmE8pnLKJkMYTDU3syio8VMqpx';
"

# Recent stakes found
echo ""
echo "🆕 RECENT STAKES (Last 10):"
echo "---------------------------"
PGPASSWORD=verus_secure_2024 psql -U verus_user -d verus_utxo_db -c "
SELECT 
    identity_address,
    block_height,
    amount_sats/100000000.0 as amount_vrsc,
    block_time
FROM staking_rewards 
WHERE block_height BETWEEN 1186194 AND 3091681
ORDER BY block_height DESC 
LIMIT 10;
"

echo ""
echo "⏰ Last updated: $(date)"

