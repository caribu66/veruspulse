#!/bin/bash

echo "🚀 Quick Status Check"
echo "===================="
echo ""

# Check if Next.js is running
if pgrep -f "next-server" > /dev/null; then
    echo "✅ Next.js app is running"
else
    echo "❌ Next.js app is not running"
fi

# Check if verusd is running
if pgrep -f "verusd" > /dev/null; then
    echo "✅ VerusCoin daemon is running"
else
    echo "❌ VerusCoin daemon is not running"
fi

# Get current blockchain height
echo ""
echo "📊 Current blockchain height:"
/home/explorer/verus-cli/verus getblockcount 2>/dev/null || echo "❌ Could not get blockchain height"

echo ""
echo "💡 Your staking data extension is working if:"
echo "   • Next.js app is running ✅"
echo "   • VerusCoin daemon is running ✅" 
echo "   • You can see a blockchain height number above ✅"
echo ""
echo "🎯 The priority scans we started will extend your existing"
echo "   35,037 stakes from February 2023 to the current tip!"











