#!/bin/bash

# Monitor Enhanced Scanner Progress
# This script monitors the progress of the large range scanner

echo "🔍 ENHANCED SCANNER PROGRESS MONITOR"
echo "===================================="
echo ""

while true; do
    # Check if scanner is running
    if pgrep -f "optimize-staking-scanner-fixed-creations" > /dev/null; then
        echo "✅ Scanner is running"
        
        # Get current progress from log
        if [ -f "scanner-large-range.log" ]; then
            echo "📊 Latest progress:"
            tail -3 scanner-large-range.log | grep -E "(Progress|Stakes found|Creations found|ETA)" || echo "   Processing blocks..."
        fi
        
        # Get database stats
        echo "📊 Database stats:"
        export PGPASSWORD=verus_secure_2024
        psql -h localhost -U verus_user -d verus_utxo_db -c "
        SELECT 
            COUNT(*) as total_stakes,
            COUNT(DISTINCT identity_address) as unique_verusids,
            MAX(block_height) as latest_block,
            (SELECT COUNT(*) FROM identities WHERE creation_block_height IS NOT NULL) as with_creation_data
        FROM staking_rewards WHERE block_height > 0;
        " 2>/dev/null | grep -E "total_stakes|unique_verusids|latest_block|with_creation_data" | head -4
        
    else
        echo "❌ Scanner is not running"
    fi
    
    echo ""
    echo "⏳ Waiting 30 seconds for next update..."
    sleep 30
    clear
done








