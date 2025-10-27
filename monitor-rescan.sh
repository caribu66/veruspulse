#!/bin/bash
echo "🔄 Full Rescan Monitor"
echo "======================"
echo ""

# Check if process is running
PID=$(ps aux | grep "scan-verusid-gap.*812310" | grep -v grep | awk '{print $2}')
if [ -z "$PID" ]; then
    echo "❌ Rescan process is NOT running"
    echo "Last log entries:"
    tail -20 full-rescan-dec2020.log
    exit 1
fi

echo "✅ Rescan is running (PID: $PID)"
echo ""

# Show latest progress
echo "Latest progress:"
tail -3 full-rescan-dec2020.log | grep -E "Block|Stakes:"
echo ""

# Show current database stats
echo "Current database stats:"
psql postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db -c "SELECT COUNT(*) as total_stakes, MIN(block_height) as earliest, MAX(block_height) as latest FROM staking_rewards;" 2>/dev/null

echo ""
echo "📊 Monitor every 30 seconds with: watch -n 30 ./monitor-rescan.sh"
