#!/bin/bash
# Monitor Verus Daemon Loading Progress

VERUS_CLI="/home/explorer/Downloads/verus-cli/verus"

echo "╔════════════════════════════════════════════════════════════╗"
echo "║        Verus Daemon Loading Progress Monitor              ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Get daemon PID
DAEMON_PID=$(pgrep -x verusd)

if [ -z "$DAEMON_PID" ]; then
    echo "❌ Daemon is not running"
    exit 1
fi

# Get uptime
UPTIME=$(ps -p $DAEMON_PID -o etime= | tr -d ' ')
START_TIME=$(ps -p $DAEMON_PID -o lstart=)

echo "📊 Daemon Status:"
echo "  PID:     $DAEMON_PID"
echo "  Started: $START_TIME"
echo "  Uptime:  $UPTIME"
echo ""

# Get resource usage
RESOURCE=$(ps -p $DAEMON_PID -o %cpu,%mem,rss | tail -1)
CPU=$(echo $RESOURCE | awk '{print $1}')
MEM_PCT=$(echo $RESOURCE | awk '{print $2}')
MEM_MB=$(echo $RESOURCE | awk '{print $3/1024}')

echo "💻 Resource Usage:"
echo "  CPU:  ${CPU}%"
echo "  RAM:  ${MEM_MB} MB (${MEM_PCT}%)"
echo ""

# Try to get daemon info
echo "🔍 Daemon Status:"
INFO=$($VERUS_CLI getinfo 2>&1)

if echo "$INFO" | grep -q "Loading block index"; then
    echo "  Status: ⏳ Loading block index..."
    echo ""
    echo "  Progress Indicators:"
    
    # Check log for progress
    LATEST_LOG=$(tail -20 ~/.komodo/VRSC/debug.log 2>/dev/null | grep -E "init message|LoadBlockIndexDB|blocks" | tail -3)
    if [ -n "$LATEST_LOG" ]; then
        echo "$LATEST_LOG" | sed 's/^/    /'
    fi
    
    echo ""
    echo "  Estimated completion:"
    # Parse uptime to minutes
    UPTIME_MIN=$(echo $UPTIME | awk -F: '{if (NF==3) print $1*60+$2; else print $1}')
    REMAINING=$((60 - UPTIME_MIN))
    
    if [ $REMAINING -gt 0 ]; then
        echo "    ⏱️  Approximately $REMAINING minutes remaining"
    else
        echo "    ⏱️  Should complete any moment now!"
    fi
    
    echo ""
    echo "  What's happening:"
    echo "    • Reading 38GB of blockchain files"
    echo "    • Building transaction indexes"
    echo "    • Loading UTXO set into memory"
    echo "    • Validating chain consistency"
    
elif echo "$INFO" | grep -q '"blocks"'; then
    # Daemon is ready!
    BLOCKS=$(echo "$INFO" | grep -oP '"blocks":\s*\K\d+' || echo "unknown")
    CONNECTIONS=$(echo "$INFO" | grep -oP '"connections":\s*\K\d+' || echo "0")
    
    echo "  Status: 🎉 READY AND OPERATIONAL!"
    echo ""
    echo "  Blockchain Info:"
    echo "    Blocks:      $BLOCKS"
    echo "    Connections: $CONNECTIONS"
    echo ""
    echo "  ✅ Daemon is fully loaded and ready to serve requests!"
    echo "  ✅ Your explorer can now access all blockchain data!"
    echo ""
    
    # Check ZMQ
    ZMQ_PORTS=$(netstat -tuln 2>/dev/null | grep "127.0.0.1:2833" | wc -l)
    if [ $ZMQ_PORTS -gt 0 ]; then
        echo "  ✅ ZMQ: $ZMQ_PORTS ports active"
    else
        echo "  ⚠️  ZMQ: Not active (will be on next restart)"
    fi
else
    echo "  Status: ⚠️  Unexpected response"
    echo "$INFO" | sed 's/^/    /'
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo "To monitor continuously: watch -n 30 './check-daemon-progress.sh'"
echo "════════════════════════════════════════════════════════════"

