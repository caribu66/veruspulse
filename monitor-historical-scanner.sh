#!/bin/bash

echo "📊 Historical Gap Scanner Monitor"
echo "================================="
echo ""

# Check if scanner is running
if pgrep -f "historical-gap-scanner.js" > /dev/null; then
    echo "✅ Scanner Status: RUNNING"
    echo ""
    
    # Show recent progress
    echo "📋 Recent Progress:"
    tail -5 historical-gap-scanner.log | grep "Processing block" | tail -1
    echo ""
    
    # Count total blocks processed
    total_processed=$(grep "Processing block" historical-gap-scanner.log | wc -l)
    echo "📊 Total blocks processed: $total_processed"
    
    # Calculate progress
    total_blocks=259796
    if [ $total_processed -gt 0 ]; then
        progress=$(echo "scale=2; $total_processed * 100 / $total_blocks" | bc)
        echo "📈 Progress: $progress%"
    fi
    
    echo ""
    echo "🎯 Stakes found: $(grep "Found.*stake" historical-gap-scanner.log | wc -l)"
    echo ""
    echo "📋 Last few blocks processed:"
    tail -10 historical-gap-scanner.log | grep "Processing block" | tail -3
    
else
    echo "❌ Scanner Status: NOT RUNNING"
    echo ""
    echo "🚀 To start: nohup node historical-gap-scanner.js > historical-gap-scanner.log 2>&1 &"
    echo ""
    echo "📋 Last log entries:"
    tail -10 historical-gap-scanner.log
fi
