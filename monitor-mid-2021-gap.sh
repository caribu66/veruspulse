#!/bin/bash

# Monitor Mid 2021 Gap Scanner
# Provides real-time monitoring of the gap scanner progress

echo "🎯 MID 2021 GAP SCANNER MONITOR"
echo "==============================="
echo ""

# Function to check scanner status
check_scanner_status() {
    echo "📊 Scanner Status:"
    if pgrep -f "mid-2021-gap-scanner.js" > /dev/null; then
        echo "   ✅ Scanner is RUNNING"
        echo "   📍 PID: $(pgrep -f mid-2021-gap-scanner.js)"
    else
        echo "   ❌ Scanner is NOT running"
    fi
    echo ""
}

# Function to show recent log activity
show_recent_activity() {
    echo "📝 Recent Activity (last 10 lines):"
    if [ -f "mid-2021-gap-scanner.log" ]; then
        tail -10 mid-2021-gap-scanner.log
    else
        echo "   ❌ Log file not found"
    fi
    echo ""
}

# Function to show database progress
show_database_progress() {
    echo "💾 Database Progress:"
    node -e "
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: 'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db'
    });

    async function checkProgress() {
      try {
        // Total stakes
        const total = await pool.query('SELECT COUNT(*) as total FROM staking_rewards');
        console.log('   📊 Total stakes:', total.rows[0].total);
        
        // Mid 2021 range
        const mid2021 = await pool.query(\`
          SELECT COUNT(*) as count 
          FROM staking_rewards 
          WHERE block_height >= 2000000 AND block_height <= 2100000
        \`);
        console.log('   🎯 Mid 2021 range (2.0M-2.1M):', mid2021.rows[0].count);
        
        // Recent stakes in range
        const recent = await pool.query(\`
          SELECT COUNT(*) as count 
          FROM staking_rewards 
          WHERE block_height >= 2000000 AND block_height <= 2100000
          AND block_time > NOW() - INTERVAL '1 hour'
        \`);
        console.log('   ⏰ Recent (last hour):', recent.rows[0].count);
        
      } catch (error) {
        console.error('   ❌ Error:', error.message);
      } finally {
        await pool.end();
      }
    }

    checkProgress();
    "
    echo ""
}

# Function to show scanner statistics
show_scanner_stats() {
    echo "📈 Scanner Statistics:"
    if [ -f "mid-2021-gap-scanner.log" ]; then
        # Count PoS blocks found
        pos_blocks=$(grep "PoS #" mid-2021-gap-scanner.log | wc -l)
        echo "   🎯 PoS blocks found: $pos_blocks"
        
        # Count stakes found
        stakes_found=$(grep "Found.*stake" mid-2021-gap-scanner.log | wc -l)
        echo "   💰 I-address stakes found: $stakes_found"
        
        # Show recent stakes
        echo "   🔍 Recent stakes:"
        grep "Found.*stake" mid-2021-gap-scanner.log | tail -3 | while read line; do
            echo "      $line"
        done
    else
        echo "   ❌ Log file not found"
    fi
    echo ""
}

# Function to show progress percentage
show_progress() {
    echo "📊 Progress:"
    if [ -f "mid-2021-gap-scanner.log" ]; then
        # Extract current block from log
        current_block=$(grep "Processing batch" mid-2021-gap-scanner.log | tail -1 | grep -o "blocks [0-9,]*" | grep -o "[0-9,]*" | head -1 | tr -d ',')
        if [ -n "$current_block" ]; then
            start_block=2000000
            end_block=2100000
            total_blocks=$((end_block - start_block + 1))
            processed_blocks=$((current_block - start_block))
            progress=$((processed_blocks * 100 / total_blocks))
            echo "   📍 Current block: $current_block"
            echo "   📊 Progress: $progress% ($processed_blocks/$total_blocks blocks)"
            echo "   ⏱️  Remaining: $((total_blocks - processed_blocks)) blocks"
        else
            echo "   🔍 Scanning in progress..."
        fi
    else
        echo "   ❌ Log file not found"
    fi
    echo ""
}

# Main monitoring loop
while true; do
    clear
    echo "🎯 MID 2021 GAP SCANNER MONITOR - $(date)"
    echo "=========================================="
    echo ""
    
    check_scanner_status
    show_progress
    show_database_progress
    show_scanner_stats
    show_recent_activity
    
    echo "🔄 Refreshing in 10 seconds... (Ctrl+C to exit)"
    sleep 10
done
