#!/bin/bash

echo "🔄 Migrating to Enhanced Scanner with VerusID Creation Detection"
echo "================================================================"
echo ""

# Check if current scanner is running
CURRENT_PID=$(ps aux | grep "optimize-staking-scanner.js" | grep -v grep | awk '{print $2}')

if [ ! -z "$CURRENT_PID" ]; then
    echo "📊 Current scanner is running (PID: $CURRENT_PID)"
    echo "📊 Current progress:"
    tail -5 optimized-scanner.log | grep -E "(Progress|Stakes found|Speed|ETA)" | tail -3
    echo ""
    
    echo "⚠️  WARNING: Current scanner is still running!"
    echo "   The enhanced scanner will resume from the same position."
    echo "   No data will be lost."
    echo ""
    
    read -p "Do you want to stop the current scanner and start the enhanced version? (y/N): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🛑 Stopping current scanner..."
        kill $CURRENT_PID
        sleep 2
        
        # Check if it's still running
        if ps -p $CURRENT_PID > /dev/null; then
            echo "⚠️  Scanner still running, force killing..."
            kill -9 $CURRENT_PID
            sleep 1
        fi
        
        echo "✅ Current scanner stopped"
    else
        echo "❌ Migration cancelled"
        exit 1
    fi
else
    echo "✅ No current scanner running"
fi

echo ""
echo "🚀 Starting Enhanced Scanner with VerusID Creation Detection..."
echo ""

# Backup the current scanner
echo "📦 Creating backup of current scanner..."
cp optimize-staking-scanner.js optimize-staking-scanner-backup-$(date +%Y%m%d_%H%M%S).js

# Replace with enhanced version
echo "🔄 Replacing with enhanced scanner..."
cp optimize-staking-scanner-with-creations.js optimize-staking-scanner.js

echo "✅ Migration complete!"
echo ""
echo "🎯 Enhanced Scanner Features:"
echo "   ✅ VerusID creation detection and storage"
echo "   ✅ Creation timestamp and block height tracking"
echo "   ✅ Enhanced identity management"
echo "   ✅ All previous staking scanner improvements"
echo ""
echo "📊 The enhanced scanner will:"
echo "   • Resume from the same position as the previous scanner"
echo "   • Continue finding staking rewards"
echo "   • Additionally capture VerusID creation dates"
echo "   • Populate the new creation fields in the database"
echo ""
echo "🚀 Starting enhanced scanner in background..."

# Start the enhanced scanner in background
nohup node optimize-staking-scanner.js > optimized-scanner.log 2>&1 &

echo "✅ Enhanced scanner started!"
echo "📝 Logs: optimized-scanner.log"
echo "🔍 Monitor: tail -f optimized-scanner.log"
echo ""
echo "🎉 Migration successful! Your scanner now captures VerusID creations!"








