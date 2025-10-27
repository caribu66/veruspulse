#!/bin/bash

# 🎯 MASTER STAKING SCANNER - START SCRIPT
# THE ONLY STAKING SCANNER THAT WORKS!

echo "🚀 Starting MASTER Staking Scanner..."
echo "======================================"

# Check if scanner is already running
if pgrep -f "optimize-staking-scanner.js" > /dev/null; then
    echo "⚠️  Master scanner is already running!"
    echo "📊 Current progress:"
    tail -5 optimized-scanner.log 2>/dev/null || echo "   No log file found"
    exit 1
fi

# Start the master scanner
echo "🎯 Starting optimize-staking-scanner.js..."
nohup node optimize-staking-scanner.js > optimized-scanner.log 2>&1 &

# Wait a moment for it to start
sleep 3

# Check if it started successfully
if pgrep -f "optimize-staking-scanner.js" > /dev/null; then
    echo "✅ Master scanner started successfully!"
    echo "📊 Initial progress:"
    tail -10 optimized-scanner.log 2>/dev/null || echo "   Starting up..."
    echo ""
    echo "🔍 To monitor progress: ./monitor-staking-scan.sh"
    echo "📊 To check status: ./status-staking-scan.sh"
    echo "🛑 To stop scanner: ./stop-staking-scan.sh"
else
    echo "❌ Failed to start master scanner!"
    echo "📋 Check optimized-scanner.log for errors"
    exit 1
fi









