#!/bin/bash
echo "🔍 VerusID Staking Scan Monitor"
echo "================================="
echo ""

# Check if process is running
PID=$(ps aux | grep "scan-verusid-gap" | grep -v grep | awk '{print $2}')
if [ -z "$PID" ]; then
    echo "❌ Scan process is NOT running"
    echo "Last log entries:"
    tail -20 scan-dec2020-to-tip.log
    exit 1
fi

echo "✅ Scan is running (PID: $PID)"
echo ""

# Show latest progress
echo "Latest progress:"
tail -5 scan-dec2020-to-tip.log | grep -E "Block|Stakes:"
echo ""

# Check current database stats
echo "Current database stats:"
psql postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db -c "SELECT 'Total stakes' as metric, COUNT(*) as value FROM staking_rewards UNION ALL SELECT 'Unique blocks' as metric, COUNT(DISTINCT block_height) as value FROM staking_rewards UNION ALL SELECT 'Unique stakers' as metric, COUNT(DISTINCT identity_address) as value FROM staking_rewards ORDER BY metric;" 2>/dev/null

echo ""
echo "📊 Monitor every 30 seconds with: watch -n 30 ./monitor-scan.sh"
