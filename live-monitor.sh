#!/bin/bash

echo "🔴 LIVE MONITOR - December 2020 Scanner"
echo "======================================"
echo ""

# Function to get current stats
get_stats() {
    # Get scanner process info
    if pgrep -f "optimize-staking-scanner.js" > /dev/null; then
        echo "✅ Scanner Status: RUNNING"
        
        # Get current progress from log
        if [ -f "december-2020-gap-fill.log" ]; then
            # Get last progress line
            last_progress=$(tail -20 december-2020-gap-fill.log | grep "Progress:" | tail -1)
            if [ ! -z "$last_progress" ]; then
                echo "📊 $last_progress"
            fi
            
            # Get last few stakes found
            echo ""
            echo "🎯 Recent stakes found:"
            tail -10 december-2020-gap-fill.log | grep "Found.*stake" | tail -3 | while read line; do
                echo "   $line"
            done
        fi
        
        # Get database count
        if command -v node > /dev/null; then
            db_count=$(node -e "
                const { Pool } = require('pg');
                const pool = new Pool({
                    connectionString: 'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db'
                });
                pool.query('SELECT COUNT(*) as count FROM staking_rewards WHERE block_height BETWEEN 1299328 AND 1305000')
                .then(result => {
                    console.log(result.rows[0].count);
                    pool.end();
                })
                .catch(() => console.log('0'));
            " 2>/dev/null || echo "0")
            
            echo ""
            echo "💾 Database stakes saved: $db_count"
        fi
        
    else
        echo "❌ Scanner Status: NOT RUNNING"
    fi
}

# Function to show live tail
show_live() {
    echo "🔴 LIVE SCANNER OUTPUT (Press Ctrl+C to exit):"
    echo "=============================================="
    tail -f december-2020-gap-fill.log
}

# Function to show stats every few seconds
show_stats() {
    while true; do
        clear
        echo "🔴 LIVE MONITOR - December 2020 Scanner"
        echo "======================================"
        echo "⏰ $(date)"
        echo ""
        get_stats
        echo ""
        echo "🔄 Refreshing every 5 seconds... (Press Ctrl+C to exit)"
        sleep 5
    done
}

# Main menu
case "${1:-stats}" in
    "live")
        show_live
        ;;
    "stats")
        show_stats
        ;;
    "once")
        get_stats
        ;;
    *)
        echo "Usage: $0 [live|stats|once]"
        echo ""
        echo "  live  - Show live tail of scanner output"
        echo "  stats - Show stats that refresh every 5 seconds"
        echo "  once  - Show current stats once"
        echo ""
        echo "Examples:"
        echo "  $0 live    # Watch live scanner output"
        echo "  $0 stats   # Watch live stats (default)"
        echo "  $0 once    # Check status once"
        ;;
esac
