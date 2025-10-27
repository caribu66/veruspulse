#!/bin/bash

# 🎯 COMPREHENSIVE STAKE SCANNER - MONITOR SCRIPT

echo "📊 Monitoring COMPREHENSIVE Stake Scanner..."
echo "==========================================="

# Check if scanner is running
if ! pgrep -f "comprehensive-stake-scanner.js" > /dev/null; then
    echo "❌ Comprehensive scanner is not running!"
    echo "🚀 Start it with: nohup node comprehensive-stake-scanner.js > comprehensive-scanner.log 2>&1 &"
    exit 1
fi

echo "✅ Comprehensive scanner is running!"
echo "📋 Process ID: $(pgrep -f 'comprehensive-stake-scanner.js')"
echo ""

# Show current progress
echo "📊 Latest Progress:"
tail -15 comprehensive-scanner.log 2>/dev/null || echo "   No log file found"

echo ""
echo "🔄 Monitoring every 30 seconds... (Press Ctrl+C to stop)"
echo ""

# Monitor in real-time
while true; do
    sleep 30
    echo "--- $(date) ---"
    echo "📊 Progress Update:"
    tail -5 comprehensive-scanner.log 2>/dev/null || echo "   No new progress"
    
    # Show database stats
    echo "📈 Database Stats:"
    psql postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db -c "SELECT COUNT(*) as total_stakes, COUNT(DISTINCT identity_address) as unique_verusids FROM staking_rewards;" 2>/dev/null || echo "   Database query failed"
    echo ""
done
