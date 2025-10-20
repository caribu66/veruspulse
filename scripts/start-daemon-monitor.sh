#!/bin/bash

# Start Remote Verus Daemon Monitor
# This script starts the daemon monitoring service

echo "🚀 Starting Remote Verus Daemon Monitor..."

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed or not in PATH"
    exit 1
fi

# Check if the monitor script exists
MONITOR_SCRIPT="$(dirname "$0")/monitor-remote-daemon.js"
if [ ! -f "$MONITOR_SCRIPT" ]; then
    echo "❌ Monitor script not found: $MONITOR_SCRIPT"
    exit 1
fi

# Create logs directory if it doesn't exist
mkdir -p "$(dirname "$0")/../logs"
mkdir -p "$(dirname "$0")/../data"

# Lock file for duplicate prevention
LOCK_FILE="$(dirname "$0")/../.daemon-monitor.lock"

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

# Check if monitor is already running
if check_running; then
    PID=$(cat "$LOCK_FILE")
    echo "⚠️  Daemon monitor is already running"
    echo "   PID: $PID"
    echo "   Lock file: $LOCK_FILE"
    echo ""
    echo "   To stop it:"
    echo "   • kill $PID"
    echo "   • Or: pkill -f monitor-remote-daemon.js"
    exit 1
fi

# Start the monitor in the background
echo "📡 Starting daemon monitor..."
nohup node "$MONITOR_SCRIPT" > "$(dirname "$0")/../logs/daemon-monitor.out" 2>&1 &

# Get the PID
MONITOR_PID=$!

# Create lock file
echo $MONITOR_PID > "$LOCK_FILE"

# Wait a moment to check if it started successfully
sleep 2

if kill -0 $MONITOR_PID 2>/dev/null; then
    echo "✅ Daemon monitor started successfully!"
    echo "   PID: $MONITOR_PID"
    echo "   Lock file: $LOCK_FILE"
    echo "   Logs: $(dirname "$0")/../logs/daemon-monitor.log"
    echo "   Output: $(dirname "$0")/../logs/daemon-monitor.out"
    echo "   Stats: $(dirname "$0")/../data/daemon-stats.json"
    echo ""
    echo "📊 Monitor will collect daemon statistics every 30 seconds"
    echo "🌐 Access the dashboard at: http://localhost:3000"
    echo ""
    echo "🛑 To stop the monitor:"
    echo "   kill $MONITOR_PID"
    echo "   Or remove lock file: rm $LOCK_FILE"
else
    echo "❌ Failed to start daemon monitor"
    echo "   Check logs: $(dirname "$0")/../logs/daemon-monitor.out"
    rm -f "$LOCK_FILE"
    exit 1
fi

