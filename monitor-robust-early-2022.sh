#!/bin/bash

echo "🛡️ ROBUST EARLY 2022 SCANNER MONITOR"
echo "====================================="
echo ""

# Check if scanner is running
if pgrep -f "robust-early-2022-scanner" > /dev/null; then
    echo "✅ Robust scanner is running (PID: $(pgrep -f 'robust-early-2022-scanner'))"
    echo ""
    
    # Show recent activity
    echo "📈 RECENT ACTIVITY:"
    tail -10 robust-early-2022-scanner.log
    echo ""
    
    # Calculate progress
    echo "📊 PROGRESS CALCULATION:"
    node -e "
    // Calculate progress for Robust Early 2022 scanner (2.3M-2.4M range)
    const startBlock = 2300000;
    const endBlock = 2400000;
    const totalBlocks = endBlock - startBlock + 1;
    
    // Get current block from log (look for last processed block)
    const fs = require('fs');
    let currentBlock = startBlock;
    
    try {
        const logContent = fs.readFileSync('robust-early-2022-scanner.log', 'utf8');
        const lines = logContent.split('\n');
        
        // Find the last block processed
        for (let i = lines.length - 1; i >= 0; i--) {
            const line = lines[i];
            if (line.includes('Block ') && line.includes(': PoS block')) {
                const match = line.match(/Block (\d+):/);
                if (match) {
                    currentBlock = parseInt(match[1]);
                    break;
                }
            }
        }
    } catch (error) {
        console.log('Could not read log file, using start block');
    }
    
    const processedBlocks = currentBlock - startBlock;
    const progress = (processedBlocks / totalBlocks * 100).toFixed(2);
    const remainingBlocks = endBlock - currentBlock;
    
    console.log('   📍 Range: 2.3M to 2.4M (' + totalBlocks.toLocaleString() + ' blocks)');
    console.log('   📊 Current block: ' + currentBlock.toLocaleString());
    console.log('   📈 Progress: ' + progress + '% (' + processedBlocks.toLocaleString() + '/' + totalBlocks.toLocaleString() + ')');
    console.log('   ⏳ Remaining: ' + remainingBlocks.toLocaleString() + ' blocks');
    
    // Calculate ETA
    const speed = 10; // blocks/sec from robust settings
    const etaSeconds = remainingBlocks / speed;
    const etaMinutes = Math.round(etaSeconds / 60);
    const etaHours = Math.round(etaMinutes / 60);
    
    console.log('   ⚡ Speed: ~' + speed + ' blocks/sec (robust)');
    console.log('   ⏱️  ETA: ' + etaMinutes + ' minutes (' + etaHours + ' hours)');
    "
    echo ""
    
    # Check database status
    echo "💾 DATABASE STATUS:"
    node -e "
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: 'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
    });
    
    async function checkStatus() {
      try {
        const result = await pool.query(\`
          SELECT 
            COUNT(*) as total_stakes,
            COUNT(DISTINCT identity_address) as unique_identities
          FROM staking_rewards 
          WHERE block_height BETWEEN 2300000 AND 2400000
        \`);
        
        console.log('   💰 Total stakes in Early 2022: ' + result.rows[0].total_stakes.toLocaleString());
        console.log('   👥 Unique identities: ' + result.rows[0].unique_identities.toLocaleString());
        
        // Recent stakes
        const recentResult = await pool.query(\`
          SELECT identity_address, block_height, amount_sats
          FROM staking_rewards 
          WHERE block_height BETWEEN 2300000 AND 2400000
          ORDER BY block_height DESC
          LIMIT 3
        \`);
        
        console.log('   🆕 Recent stakes:');
        recentResult.rows.forEach(row => {
          console.log('      ' + row.identity_address + ' - Block ' + row.block_height.toLocaleString() + ' - ' + (row.amount_sats/100000000).toFixed(8) + ' VRSC');
        });
        
      } catch (error) {
        console.error('❌ Error checking database:', error.message);
      } finally {
        await pool.end();
      }
    }
    
    checkStatus();
    "
    
else
    echo "❌ Robust scanner is not running"
    echo ""
    echo "📋 Available commands:"
    echo "   Start scanner: nohup node robust-early-2022-scanner.js > robust-early-2022-scanner.log 2>&1 &"
    echo "   View log: tail -f robust-early-2022-scanner.log"
    echo "   Stop scanner: kill \$(pgrep -f 'robust-early-2022-scanner')"
fi

echo ""
echo "🔄 Refresh this monitor: ./monitor-robust-early-2022.sh"



