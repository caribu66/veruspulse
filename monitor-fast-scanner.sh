#!/bin/bash

echo "🔴 FAST SCANNER MONITOR"
echo "======================"
echo ""

# Function to get current stats
get_stats() {
    # Get scanner process info
    if pgrep -f "robust-december-scanner.js" > /dev/null; then
        echo "✅ Scanner Status: RUNNING"
        
        # Get current progress from log
        if [ -f "fast-scanner.log" ]; then
            # Get last progress line
            last_progress=$(tail -20 fast-scanner.log | grep "Progress:" | tail -1)
            if [ ! -z "$last_progress" ]; then
                echo "📊 $last_progress"
            fi
            
            # Get stakes found
            stakes_found=$(tail -20 fast-scanner.log | grep "Stakes found:" | tail -1 | grep -o "[0-9]* stakes found" | grep -o "[0-9]*")
            if [ ! -z "$stakes_found" ]; then
                echo "🎯 Scanner stakes found: $stakes_found"
            fi
            
            # Get speed
            speed=$(tail -20 fast-scanner.log | grep "Speed:" | tail -1 | grep -o "[0-9]*\.[0-9]* blocks/sec" | grep -o "[0-9]*\.[0-9]*")
            if [ ! -z "$speed" ]; then
                echo "⚡ Speed: $speed blocks/sec"
            fi
            
            # Get ETA
            eta=$(tail -20 fast-scanner.log | grep "ETA:" | tail -1 | grep -o "[0-9]* seconds" | grep -o "[0-9]*")
            if [ ! -z "$eta" ]; then
                eta_hours=$((eta / 3600))
                echo "⏱️  ETA: $eta_hours hours"
            fi
            
            # Get last few stakes found
            echo ""
            echo "🎯 Recent stakes found:"
            tail -10 fast-scanner.log | grep "Found.*stake" | tail -3 | while read line; do
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
            echo "💾 Database stakes in December range: $db_count"
            
            # Get most recent block in database
            recent_block=$(node -e "
                const { Pool } = require('pg');
                const pool = new Pool({
                    connectionString: 'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db'
                });
                pool.query('SELECT MAX(block_height) as max_block FROM staking_rewards WHERE block_height BETWEEN 1299328 AND 1305000')
                .then(result => {
                    console.log(result.rows[0].max_block);
                    pool.end();
                })
                .catch(() => console.log('0'));
            " 2>/dev/null || echo "0")
            
            echo "📊 Last block in December range: $recent_block"
        fi
        
    else
        echo "❌ Scanner Status: NOT RUNNING"
        echo ""
        echo "🚀 To start: nohup node robust-december-scanner.js > fast-scanner.log 2>&1 &"
        echo ""
        echo "📋 Last log entries:"
        tail -10 fast-scanner.log 2>/dev/null || echo "No log file found"
    fi
}

# Function to show live tail
show_live() {
    echo "🔴 LIVE SCANNER OUTPUT (Press Ctrl+C to exit):"
    echo "=============================================="
    tail -f fast-scanner.log
}

# Function to show stats every few seconds
show_stats() {
    while true; do
        clear
        echo "🔴 FAST SCANNER MONITOR"
        echo "======================"
        echo "⏰ $(date)"
        echo ""
        get_stats
        echo ""
        echo "🔄 Refreshing every 10 seconds... (Press Ctrl+C to exit)"
        sleep 10
    done
}

# Function to show database progress
show_db_progress() {
    echo "📊 Database Progress Check"
    echo "========================="
    echo ""
    
    if command -v node > /dev/null; then
        node -e "
            const { Pool } = require('pg');
            const pool = new Pool({
                connectionString: 'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db'
            });
            
            async function checkProgress() {
                try {
                    // Check total stakes
                    const totalResult = await pool.query('SELECT COUNT(*) as count FROM staking_rewards');
                    const totalStakes = totalResult.rows[0].count;
                    
                    // Check December 2020 range
                    const decemberResult = await pool.query('SELECT COUNT(*) as count FROM staking_rewards WHERE block_height BETWEEN 1299328 AND 1305000');
                    const decemberStakes = decemberResult.rows[0].count;
                    
                    // Check max block in December range
                    const maxResult = await pool.query('SELECT MAX(block_height) as max_block FROM staking_rewards WHERE block_height BETWEEN 1299328 AND 1305000');
                    const maxBlock = maxResult.rows[0].max_block;
                    
                    // Check recent stakes
                    const recentResult = await pool.query('SELECT block_height, identity_address, amount_sats FROM staking_rewards WHERE block_height BETWEEN 1299328 AND 1305000 ORDER BY block_height DESC LIMIT 5');
                    
                    console.log('📊 Database Status:');
                    console.log(\`   Total stakes: \${totalStakes}\`);
                    console.log(\`   December 2020 range stakes: \${decemberStakes}\`);
                    console.log(\`   Max block in December range: \${maxBlock}\`);
                    console.log('');
                    console.log('🎯 Recent stakes in December range:');
                    recentResult.rows.forEach(row => {
                        const amount = (row.amount_sats / 100000000).toFixed(8);
                        console.log(\`   Block \${row.block_height}: \${row.identity_address} - \${amount} VRSC\`);
                    });
                    
                } catch (error) {
                    console.error('❌ Error:', error.message);
                } finally {
                    await pool.end();
                }
            }
            
            checkProgress();
        "
    else
        echo "❌ Node.js not available"
    fi
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
    "db")
        show_db_progress
        ;;
    *)
        echo "Usage: $0 [live|stats|once|db]"
        echo ""
        echo "  live  - Show live tail of scanner output"
        echo "  stats - Show stats that refresh every 10 seconds"
        echo "  once  - Show current stats once"
        echo "  db    - Show database progress"
        echo ""
        echo "Examples:"
        echo "  $0 live    # Watch live scanner output"
        echo "  $0 stats   # Watch live stats (default)"
        echo "  $0 once    # Check status once"
        echo "  $0 db      # Check database progress"
        ;;
esac
