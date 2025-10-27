#!/bin/bash

# Run Enhanced Scanner Continuously
# This script keeps the enhanced scanner running and restarts it if it stops

echo "🚀 ENHANCED SCANNER - CONTINUOUS MODE"
echo "====================================="
echo "✅ Uses getidentityhistory for 100% accurate creation detection"
echo "✅ Gets FIRST entry in history (actual creation block)"
echo "✅ Proper blockchain-based creation timestamps"
echo ""

SCANNER_SCRIPT="optimize-staking-scanner-fixed-creations.js"
LOG_FILE="scanner.log"

while true; do
    echo "🔍 Checking if scanner is running..."
    
    if ! pgrep -f "$SCANNER_SCRIPT" > /dev/null; then
        echo "⚠️  Scanner not running, starting it..."
        
        # Start the scanner
        nohup node "$SCANNER_SCRIPT" > "$LOG_FILE" 2>&1 &
        SCANNER_PID=$!
        
        echo "✅ Scanner started with PID: $SCANNER_PID"
        echo "📄 Log file: $LOG_FILE"
        
        # Wait a moment to see if it starts successfully
        sleep 5
        
        if pgrep -f "$SCANNER_SCRIPT" > /dev/null; then
            echo "✅ Scanner is running successfully!"
        else
            echo "❌ Scanner failed to start. Check $LOG_FILE for errors."
        fi
    else
        echo "✅ Scanner is already running"
    fi
    
    # Wait 30 seconds before checking again
    echo "⏳ Waiting 30 seconds before next check..."
    sleep 30
done








