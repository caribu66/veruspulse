#!/bin/bash

# 🎯 MASTER STAKING SCANNER - STATUS SCRIPT
# THE ONLY STAKING SCANNER THAT WORKS!

echo "📊 MASTER Staking Scanner Status"
echo "================================="

# Check if scanner is running
if pgrep -f "optimize-staking-scanner.js" > /dev/null; then
    echo "✅ Status: RUNNING"
    echo "📋 Process ID: $(pgrep -f 'optimize-staking-scanner.js')"
    echo ""
    echo "📊 Latest Progress:"
    tail -10 optimized-scanner.log 2>/dev/null || echo "   No log file found"
else
    echo "❌ Status: NOT RUNNING"
    echo ""
    echo "🚀 To start: ./start-staking-scan.sh"
    echo "📋 Last log entries:"
    tail -10 optimized-scanner.log 2>/dev/null || echo "   No log file found"
fi

echo ""
echo "🎯 Master Scanner Info:"
echo "   - File: optimize-staking-scanner.js"
echo "   - Log: optimized-scanner.log"
echo "   - Detection: block.posrewarddest"
echo "   - Table: staking_rewards"
echo "   - Rate: ~33-37 blocks/sec"









