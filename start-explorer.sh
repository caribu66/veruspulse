#!/bin/bash

# Verus Explorer Startup Script
echo "🚀 Starting Verus Explorer..."
echo ""

# Check if lock file exists
LOCK_FILE=".dev-server.lock"
if [ -f "$LOCK_FILE" ]; then
    # Check if the process in the lock file is still running
    if [ -s "$LOCK_FILE" ]; then
        PID=$(cat "$LOCK_FILE" 2>/dev/null | grep -o '"pid":[0-9]*' | cut -d':' -f2)
        if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then
            echo "✅ Next.js server is already running (PID: $PID)"
            echo ""
            echo "💡 To stop: npm run dev:stop"
            echo ""
            exit 0
        fi
    fi
fi

# Start the dev server using the proper script
echo "🔄 Starting Next.js development server..."
npm run dev > /tmp/verus-explorer.log 2>&1 &
SERVER_PID=$!
sleep 3

# Check if it started successfully
if ps -p $SERVER_PID > /dev/null 2>&1; then
    PORT="3000"  # Default dev port
    echo "✅ Server started successfully!"
else
    echo "❌ Failed to start server. Check /tmp/verus-explorer.log"
    exit 1
fi

# Get the actual URL
URL="http://localhost:$PORT"
echo ""
echo "🌐 Verus Explorer is available at:"
echo "   $URL"
echo ""
echo "📊 Server Status:"
echo "   - Server: Running on port $PORT ✅"
echo "   - PID: $SERVER_PID"
echo "   - Logs: /tmp/verus-explorer.log"
echo ""
echo "💡 Useful Commands:"
echo "   - Stop server: npm run dev:stop"
echo "   - View logs: tail -f /tmp/verus-explorer.log"
echo "   - Check status: ps aux | grep next"
echo ""

# Try to open in browser (if available)
if command -v xdg-open > /dev/null; then
    echo "🔗 Opening in browser..."
    xdg-open "$URL" 2>/dev/null &
elif command -v open > /dev/null; then
    echo "🔗 Opening in browser..."
    open "$URL" 2>/dev/null &
fi

echo "✅ Server is running in background"
echo "   Use 'npm run dev:stop' to stop the server"
echo ""
