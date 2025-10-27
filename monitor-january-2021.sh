#!/bin/bash

echo "🔍 JANUARY 2021 TO TIP SCANNER MONITOR"
echo "======================================"
echo ""

# Check if scanner is running
if pgrep -f "january-2021-to-tip-scanner.js" > /dev/null; then
    echo "✅ Scanner is RUNNING"
    echo ""
    
    # Show recent log output
    echo "📊 Recent scanner output:"
    echo "------------------------"
    tail -20 january-2021-to-tip-scanner.log
    echo ""
    
    # Show progress stats
    echo "📈 Progress Statistics:"
    echo "----------------------"
    
    # Count total stakes found
    TOTAL_STAKES=$(grep -c "Saved.*stakes to database" january-2021-to-tip-scanner.log 2>/dev/null || echo "0")
    echo "🎯 Total stakes found: $TOTAL_STAKES"
    
    # Show recent stakes
    echo ""
    echo "💰 Recent stakes found:"
    grep "Found.*stake" january-2021-to-tip-scanner.log | tail -5
    
    # Show speed
    echo ""
    echo "⚡ Current speed:"
    grep "blocks/sec" january-2021-to-tip-scanner.log | tail -1
    
    # Show ETA
    echo ""
    echo "⏱️  ETA:"
    grep "ETA:" january-2021-to-tip-scanner.log | tail -1
    
else
    echo "❌ Scanner is NOT running"
    echo ""
    echo "📊 Last log output:"
    echo "------------------"
    tail -20 january-2021-to-tip-scanner.log 2>/dev/null || echo "No log file found"
fi

echo ""
echo "🎯 January 2021 to tip range: 1,800,001 to current tip"
echo "🔍 Finding ALL I-address stakes from January 2021 onwards"
echo ""
echo "💡 To stop scanner: pkill -f january-2021-to-tip-scanner.js"
echo "💡 To view live log: tail -f january-2021-to-tip-scanner.log"
