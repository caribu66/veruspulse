#!/bin/bash
# Monitor the Mass Scanner progress in real-time

echo "=================================================="
echo "  Mass Scanner Progress Monitor"
echo "=================================================="
echo ""
echo "Press Ctrl+C to stop monitoring (scan continues)"
echo ""

while true; do
    clear
    echo "=================================================="
    echo "  Mass Scanner Progress Monitor"
    echo "=================================================="
    date
    echo ""
    
    # Get scanner status
    RESPONSE=$(curl -s http://localhost:3000/api/admin/mass-scan)
    
    if [ $? -ne 0 ]; then
        echo "❌ Error connecting to scanner API"
        echo "   Make sure the server is running"
        exit 1
    fi
    
    IS_RUNNING=$(echo $RESPONSE | jq -r '.isRunning')
    
    if [ "$IS_RUNNING" != "true" ]; then
        echo "⏸️  Scanner is not running"
        echo ""
        echo "Start it with: ./scripts/start-mass-scan.sh"
        exit 0
    fi
    
    # Parse progress data
    PHASE=$(echo $RESPONSE | jq -r '.progress.currentPhase')
    TOTAL_ADDRESSES=$(echo $RESPONSE | jq -r '.progress.totalAddresses')
    ADDR_PROCESSED=$(echo $RESPONSE | jq -r '.progress.addressesProcessed')
    TOTAL_BLOCKS=$(echo $RESPONSE | jq -r '.progress.totalBlocks')
    BLOCKS_PROCESSED=$(echo $RESPONSE | jq -r '.progress.blocksProcessed')
    STAKES_FOUND=$(echo $RESPONSE | jq -r '.progress.stakeEventsFound')
    ERRORS=$(echo $RESPONSE | jq -r '.progress.errors')
    CACHE_HITS=$(echo $RESPONSE | jq -r '.progress.cacheHits')
    CACHE_MISSES=$(echo $RESPONSE | jq -r '.progress.cacheMisses')
    BLOCK_PERCENT=$(echo $RESPONSE | jq -r '.progress.percentages.blocks')
    BLOCKS_PER_SEC=$(echo $RESPONSE | jq -r '.progress.rates.blocksPerSecond')
    STAKES_PER_SEC=$(echo $RESPONSE | jq -r '.progress.rates.stakesPerSecond')
    ETA=$(echo $RESPONSE | jq -r '.progress.estimatedCompletion')
    ELAPSED=$(echo $RESPONSE | jq -r '.progress.elapsedTime')
    
    # Calculate cache efficiency
    CACHE_TOTAL=$((CACHE_HITS + CACHE_MISSES))
    if [ $CACHE_TOTAL -gt 0 ]; then
        CACHE_EFFICIENCY=$(echo "scale=2; $CACHE_HITS * 100 / $CACHE_TOTAL" | bc)
    else
        CACHE_EFFICIENCY="0.00"
    fi
    
    # Display status
    echo "📊 Current Phase: $PHASE"
    echo ""
    
    if [ "$PHASE" = "scanning_blocks" ] && [ "$TOTAL_BLOCKS" != "0" ]; then
        echo "🔍 Block Progress:"
        echo "   Processed: $BLOCKS_PROCESSED / $TOTAL_BLOCKS blocks ($BLOCK_PERCENT%)"
        echo "   Rate: $BLOCKS_PER_SEC blocks/sec"
        
        # Progress bar
        PERCENT=${BLOCK_PERCENT%.*}
        FILLED=$((PERCENT / 2))
        EMPTY=$((50 - FILLED))
        printf "   ["
        printf "%${FILLED}s" | tr ' ' '█'
        printf "%${EMPTY}s" | tr ' ' '░'
        printf "] $BLOCK_PERCENT%%\n"
        echo ""
    fi
    
    echo "🎯 Discovery:"
    echo "   Addresses: $ADDR_PROCESSED / $TOTAL_ADDRESSES"
    echo ""
    
    echo "⭐ Stakes Found: $STAKES_FOUND"
    echo "   Rate: $STAKES_PER_SEC stakes/sec"
    echo ""
    
    echo "💾 Cache Performance:"
    echo "   Hits: $CACHE_HITS | Misses: $CACHE_MISSES"
    echo "   Efficiency: ${CACHE_EFFICIENCY}%"
    echo ""
    
    echo "⚠️  Errors: $ERRORS"
    echo ""
    
    echo "⏱️  Time:"
    echo "   Elapsed: $ELAPSED"
    if [ "$ETA" != "null" ] && [ ! -z "$ETA" ]; then
        ETA_FORMATTED=$(date -d "$ETA" "+%Y-%m-%d %H:%M:%S" 2>/dev/null || echo "$ETA")
        echo "   ETA: $ETA_FORMATTED"
    fi
    echo ""
    
    echo "=================================================="
    echo "Refreshing in 5 seconds... (Ctrl+C to stop)"
    
    sleep 5
done

