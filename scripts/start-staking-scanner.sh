#!/bin/bash

# Start Standalone Verus Staking Scanner
# This script starts the staking scanner and provides monitoring commands

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║   Starting Standalone Verus Staking Scanner              ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Check if scanner is already running
if [ -f "/tmp/standalone-staking-scanner.pid" ]; then
    PID=$(cat /tmp/standalone-staking-scanner.pid)
    if ps -p $PID > /dev/null 2>&1; then
        echo "⚠️  Scanner is already running (PID: $PID)"
        echo ""
        echo "💡 Commands:"
        echo "  • Monitor: tail -f /tmp/standalone-staking-scanner.log"
        echo "  • Stop: kill $PID"
        echo "  • Status: ps -p $PID"
        exit 1
    else
        echo "🧹 Removing stale PID file..."
        rm -f /tmp/standalone-staking-scanner.pid
    fi
fi

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed or not in PATH"
    exit 1
fi

# Check if the scanner script exists
SCRIPT_DIR="$(dirname "$0")"
SCANNER_SCRIPT="$SCRIPT_DIR/standalone-staking-scanner.js"
if [ ! -f "$SCANNER_SCRIPT" ]; then
    echo "❌ Scanner script not found: $SCANNER_SCRIPT"
    exit 1
fi

# Create logs directory if it doesn't exist
mkdir -p "$(dirname "$0")/../logs"

echo "🚀 Starting standalone staking scanner..."
echo "📝 Log file: /tmp/standalone-staking-scanner.log"
echo "🆔 PID file: /tmp/standalone-staking-scanner.pid"
echo ""

# Start the scanner in the background
cd "$(dirname "$0")/.."
nohup node scripts/standalone-staking-scanner.js > /tmp/standalone-staking-scanner.log 2>&1 &

# Get the PID
SCANNER_PID=$!

# Wait a moment to check if it started successfully
sleep 3

if ps -p $SCANNER_PID > /dev/null 2>&1; then
    echo "✅ Scanner started successfully!"
    echo "   PID: $SCANNER_PID"
    echo ""
    echo "💡 Commands:"
    echo "  • Monitor progress: tail -f /tmp/standalone-staking-scanner.log"
    echo "  • Check status: ps -p $SCANNER_PID"
    echo "  • Stop scanner: kill $SCANNER_PID"
    echo "  • View recent logs: tail -20 /tmp/standalone-staking-scanner.log"
    echo ""
    echo "📊 The scanner will:"
    echo "  • Scan ALL 32,990 VerusIDs from December 2020 to current tip"
    echo "  • Save progress every 5,000 blocks (resumable if interrupted)"
    echo "  • Log all activity to /tmp/standalone-staking-scanner.log"
    echo "  • Update the staking_rewards database table"
    echo ""
    echo "⏱️  Estimated time: 20-30 hours for complete scan"
    echo "🔄 You can safely stop and restart - it will resume from last checkpoint"
else
    echo "❌ Failed to start scanner"
    echo "📝 Check the log file for errors:"
    echo "   tail -20 /tmp/standalone-staking-scanner.log"
    exit 1
fi









