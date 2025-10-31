#!/bin/bash

# Kill Zombie Next.js Worker Processes
# Use this when Node.js is consuming too much memory/CPU

echo "🔍 Checking for zombie Next.js worker processes..."

ZOMBIE_COUNT=$(ps aux | grep -E 'jest-worker/processChild' | grep -v grep | wc -l)

if [ "$ZOMBIE_COUNT" -eq 0 ]; then
    echo "✅ No zombie processes found!"
    exit 0
fi

echo "⚠️  Found $ZOMBIE_COUNT zombie worker processes"
echo ""

# Show the processes
echo "Zombie processes:"
ps aux | grep -E 'jest-worker/processChild' | grep -v grep | head -10
if [ "$ZOMBIE_COUNT" -gt 10 ]; then
    echo "... and $((ZOMBIE_COUNT - 10)) more"
fi

echo ""
echo "🔪 Killing zombie processes..."

# Try graceful kill first
pkill -f "jest-worker/processChild"
sleep 1

# Check if any survived
REMAINING=$(ps aux | grep -E 'jest-worker/processChild' | grep -v grep | wc -l)

if [ "$REMAINING" -gt 0 ]; then
    echo "💀 Force killing stubborn processes..."
    pkill -9 -f "jest-worker/processChild"
    sleep 1
fi

# Final check
FINAL_COUNT=$(ps aux | grep -E 'jest-worker/processChild' | grep -v grep | wc -l)

if [ "$FINAL_COUNT" -eq 0 ]; then
    echo "✅ All zombie processes killed!"
    echo ""
    echo "💾 Current memory usage:"
    free -h
else
    echo "⚠️  Warning: $FINAL_COUNT processes could not be killed"
    echo "   You may need to use: sudo pkill -9 -f jest-worker"
fi

