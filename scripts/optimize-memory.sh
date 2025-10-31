#!/bin/bash

# Memory Optimization Script for Node.js/Next.js Development

echo "🔧 Optimizing Node.js Memory Usage..."

# 1. Clear Next.js cache
echo "📦 Clearing Next.js cache..."
rm -rf .next/cache
rm -rf node_modules/.cache

# 2. Clear any stale build artifacts
echo "🧹 Cleaning build artifacts..."
rm -rf .next

# 3. Check current Node.js processes
echo "👀 Current Node.js processes:"
ps aux | grep -E 'node|next' | grep -v grep

# 4. Show memory usage
echo ""
echo "💾 Current system memory usage:"
free -h

# 5. Suggest swap if low on memory
TOTAL_MEM=$(free -m | awk 'NR==2{print $2}')
if [ "$TOTAL_MEM" -lt 8000 ]; then
    echo ""
    echo "⚠️  Warning: You have less than 8GB RAM"
    echo "   Consider enabling swap space or using a cloud VM"
    echo ""
    echo "   To create a 4GB swap file:"
    echo "   sudo fallocate -l 4G /swapfile"
    echo "   sudo chmod 600 /swapfile"
    echo "   sudo mkswap /swapfile"
    echo "   sudo swapon /swapfile"
fi

echo ""
echo "✅ Memory optimization complete!"
echo ""
echo "💡 Tips to reduce memory usage:"
echo "   1. Close unused applications"
echo "   2. Use 'npm run dev' instead of 'npm run dev:turbo'"
echo "   3. Limit number of browser tabs"
echo "   4. Use 'NODE_OPTIONS=--max-old-space-size=2048' for 2GB limit"
echo "   5. Restart dev server periodically"

