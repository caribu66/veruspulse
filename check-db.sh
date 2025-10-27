#!/bin/bash

echo "╔══════════════════════════════════════════════════════════╗"
echo "║           VERUS DATABASE CHECKER - EASY MODE            ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Function to run queries
run_query() {
    echo "$1"
    echo "────────────────────────────────────────────────────────"
    PGPASSWORD=verus_secure_2024 psql -U verus_user -d verus_utxo_db -c "$1"
    echo ""
}

echo "📊 OVERALL STATISTICS"
echo "════════════════════════════════════════════════════════════"
run_query "SELECT 'Total VerusID Stakes:' as info, COUNT(*) as count FROM staking_rewards WHERE identity_address LIKE 'i%'"

run_query "SELECT 'Unique VerusIDs with Stakes:' as info, COUNT(DISTINCT identity_address) as count FROM staking_rewards WHERE identity_address LIKE 'i%'"

echo ""
echo "🏆 TOP 10 STAKERS"
echo "════════════════════════════════════════════════════════════"
run_query "SELECT identity_address, COUNT(*) as total_stakes FROM staking_rewards WHERE identity_address LIKE 'i%' GROUP BY identity_address ORDER BY total_stakes DESC LIMIT 10"

echo ""
echo "💎 CARIBU66@ STATS"
echo "════════════════════════════════════════════════════════════"
run_query "SELECT identity_address, COUNT(*) as total_stakes, MIN(block_height) as first_stake, MAX(block_height) as last_stake FROM staking_rewards WHERE identity_address = 'iCDYc7VjEREzSBwj442MXrWLHLWJrDVdiB' GROUP BY identity_address"

echo ""
echo "🔍 RECENT STAKES (Last 5)"
echo "════════════════════════════════════════════════════════════"
run_query "SELECT block_height, block_time, amount_sats::numeric/100000000 as amount_vrsc FROM staking_rewards WHERE identity_address = 'iCDYc7VjEREzSBwj442MXrWLHLWJrDVdiB' ORDER BY block_height DESC LIMIT 5"

echo ""
echo "✅ Check complete!"
