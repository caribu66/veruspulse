#!/bin/bash

echo "📊 SCANNER STATUS CHECK"
echo "======================="

# Check if scanner is running
if pgrep -f "fill-existing-range-gaps" > /dev/null; then
    echo "✅ Scanner Status: RUNNING"
    echo "📋 Process ID: $(pgrep -f 'fill-existing-range-gaps')"
else
    echo "❌ Scanner Status: NOT RUNNING"
fi

echo ""

# Show recent log entries
echo "📋 Recent Progress:"
tail -5 existing-range-gaps.log 2>/dev/null || echo "   No log file found"

echo ""

# Show database stats
echo "📈 Database Stats:"
psql postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db -c "SELECT COUNT(*) as total_stakes, COUNT(DISTINCT identity_address) as unique_verusids FROM staking_rewards;" 2>/dev/null || echo "   Database query failed"

echo ""

# Show latest stakes
echo "🎯 Latest Stakes Found:"
psql postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db -c "SELECT block_height, COUNT(*) as stakes FROM staking_rewards GROUP BY block_height ORDER BY block_height DESC LIMIT 5;" 2>/dev/null || echo "   Database query failed"
