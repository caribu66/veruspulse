#!/bin/bash
# Start the real-time stake monitor

cd /home/explorer/verus-dapp

echo "===================================================="
echo "  Starting Real-Time Stake Monitor"
echo "===================================================="
echo ""

# Check if already running
if pgrep -f "monitor-new-stakes.js" > /dev/null; then
    echo "⚠️  Monitor is already running!"
    echo ""
    echo "To stop it: pkill -f monitor-new-stakes.js"
    echo "To view logs: tail -f stake-monitor.log"
    exit 1
fi

# Start in background
nohup node scripts/monitor-new-stakes.js > stake-monitor.log 2>&1 &
PID=$!

sleep 2

if ps -p $PID > /dev/null; then
    echo "✅ Stake monitor started!"
    echo ""
    echo "   PID: $PID"
    echo "   Log file: stake-monitor.log"
    echo ""
    echo "Commands:"
    echo "   View logs:  tail -f stake-monitor.log"
    echo "   Stop:       pkill -f monitor-new-stakes.js"
    echo ""
else
    echo "❌ Failed to start monitor. Check stake-monitor.log for errors"
    exit 1
fi

