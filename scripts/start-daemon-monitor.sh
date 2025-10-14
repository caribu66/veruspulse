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

# Check if monitor is already running
if pgrep -f "monitor-remote-daemon.js" > /dev/null; then
    echo "⚠️  Daemon monitor is already running"
    echo "   PID: $(pgrep -f "monitor-remote-daemon.js")"
    echo "   To stop it, run: pkill -f monitor-remote-daemon.js"
    exit 1
fi

# Start the monitor in the background
echo "📡 Starting daemon monitor..."
nohup node "$MONITOR_SCRIPT" > "$(dirname "$0")/../logs/daemon-monitor.out" 2>&1 &

# Get the PID
MONITOR_PID=$!

# Wait a moment to check if it started successfully
sleep 2

if kill -0 $MONITOR_PID 2>/dev/null; then
    echo "✅ Daemon monitor started successfully!"
    echo "   PID: $MONITOR_PID"
    echo "   Logs: $(dirname "$0")/../logs/daemon-monitor.log"
    echo "   Output: $(dirname "$0")/../logs/daemon-monitor.out"
    echo "   Stats: $(dirname "$0")/../data/daemon-stats.json"
    echo ""
    echo "📊 Monitor will collect daemon statistics every 30 seconds"
    echo "🌐 Access the dashboard at: http://localhost:3000"
    echo ""
    echo "🛑 To stop the monitor:"
    echo "   pkill -f monitor-remote-daemon.js"
    echo "   or kill $MONITOR_PID"
else
    echo "❌ Failed to start daemon monitor"
    echo "   Check logs: $(dirname "$0")/../logs/daemon-monitor.out"
    exit 1
fi

