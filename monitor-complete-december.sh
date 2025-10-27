#!/bin/bash

echo "🔍 COMPLETE DECEMBER 2020 SCANNER MONITOR"
echo "=========================================="
echo ""

# Check if scanner is running
if pgrep -f "complete-december-2020-scanner.js" > /dev/null; then
    echo "✅ Scanner is RUNNING"
    echo ""
    
    # Show recent log output
    echo "📊 Recent scanner output:"
    echo "------------------------"
    tail -20 complete-december-2020-scanner.log
    echo ""
    
    # Show progress stats
    echo "📈 Progress Statistics:"
    echo "----------------------"
    
    # Count total stakes found
    TOTAL_STAKES=$(grep -c "Saved.*stakes to database" complete-december-2020-scanner.log 2>/dev/null || echo "0")
    echo "🎯 Total stakes found: $TOTAL_STAKES"
    
    # Show recent stakes
    echo ""
    echo "💰 Recent stakes found:"
    grep "Found.*stake" complete-december-2020-scanner.log | tail -5
    
    # Show speed
    echo ""
    echo "⚡ Current speed:"
    grep "blocks/sec" complete-december-2020-scanner.log | tail -1
    
    # Show ETA
    echo ""
    echo "⏱️  ETA:"
    grep "ETA:" complete-december-2020-scanner.log | tail -1
    
else
    echo "❌ Scanner is NOT running"
    echo ""
    echo "📊 Last log output:"
    echo "------------------"
    tail -20 complete-december-2020-scanner.log 2>/dev/null || echo "No log file found"
fi

echo ""
echo "🎯 December 2020 range: 1,299,328 to 1,800,000 (500,000+ blocks)"
echo "🔍 Looking for caribu66@ stakes in December 2020"
echo ""
echo "💡 To stop scanner: pkill -f complete-december-2020-scanner.js"
echo "💡 To view live log: tail -f complete-december-2020-scanner.log"
