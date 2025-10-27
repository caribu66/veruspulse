#!/bin/bash

echo "🛑 Stopping Verus Explorer Development Environment"
echo "================================================"

# Stop the development server
echo "📱 Stopping Next.js development server..."
pkill -f "next dev" 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✅ Next.js development server stopped"
else
    echo "ℹ️  No Next.js development server running"
fi

# Stop any running scanning processes
echo ""
echo "🔍 Stopping any running scan processes..."
curl -s -X POST http://localhost:3000/api/admin/mass-scan -H "Content-Type: application/json" -d '{"action": "stop"}' 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✅ Mass scan stopped"
else
    echo "ℹ️  No mass scan running or API not accessible"
fi

# Stop any other Node.js processes related to the project
echo ""
echo "🔧 Stopping other project-related processes..."
pkill -f "node.*verus-dapp" 2>/dev/null
pkill -f "npm.*dev" 2>/dev/null

# Check if any processes are still running
echo ""
echo "📊 Checking for remaining processes..."
REMAINING=$(ps aux | grep -E "(next|npm.*dev|verus-dapp)" | grep -v grep | grep -v "stop-all.sh")
if [ -n "$REMAINING" ]; then
    echo "⚠️  Some processes may still be running:"
    echo "$REMAINING"
    echo ""
    echo "To force stop all Node.js processes:"
    echo "pkill -f node"
else
    echo "✅ All development processes stopped"
fi

echo ""
echo "🎯 Development environment stopped successfully!"
echo ""
echo "To restart:"
echo "  npm run dev"
echo ""
echo "To check daemon status:"
echo "  curl -s http://localhost:3000/api/fallback/health | jq"
