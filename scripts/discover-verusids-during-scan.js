#!/usr/bin/env node
/**
 * discover-verusids-during-scan.js
 * Runs alongside the stake scanner to discover NEW VerusIDs from historical blocks
 * Adds them to the identities table as they're discovered
 */

const { Pool } = require('pg');

console.log('╔═══════════════════════════════════════════════╗');
console.log('║   VerusID Discovery Service (Continuous)      ║');
console.log('╚═══════════════════════════════════════════════╝\n');

const dbConfig = {
  connectionString: process.env.DATABASE_URL || 'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
  max: 10,
};

const db = new Pool(dbConfig);

const VERUSID_ACTIVATION_BLOCK = 800200;
const BATCH_SIZE = 100;
const SCAN_INTERVAL = 60000; // Check progress every 60 seconds

let stats = {
  blocksScanned: 0,
  newVerusIDsFound: 0,
  totalVerusIDs: 0,
  startTime: Date.now(),
  lastCheckBlock: VERUSID_ACTIVATION_BLOCK,
};

// RPC helper
async function rpcCall(method, params = []) {
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);
  
  const rpcUser = process.env.VERUS_RPC_USER || 'verus';
  const rpcPass = process.env.VERUS_RPC_PASSWORD || 'verus';
  const rpcHost = process.env.VERUS_RPC_HOST || '127.0.0.1';
  const rpcPort = process.env.VERUS_RPC_PORT || '18843';
  
  const rpcData = JSON.stringify({
    jsonrpc: '1.0',
    id: 'discover',
    method,
    params,
  });
  
  const escapedData = rpcData.replace(/'/g, "'\\''");
  const cmd = `curl -s --user ${rpcUser}:${rpcPass} --data-binary '${escapedData}' -H 'content-type: text/plain;' http://${rpcHost}:${rpcPort}/`;
  
  try {
    const { stdout } = await execAsync(cmd, { maxBuffer: 10 * 1024 * 1024 });
    const result = JSON.parse(stdout);
    if (result.error) {
      throw new Error(result.error.message);
    }
    return result.result;
  } catch (error) {
    throw new Error(`RPC call failed: ${error.message}`);
  }
}

// Get highest block scanned by the stake scanner
async function getHighestScannedBlock() {
  const result = await db.query('SELECT MAX(block_height) as max_block FROM staking_rewards');
  return result.rows[0].max_block || VERUSID_ACTIVATION_BLOCK;
}

// Check if VerusID already exists in database
async function verusIDExists(address) {
  const result = await db.query('SELECT 1 FROM identities WHERE identity_address = $1', [address]);
  return result.rows.length > 0;
}

// Insert new VerusID
async function insertVerusID(address) {
  try {
    // Try to get identity details
    let name = 'unknown';
    let friendlyName = 'unknown.VRSC@';
    
    try {
      const identity = await rpcCall('getidentity', [address]);
      if (identity && identity.identity) {
        name = identity.identity.name || 'unknown';
        friendlyName = identity.fullyqualifiedname || identity.friendlyname || `${name}.VRSC@`;
      }
    } catch (e) {
      // Identity lookup failed, use defaults
    }
    
    await db.query(`
      INSERT INTO identities (identity_address, base_name, friendly_name, last_refreshed_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (identity_address) DO NOTHING
    `, [address, name, friendlyName]);
    
    stats.newVerusIDsFound++;
    console.log(`  ✓ New: ${address} → ${friendlyName}`);
    
  } catch (error) {
    console.error(`  ✗ Error inserting ${address}: ${error.message}`);
  }
}

// Scan a range for new I-addresses
async function scanRangeForIAddresses(startBlock, endBlock) {
  const newAddresses = new Set();
  
  for (let height = startBlock; height <= endBlock; height++) {
    try {
      const hash = await rpcCall('getblockhash', [height]);
      const block = await rpcCall('getblock', [hash, 2]);
      
      if (block && block.tx) {
        for (const tx of block.tx) {
          if (!tx.vout) continue;
          
          for (const vout of tx.vout) {
            if (!vout.scriptPubKey || !vout.scriptPubKey.addresses) continue;
            
            for (const addr of vout.scriptPubKey.addresses) {
              if (addr && addr.startsWith('i')) {
                newAddresses.add(addr);
              }
            }
          }
        }
      }
      
      stats.blocksScanned++;
    } catch (error) {
      if (!error.message.includes('maxBuffer')) {
        // Silently skip errors
      }
    }
  }
  
  return newAddresses;
}

// Main discovery loop
async function discoveryLoop() {
  console.log('Starting continuous VerusID discovery...');
  console.log('Following behind the stake scanner\n');
  
  while (true) {
    try {
      // Get the current state
      const highestScannedBlock = await getHighestScannedBlock();
      const currentTotal = await db.query('SELECT COUNT(*) as count FROM identities WHERE identity_address LIKE \'i%\'');
      stats.totalVerusIDs = parseInt(currentTotal.rows[0].count);
      
      // Calculate range to scan (behind the stake scanner by ~1000 blocks for safety)
      const scanUpTo = Math.max(stats.lastCheckBlock, highestScannedBlock - 1000);
      
      if (scanUpTo > stats.lastCheckBlock) {
        const scanFrom = stats.lastCheckBlock;
        const scanTo = Math.min(scanFrom + BATCH_SIZE - 1, scanUpTo);
        
        console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`🔍 Scanning blocks ${scanFrom} to ${scanTo}`);
        console.log(`   (Following stake scanner at block ${highestScannedBlock})`);
        
        // Scan for I-addresses
        const addresses = await scanRangeForIAddresses(scanFrom, scanTo);
        
        console.log(`   Found ${addresses.size} I-addresses in ${scanTo - scanFrom + 1} blocks`);
        
        // Check which are new
        let newCount = 0;
        for (const addr of addresses) {
          const exists = await verusIDExists(addr);
          if (!exists) {
            await insertVerusID(addr);
            newCount++;
          }
        }
        
        if (newCount > 0) {
          console.log(`   ✅ Added ${newCount} NEW VerusIDs to database!`);
        }
        
        stats.lastCheckBlock = scanTo + 1;
        
        // Progress summary
        const elapsed = (Date.now() - stats.startTime) / 1000;
        console.log(`\n📊 Summary:`);
        console.log(`   Total VerusIDs in DB: ${stats.totalVerusIDs}`);
        console.log(`   New discovered: ${stats.newVerusIDsFound}`);
        console.log(`   Blocks checked: ${stats.blocksScanned}`);
        console.log(`   Runtime: ${(elapsed / 3600).toFixed(1)} hours`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        
      } else {
        console.log(`\n⏸️  Waiting for stake scanner to progress...`);
        console.log(`   Current position: Block ${scanUpTo}`);
        console.log(`   Total VerusIDs: ${stats.totalVerusIDs}`);
      }
      
      // Wait before next check
      console.log(`\n💤 Sleeping for ${SCAN_INTERVAL / 1000} seconds...\n`);
      await new Promise(resolve => setTimeout(resolve, SCAN_INTERVAL));
      
    } catch (error) {
      console.error(`\n❌ Error in discovery loop: ${error.message}`);
      console.log('Retrying in 60 seconds...\n');
      await new Promise(resolve => setTimeout(resolve, 60000));
    }
  }
}

// Main
async function main() {
  try {
    // Initial state
    const result = await db.query('SELECT COUNT(*) as count FROM identities WHERE identity_address LIKE \'i%\'');
    stats.totalVerusIDs = parseInt(result.rows[0].count);
    
    console.log(`📚 Current VerusIDs in database: ${stats.totalVerusIDs}`);
    console.log(`🎯 Starting from block: ${VERUSID_ACTIVATION_BLOCK}`);
    console.log(`⏱️  Check interval: ${SCAN_INTERVAL / 1000} seconds\n`);
    
    stats.startTime = Date.now();
    await discoveryLoop();
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\n🛑 Shutting down...');
  console.log(`\n📊 Final Stats:`);
  console.log(`   New VerusIDs discovered: ${stats.newVerusIDsFound}`);
  console.log(`   Total in database: ${stats.totalVerusIDs}`);
  console.log(`   Blocks checked: ${stats.blocksScanned}`);
  await db.end();
  process.exit(0);
});

main().catch(console.error);

