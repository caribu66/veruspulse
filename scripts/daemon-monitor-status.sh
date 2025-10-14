#!/bin/bash

# Check Remote Verus Daemon Monitor Status
# This script shows the current status of the daemon monitoring service

echo "🔍 Remote Verus Daemon Monitor Status"
echo "====================================="

# Check if monitor is running
MONITOR_PID=$(pgrep -f "monitor-remote-daemon.js")
if [ -n "$MONITOR_PID" ]; then
    echo "✅ Monitor Status: RUNNING"
    echo "   PID: $MONITOR_PID"
    
    # Get process info
    if command -v ps &> /dev/null; then
        echo "   Process Info:"
        ps -p $MONITOR_PID -o pid,ppid,cmd,etime,pcpu,pmem 2>/dev/null | tail -n +2 | sed 's/^/     /'
    fi
else
    echo "❌ Monitor Status: NOT RUNNING"
fi

echo ""

# Check if stats file exists and show recent data
STATS_FILE="$(dirname "$0")/../data/daemon-stats.json"
if [ -f "$STATS_FILE" ]; then
    echo "📊 Latest Statistics:"
    
    # Check if jq is available for pretty JSON
    if command -v jq &> /dev/null; then
        echo "   Last Update: $(jq -r '.lastUpdate' "$STATS_FILE" 2>/dev/null | xargs -I {} date -d @{} 2>/dev/null || echo "Unknown")"
        echo "   Chain: $(jq -r '.blockchain.chain // "Unknown"' "$STATS_FILE" 2>/dev/null)"
        echo "   Blocks: $(jq -r '.blockchain.blocks // "Unknown"' "$STATS_FILE" 2>/dev/null)"
        echo "   Sync Progress: $(jq -r '(.syncProgress.percentage // 0) | round' "$STATS_FILE" 2>/dev/null)%"
        echo "   Connections: $(jq -r '.networkHealth.connections // "Unknown"' "$STATS_FILE" 2>/dev/null)"
        echo "   Mempool Size: $(jq -r '.mempoolHealth.size // "Unknown"' "$STATS_FILE" 2>/dev/null)"
    else
        echo "   Stats file exists but jq not available for parsing"
        echo "   File size: $(du -h "$STATS_FILE" | cut -f1)"
        echo "   Last modified: $(stat -c %y "$STATS_FILE" 2>/dev/null || stat -f %Sm "$STATS_FILE" 2>/dev/null)"
    fi
else
    echo "📊 No statistics file found"
fi

echo ""

# Check log files
LOG_FILE="$(dirname "$0")/../logs/daemon-monitor.log"
OUTPUT_FILE="$(dirname "$0")/../logs/daemon-monitor.out"

echo "📝 Log Files:"
if [ -f "$LOG_FILE" ]; then
    echo "   Log: $LOG_FILE ($(du -h "$LOG_FILE" | cut -f1))"
    echo "   Last log entry:"
    tail -n 1 "$LOG_FILE" 2>/dev/null | sed 's/^/     /'
else
    echo "   Log: Not found"
fi

if [ -f "$OUTPUT_FILE" ]; then
    echo "   Output: $OUTPUT_FILE ($(du -h "$OUTPUT_FILE" | cut -f1))"
else
    echo "   Output: Not found"
fi

echo ""

# Show recent errors if any
if [ -f "$LOG_FILE" ]; then
    ERROR_COUNT=$(grep -c "ERROR" "$LOG_FILE" 2>/dev/null || echo "0")
    if [ "$ERROR_COUNT" -gt 0 ]; then
        echo "⚠️  Recent Errors ($ERROR_COUNT total):"
        grep "ERROR" "$LOG_FILE" 2>/dev/null | tail -n 3 | sed 's/^/     /'
    else
        echo "✅ No errors in logs"
    fi
fi

echo ""

# Show API endpoint status
echo "🌐 API Endpoint:"
if command -v curl &> /dev/null; then
    API_RESPONSE=$(curl -s -w "%{http_code}" -o /dev/null "http://localhost:3000/api/daemon-monitor" 2>/dev/null)
    if [ "$API_RESPONSE" = "200" ]; then
        echo "   ✅ http://localhost:3000/api/daemon-monitor (HTTP $API_RESPONSE)"
    else
        echo "   ❌ http://localhost:3000/api/daemon-monitor (HTTP $API_RESPONSE)"
    fi
else
    echo "   curl not available to test API endpoint"
fi

echo ""
echo "🛠️  Commands:"
echo "   Start monitor: $(dirname "$0")/start-daemon-monitor.sh"
echo "   Stop monitor:  pkill -f monitor-remote-daemon.js"
echo "   View logs:     tail -f $LOG_FILE"
echo "   View stats:    cat $STATS_FILE"

