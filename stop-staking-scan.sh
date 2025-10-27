#!/bin/bash

# 🎯 MASTER STAKING SCANNER - STOP SCRIPT
# THE ONLY STAKING SCANNER THAT WORKS!

echo "🛑 Stopping MASTER Staking Scanner..."
echo "====================================="

# Check if scanner is running
if ! pgrep -f "optimize-staking-scanner.js" > /dev/null; then
    echo "ℹ️  Master scanner is not running"
    exit 0
fi

# Stop the scanner
echo "🛑 Stopping optimize-staking-scanner.js..."
pkill -f "optimize-staking-scanner.js"

# Wait for it to stop
sleep 2

# Verify it stopped
if ! pgrep -f "optimize-staking-scanner.js" > /dev/null; then
    echo "✅ Master scanner stopped successfully!"
    echo "📊 Final progress:"
    tail -5 optimized-scanner.log 2>/dev/null || echo "   No log file found"
else
    echo "⚠️  Scanner may still be running. Force stopping..."
    pkill -9 -f "optimize-staking-scanner.js"
    sleep 1
    if ! pgrep -f "optimize-staking-scanner.js" > /dev/null; then
        echo "✅ Master scanner force stopped!"
    else
        echo "❌ Failed to stop master scanner!"
        exit 1
    fi
fi









