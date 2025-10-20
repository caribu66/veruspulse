#!/bin/bash
# Start the real-time stake monitor

cd /home/explorer/verus-dapp

echo "===================================================="
echo "  Starting Real-Time Stake Monitor"
echo "===================================================="
echo ""

# Lock file for duplicate prevention
LOCK_FILE="/home/explorer/verus-dapp/.stake-monitor.lock"

# Function to check if process is running
check_running() {
    if [ -f "$LOCK_FILE" ]; then
        PID=$(cat "$LOCK_FILE" 2>/dev/null)
        if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then
            return 0  # Running
        else
            rm -f "$LOCK_FILE"  # Remove stale lock
        fi
    fi
    return 1  # Not running
}

# Check if already running
if check_running; then
    PID=$(cat "$LOCK_FILE")
    echo "⚠️  Monitor is already running!"
    echo "   PID: $PID"
    echo "   Lock file: $LOCK_FILE"
    echo ""
    echo "Commands:"
    echo "   Stop: kill $PID"
    echo "   View logs: tail -f stake-monitor.log"
    exit 1
fi

# Start in background
nohup node scripts/monitor-new-stakes.js > stake-monitor.log 2>&1 &
PID=$!

# Create lock file
echo $PID > "$LOCK_FILE"

sleep 2

if ps -p $PID > /dev/null; then
    echo "✅ Stake monitor started!"
    echo ""
    echo "   PID: $PID"
    echo "   Lock file: $LOCK_FILE"
    echo "   Log file: stake-monitor.log"
    echo ""
    echo "Commands:"
    echo "   View logs:  tail -f stake-monitor.log"
    echo "   Stop:       kill $PID"
    echo ""
else
    echo "❌ Failed to start monitor. Check stake-monitor.log for errors"
    rm -f "$LOCK_FILE"
    exit 1
fi

