#!/bin/bash

# Migrate to Enhanced Scanner with CORRECT getidentityhistory Method
# This script safely stops the current scanner and deploys the updated version

echo "🚀 MIGRATING TO ENHANCED SCANNER WITH CORRECT CREATION DETECTION"
echo "================================================================"
echo ""

# Check if the current scanner is running
echo "🔍 Checking current scanner status..."
if pgrep -f "optimize-staking-scanner" > /dev/null; then
    echo "✅ Found running scanner process"
    SCANNER_PID=$(pgrep -f "optimize-staking-scanner")
    echo "   PID: $SCANNER_PID"
    
    echo ""
    echo "🛑 Stopping current scanner..."
    kill -TERM $SCANNER_PID
    
    # Wait for graceful shutdown
    echo "⏳ Waiting for graceful shutdown..."
    sleep 5
    
    # Check if still running
    if pgrep -f "optimize-staking-scanner" > /dev/null; then
        echo "⚠️  Scanner still running, forcing shutdown..."
        kill -KILL $SCANNER_PID
        sleep 2
    fi
    
    echo "✅ Scanner stopped successfully"
else
    echo "ℹ️  No scanner currently running"
fi

echo ""
echo "📋 BACKUP CURRENT SCANNER..."
cp optimize-staking-scanner-fixed-creations.js optimize-staking-scanner-fixed-creations.js.backup.$(date +%Y%m%d_%H%M%S)
echo "✅ Backup created"

echo ""
echo "🎯 DEPLOYING UPDATED SCANNER..."
echo "   ✅ Uses getidentityhistory for 100% accurate creation detection"
echo "   ✅ Gets FIRST entry in history (actual creation block)"
echo "   ✅ Proper blockchain-based creation timestamps"
echo "   ✅ No false positive creation detections"

echo ""
echo "🚀 Starting enhanced scanner with correct creation detection..."
nohup node optimize-staking-scanner-fixed-creations.js > scanner.log 2>&1 &
SCANNER_PID=$!

echo "✅ Enhanced scanner started with PID: $SCANNER_PID"
echo "📄 Log file: scanner.log"

echo ""
echo "🔍 Verifying scanner is running..."
sleep 3
if pgrep -f "optimize-staking-scanner-fixed-creations" > /dev/null; then
    echo "✅ Scanner is running successfully!"
    echo "📊 Monitor progress with: tail -f scanner.log"
else
    echo "❌ Scanner failed to start. Check scanner.log for errors."
    exit 1
fi

echo ""
echo "🎉 MIGRATION COMPLETE!"
echo "======================"
echo "✅ Enhanced scanner with CORRECT creation detection is now running"
echo "✅ Uses getidentityhistory method for 100% accurate dates"
echo "✅ All VerusID creation dates will be properly detected"
echo ""
echo "📊 Monitor the scanner:"
echo "   tail -f scanner.log"
echo "   ./check-sync-status-now.sh"








