#!/bin/bash
# Check Next.js dev server memory usage

echo "🔍 Checking Next.js Memory Usage..."
echo ""

# Find next-server process
PID=$(pgrep -f "next-server" | head -1)

if [ -z "$PID" ]; then
    echo "❌ No Next.js server running"
    exit 1
fi

echo "📊 Next.js Server Status:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Get memory info
ps -p $PID -o pid,ppid,%cpu,%mem,rss,vsz,cmd | head -2

echo ""
echo "Memory Details:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Convert RSS to human readable
RSS=$(ps -p $PID -o rss= | tr -d ' ')
RSS_MB=$((RSS / 1024))
RSS_GB=$(echo "scale=2; $RSS_MB / 1024" | bc)

echo "💾 RAM Usage: ${RSS_GB}GB (${RSS_MB}MB)"
echo "🔢 Process ID: $PID"
echo ""

# Show uptime
UPTIME=$(ps -p $PID -o etime= | tr -d ' ')
echo "⏰ Uptime: $UPTIME"
echo ""

# Check if PM2 is managing it
if pm2 list 2>/dev/null | grep -q "veruspulse"; then
    echo "⚠️  PM2 is managing this process"
    echo "   Use: pm2 stop veruspulse"
else
    echo "   Use: kill $PID (to stop)"
fi

