#!/usr/bin/env node
/**
 * fast-populate-verusids.js
 * Quickly crawls blocks to find I-addresses WITHOUT calling getidentity
 * Much faster - names can be populated later
 */

const { Pool } = require('pg');

console.log('==================================================');
console.log('  Fast VerusID I-Address Collector');
console.log('==================================================\n');

// Database configuration
const dbConfig = {
  connectionString: process.env.DATABASE_URL || 'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
  max: 5,
};

const db = new Pool(dbConfig);

// Configuration
const BATCH_SIZE = 100; // Blocks to process per batch
const MAX_CONCURRENT = 10; // Max concurrent RPC calls (increased since no getidentity)

let stats = {
  blocksProcessed: 0,
  verusIDsFound: 0,
  verusIDsInserted: 0,
  errors: 0,
  startTime: Date.now(),
};

// Set to track unique addresses in memory (avoid duplicate inserts in same run)
const seenAddresses = new Set();

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
    id: 'populate',
    method,
    params,
  });
  
  const cmd = `curl -s --user ${rpcUser}:${rpcPass} --data-binary '${rpcData}' -H 'content-type: text/plain;' http://${rpcHost}:${rpcPort}/`;
  
  try {
    const { stdout } = await execAsync(cmd);
    const result = JSON.parse(stdout);
    if (result.error) {
      throw new Error(result.error.message || JSON.stringify(result.error));
    }
    return result.result;
  } catch (error) {
    throw new Error(`RPC call failed: ${error.message}`);
  }
}

async function getBlockCount() {
  return await rpcCall('getblockcount');
}

async function getBlockHash(height) {
  return await rpcCall('getblockhash', [height]);
}

async function getBlock(hash) {
  return await rpcCall('getblock', [hash, 2]);
}

// Extract I-addresses from block
function extractIAddresses(block) {
  const addresses = new Set();
  
  if (!block || !block.tx) {
    return addresses;
  }
  
  for (const tx of block.tx) {
    if (!tx.vout) continue;
    
    for (const vout of tx.vout) {
      if (!vout.scriptPubKey || !vout.scriptPubKey.addresses) continue;
      
      for (const addr of vout.scriptPubKey.addresses) {
        if (addr && addr.startsWith('i')) {
          addresses.add(addr);
        }
      }
    }
  }
  
  return addresses;
}

// Batch insert VerusIDs (fast, no RPC lookups)
async function batchInsertAddresses(addresses) {
  if (addresses.length === 0) return 0;
  
  try {
    // Build bulk insert query
    const values = addresses.map(addr => `('${addr}', 'unknown', 'unknown.VRSC@', NOW())`).join(',');
    
    const query = `
      INSERT INTO identities (identity_address, base_name, friendly_name, last_refreshed_at)
      VALUES ${values}
      ON CONFLICT (identity_address) 
      DO UPDATE SET last_refreshed_at = NOW()
      RETURNING identity_address
    `;
    
    const result = await db.query(query);
    return result.rowCount || 0;
  } catch (error) {
    console.error(`Failed to batch insert:`, error.message);
    stats.errors++;
    return 0;
  }
}

// Process a single block
async function processBlock(height) {
  try {
    const hash = await getBlockHash(height);
    const block = await getBlock(hash);
    const addresses = extractIAddresses(block);
    
    stats.blocksProcessed++;
    stats.verusIDsFound += addresses.size;
    
    // Collect new addresses for batch insert
    const newAddresses = [];
    for (const addr of addresses) {
      if (!seenAddresses.has(addr)) {
        seenAddresses.add(addr);
        newAddresses.push(addr);
      }
    }
    
    return newAddresses;
  } catch (error) {
    console.error(`Error processing block ${height}:`, error.message);
    stats.errors++;
    return [];
  }
}

// Process a range of blocks
async function processRange(startHeight, endHeight) {
  console.log(`\nProcessing blocks ${startHeight} to ${endHeight}...\n`);
  
  const batchesToInsert = [];
  
  for (let height = startHeight; height <= endHeight; height += BATCH_SIZE) {
    const batchEnd = Math.min(height + BATCH_SIZE - 1, endHeight);
    const batchPromises = [];
    
    // Process batch
    for (let h = height; h <= batchEnd && h <= endHeight; h++) {
      batchPromises.push(processBlock(h));
    }
    
    const results = await Promise.all(batchPromises);
    
    // Collect all new addresses from this batch
    const newAddresses = results.flat();
    
    // Batch insert every 100 addresses
    if (newAddresses.length > 0) {
      const inserted = await batchInsertAddresses(newAddresses);
      stats.verusIDsInserted += inserted;
      
      if (newAddresses.length > 0) {
        console.log(`Batch ${height}-${batchEnd}: Found ${newAddresses.length} new I-addresses`);
      }
    }
    
    // Progress report every batch
    const elapsed = (Date.now() - stats.startTime) / 1000;
    const blocksPerSec = stats.blocksProcessed / elapsed;
    const totalBlocks = endHeight - startHeight + 1;
    const remaining = totalBlocks - stats.blocksProcessed;
    const eta = remaining / blocksPerSec;
    
    if (stats.blocksProcessed % 500 === 0) {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`Progress: ${stats.blocksProcessed}/${totalBlocks} blocks (${((stats.blocksProcessed/totalBlocks)*100).toFixed(1)}%)`);
      console.log(`Found: ${stats.verusIDsFound} I-addresses (${seenAddresses.size} unique)`);
      console.log(`Inserted: ${stats.verusIDsInserted} into database`);
      console.log(`Speed: ${blocksPerSec.toFixed(1)} blocks/sec`);
      console.log(`ETA: ${(eta / 60).toFixed(1)} minutes (${(eta / 3600).toFixed(1)} hours)`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    }
  }
}

// Main function
async function main() {
  try {
    const args = process.argv.slice(2);
    let startHeight = 1;
    let endHeight = null;
    
    // Parse arguments
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--start' || args[i] === '-s') {
        startHeight = parseInt(args[++i]);
      } else if (args[i] === '--end' || args[i] === '-e') {
        endHeight = parseInt(args[++i]);
      } else if (args[i] === '--help' || args[i] === '-h') {
        console.log(`
Usage: node fast-populate-verusids.js [OPTIONS]

Options:
  -s, --start HEIGHT    Start block height (default: 1)
  -e, --end HEIGHT      End block height (default: current)
  -h, --help            Show this help

Examples:
  # Fast scan last 50,000 blocks
  node fast-populate-verusids.js --start 3720711 --end 3770711
  
  # Fast scan entire blockchain
  node fast-populate-verusids.js

Note: This script collects I-addresses quickly without calling getidentity().
      Names will show as "unknown" until you run update scripts later.
        `);
        process.exit(0);
      }
    }
    
    // Get current height if not specified
    if (!endHeight) {
      console.log('Fetching current blockchain height...');
      endHeight = await getBlockCount();
      console.log(`Current height: ${endHeight}\n`);
    }
    
    // Test database connection
    console.log('Testing database connection...');
    const dbTest = await db.query('SELECT COUNT(*) FROM identities');
    console.log(`Current VerusIDs in database: ${dbTest.rows[0].count}\n`);
    
    // Start processing
    stats.startTime = Date.now();
    await processRange(startHeight, endHeight);
    
    // Final stats
    const totalTime = (Date.now() - stats.startTime) / 1000;
    console.log('\n╔════════════════════════════════════════════════╗');
    console.log('║          CRAWL COMPLETE!                       ║');
    console.log('╚════════════════════════════════════════════════╝');
    console.log(`Blocks processed: ${stats.blocksProcessed}`);
    console.log(`I-addresses found: ${stats.verusIDsFound} (${seenAddresses.size} unique)`);
    console.log(`I-addresses inserted: ${stats.verusIDsInserted}`);
    console.log(`Errors: ${stats.errors}`);
    console.log(`Total time: ${(totalTime / 60).toFixed(1)} minutes (${(totalTime / 3600).toFixed(2)} hours)`);
    console.log(`Speed: ${(stats.blocksProcessed / totalTime).toFixed(1)} blocks/sec\n`);
    
    // Suggest next steps
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Next Steps:');
    console.log('1. Check database: ./scripts/check-crawler-progress.sh');
    console.log('2. Update names: node scripts/update-verusid-names.js');
    console.log('3. Start scanner: Use the mass scanner to get staking stats');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  } finally {
    await db.end();
  }
}

// Run
main().catch(console.error);

