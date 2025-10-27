#!/bin/bash

# 🎯 MASTER STAKING SCANNER - MONITOR SCRIPT
# THE ONLY STAKING SCANNER THAT WORKS!

echo "📊 Monitoring MASTER Staking Scanner..."
echo "======================================="

# Check if scanner is running
if ! pgrep -f "optimize-staking-scanner.js" > /dev/null; then
    echo "❌ Master scanner is not running!"
    echo "🚀 Start it with: ./start-staking-scan.sh"
    exit 1
fi

echo "✅ Master scanner is running!"
echo "📋 Latest progress:"
echo ""

# Show recent progress
tail -20 optimized-scanner.log 2>/dev/null || echo "   No log file found"

echo ""
echo "🔄 Monitoring every 10 seconds... (Press Ctrl+C to stop)"
echo ""

# Monitor in real-time
while true; do
    sleep 10
    echo "--- $(date) ---"
    tail -3 optimized-scanner.log 2>/dev/null || echo "   No new progress"
    echo ""
done









