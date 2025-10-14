#!/usr/bin/env node
/**
 * populate-verusids.js
 * Crawls the Verus blockchain to discover and populate VerusIDs in the database
 * Uses the existing verusAPI client for RPC calls
 */

const { Pool } = require('pg');

// Import from parent directory
const verusAPIPath = '../lib/rpc-client-robust.ts';

console.log('==================================================');
console.log('  VerusID Database Populator');
console.log('==================================================\n');

// Database configuration
const dbConfig = {
  connectionString: process.env.DATABASE_URL || 'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
  max: 5,
};

const db = new Pool(dbConfig);

// Configuration
const BATCH_SIZE = 100; // Blocks to process per batch
const DELAY_BETWEEN_BATCHES = 500; // ms
const MAX_CONCURRENT = 3; // Max concurrent RPC calls

let stats = {
  blocksProcessed: 0,
  verusIDsFound: 0,
  verusIDsInserted: 0,
  errors: 0,
  startTime: Date.now(),
};

// RPC helper (using curl since we can't easily import TypeScript)
async function rpcCall(method, params = []) {
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);
  
  const rpcUser = process.env.VERUS_RPC_USER || 'verus';
  const rpcPass = process.env.VERUS_RPC_PASSWORD || 'verus';
  const rpcHost = process.env.VERUS_RPC_HOST || '127.0.0.1';
  const rpcPort = process.env.VERUS_RPC_PORT || '27486';
  
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

// Get block count
async function getBlockCount() {
  return await rpcCall('getblockcount');
}

// Get block hash
async function getBlockHash(height) {
  return await rpcCall('getblockhash', [height]);
}

// Get block with transactions
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

// Insert VerusID into database
async function insertVerusID(iAddress) {
  try {
    // Try to get identity details
    let name = 'unknown';
    let friendlyName = `${name}.VRSC@`;
    
    try {
      const identity = await rpcCall('getidentity', [iAddress]);
      if (identity && identity.identity) {
        name = identity.identity.name || 'unknown';
        friendlyName = identity.fullyqualifiedname || `${name}.VRSC@`;
      }
    } catch (e) {
      // Identity lookup failed, use defaults
    }
    
    // Insert or update
    await db.query(`
      INSERT INTO identities (identity_address, base_name, friendly_name, last_refreshed_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (identity_address) 
      DO UPDATE SET last_refreshed_at = NOW()
    `, [iAddress, name, friendlyName]);
    
    stats.verusIDsInserted++;
    return true;
  } catch (error) {
    console.error(`Failed to insert ${iAddress}:`, error.message);
    stats.errors++;
    return false;
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
    
    // Insert addresses
    for (const addr of addresses) {
      await insertVerusID(addr);
    }
    
    if (addresses.size > 0) {
      console.log(`Block ${height}: Found ${addresses.size} VerusIDs`);
    }
    
    return addresses.size;
  } catch (error) {
    console.error(`Error processing block ${height}:`, error.message);
    stats.errors++;
    return 0;
  }
}

// Process a range of blocks
async function processRange(startHeight, endHeight) {
  console.log(`\nProcessing blocks ${startHeight} to ${endHeight}...\n`);
  
  for (let height = startHeight; height <= endHeight; height += BATCH_SIZE) {
    const batchEnd = Math.min(height + BATCH_SIZE - 1, endHeight);
    const batchPromises = [];
    
    // Process batch
    for (let h = height; h <= batchEnd && batchPromises.length < MAX_CONCURRENT; h++) {
      batchPromises.push(processBlock(h));
    }
    
    await Promise.all(batchPromises);
    
    // Progress report
    const elapsed = (Date.now() - stats.startTime) / 1000;
    const blocksPerSec = stats.blocksProcessed / elapsed;
    const remaining = endHeight - stats.blocksProcessed;
    const eta = remaining / blocksPerSec;
    
    console.log(`\nProgress: ${stats.blocksProcessed}/${endHeight - startHeight + 1} blocks`);
    console.log(`Found: ${stats.verusIDsFound} VerusIDs, Inserted: ${stats.verusIDsInserted}`);
    console.log(`Speed: ${blocksPerSec.toFixed(2)} blocks/sec, ETA: ${(eta / 60).toFixed(1)} min\n`);
    
    // Delay between batches
    await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
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
Usage: node populate-verusids.js [OPTIONS]

Options:
  -s, --start HEIGHT    Start block height (default: 1)
  -e, --end HEIGHT      End block height (default: current)
  -h, --help            Show this help

Examples:
  # Populate from recent 10,000 blocks
  node populate-verusids.js --start 3760000 --end 3770000
  
  # Populate entire blockchain
  node populate-verusids.js
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
    console.log('\n==================================================');
    console.log('  Crawl Complete!');
    console.log('==================================================');
    console.log(`Blocks processed: ${stats.blocksProcessed}`);
    console.log(`VerusIDs found: ${stats.verusIDsFound}`);
    console.log(`VerusIDs inserted: ${stats.verusIDsInserted}`);
    console.log(`Errors: ${stats.errors}`);
    console.log(`Total time: ${(totalTime / 60).toFixed(1)} minutes`);
    console.log(`Speed: ${(stats.blocksProcessed / totalTime).toFixed(2)} blocks/sec\n`);
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  } finally {
    await db.end();
  }
}

// Run
main().catch(console.error);

