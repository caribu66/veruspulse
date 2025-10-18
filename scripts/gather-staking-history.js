#!/usr/bin/env node
/**
 * Gather Staking History for All VerusIDs
 *
 * This script scans the blockchain for PoS blocks and records
 * staking events for all known VerusIDs.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
const { Pool } = require('pg');
const fetch = require('node-fetch');

// Configuration from environment
const RPC_URL = process.env.VERUS_RPC_HOST || 'http://192.168.86.89:18843';
const RPC_USER = process.env.VERUS_RPC_USER || 'verus';
const RPC_PASS = process.env.VERUS_RPC_PASSWORD || 'verus';
const DB_URL =
  process.env.DATABASE_URL ||
  'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db';

console.log(
  `[Config] Loaded environment from: ${path.join(__dirname, '..', '.env.local')}`
);
console.log(`[Config] RPC: ${RPC_URL}`);
console.log(`[Config] DB: ${DB_URL.replace(/:[^:@]+@/, ':***@')}`);

const CONCURRENT_REQUESTS = 2;
const REQUEST_DELAY = 200; // ms between requests
const BATCH_SIZE = 100; // blocks to process in one batch

// Database connection
const pool = new Pool({ connectionString: DB_URL });

// RPC client
async function rpcCall(method, params = []) {
  const response = await fetch(RPC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization:
        'Basic ' + Buffer.from(`${RPC_USER}:${RPC_PASS}`).toString('base64'),
    },
    body: JSON.stringify({
      jsonrpc: '1.0',
      id: Date.now(),
      method,
      params,
    }),
  });

  const data = await response.json();
  if (data.error) {
    throw new Error(`RPC Error: ${data.error.message}`);
  }
  return data.result;
}

// Get all VerusID addresses from database
async function getAllVerusIDs() {
  const result = await pool.query(
    `SELECT DISTINCT identity_address 
     FROM identities 
     WHERE identity_address LIKE 'i%' 
     ORDER BY identity_address`
  );
  return result.rows.map(r => r.identity_address);
}

// Get current blockchain height
async function getBlockCount() {
  return await rpcCall('getblockcount');
}

// Wait for daemon to be ready
async function waitForDaemon(maxRetries = 30) {
  console.log('⏳ Waiting for daemon to be ready...');
  for (let i = 0; i < maxRetries; i++) {
    try {
      const info = await rpcCall('getblockchaininfo');
      if (info && info.blocks) {
        console.log(`✅ Daemon is ready! Current height: ${info.blocks}\n`);
        return true;
      }
    } catch (error) {
      if (error.message.includes('Loading')) {
        console.log(`   Attempt ${i + 1}/${maxRetries}: ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
      } else {
        throw error;
      }
    }
  }
  throw new Error('Daemon did not become ready in time');
}

// Get last scanned block height
async function getLastScannedBlock() {
  const result = await pool.query(
    `SELECT MAX(block_height) as max_height FROM stake_events`
  );
  return result.rows[0]?.max_height || 0;
}

// Check if block is PoS and which address staked it
async function getBlockStaker(blockHash) {
  try {
    const block = await rpcCall('getblock', [blockHash, 2]); // verbosity 2 for full tx data

    // Check if it's a PoS block
    if (!block.proofOfStake) {
      return null;
    }

    // First transaction is the coinstake transaction in PoS blocks
    if (!block.tx || block.tx.length === 0) {
      return null;
    }

    const coinstake = block.tx[0];

    // Get the staker address from the first vout
    if (coinstake.vout && coinstake.vout.length > 0) {
      const vout = coinstake.vout[0];
      if (
        vout.scriptPubKey &&
        vout.scriptPubKey.addresses &&
        vout.scriptPubKey.addresses.length > 0
      ) {
        const stakerAddress = vout.scriptPubKey.addresses[0];

        // Calculate reward (sum of outputs minus inputs)
        let totalOut = 0;
        for (const output of coinstake.vout) {
          totalOut += output.value || 0;
        }

        return {
          address: stakerAddress,
          reward: totalOut,
          blockHeight: block.height,
          blockTime: block.time,
          blockHash: block.hash,
        };
      }
    }

    return null;
  } catch (error) {
    console.error(`Error processing block ${blockHash}:`, error.message);
    return null;
  }
}

// Save stake event to database
async function saveStakeEvent(event, verusIDMap) {
  // Check if this address is a VerusID
  if (!verusIDMap.has(event.address)) {
    return false; // Not a VerusID, skip
  }

  try {
    await pool.query(
      `INSERT INTO stake_events (
        staker_address, block_height, block_hash, block_time, reward_amount
      ) VALUES ($1, $2, $3, to_timestamp($4), $5)
      ON CONFLICT (block_hash) DO NOTHING`,
      [
        event.address,
        event.blockHeight,
        event.blockHash,
        event.blockTime,
        event.reward,
      ]
    );
    return true;
  } catch (error) {
    console.error(`Error saving stake event:`, error.message);
    return false;
  }
}

// Main scanning function
async function scanBlockRange(startHeight, endHeight, verusIDMap) {
  console.log(`\n📊 Scanning blocks ${startHeight} to ${endHeight}...`);

  let found = 0;
  let processed = 0;

  for (let height = startHeight; height <= endHeight; height++) {
    try {
      const blockHash = await rpcCall('getblockhash', [height]);
      const stakeEvent = await getBlockStaker(blockHash);

      if (stakeEvent && (await saveStakeEvent(stakeEvent, verusIDMap))) {
        found++;
        console.log(
          `  ✅ Block ${height}: ${stakeEvent.address} staked (${stakeEvent.reward.toFixed(2)} VRSC)`
        );
      }

      processed++;

      if (processed % 100 === 0) {
        console.log(
          `  Progress: ${processed}/${endHeight - startHeight + 1} blocks (${found} stakes found)`
        );
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY));
    } catch (error) {
      console.error(`  Error at block ${height}:`, error.message);
    }
  }

  console.log(
    `✅ Batch complete: ${found} VerusID stakes found in ${processed} blocks\n`
  );
  return found;
}

// Main function
async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     VerusID Staking History Gatherer                      ║');
  console.log(
    '╚════════════════════════════════════════════════════════════╝\n'
  );

  try {
    // Get all VerusIDs
    console.log('📋 Loading VerusIDs from database...');
    const verusIDs = await getAllVerusIDs();
    const verusIDMap = new Set(verusIDs);
    console.log(`   Found ${verusIDs.length} VerusIDs to track\n`);

    // Wait for daemon to be ready
    await waitForDaemon();

    // Get blockchain height
    console.log('⛓️  Checking blockchain status...');
    const currentHeight = await getBlockCount();
    const lastScanned = await getLastScannedBlock();
    console.log(`   Current height: ${currentHeight}`);
    console.log(`   Last scanned: ${lastScanned || 'Never'}`);
    console.log(`   Blocks to scan: ${currentHeight - (lastScanned || 1)}\n`);

    const startHeight = (lastScanned || 1) + 1;

    if (startHeight > currentHeight) {
      console.log('✅ Already up to date!');
      process.exit(0);
    }

    // Scan in batches
    console.log(
      `🚀 Starting scan from block ${startHeight} to ${currentHeight}...\n`
    );

    let totalFound = 0;
    for (
      let batchStart = startHeight;
      batchStart <= currentHeight;
      batchStart += BATCH_SIZE
    ) {
      const batchEnd = Math.min(batchStart + BATCH_SIZE - 1, currentHeight);
      const found = await scanBlockRange(batchStart, batchEnd, verusIDMap);
      totalFound += found;

      console.log(`📊 Total stakes found so far: ${totalFound}`);
      console.log(
        `📈 Progress: ${Math.round(((batchEnd - startHeight + 1) / (currentHeight - startHeight + 1)) * 100)}%\n`
      );
    }

    // Final statistics
    console.log(
      '\n╔════════════════════════════════════════════════════════════╗'
    );
    console.log(
      '║                   SCAN COMPLETE!                          ║'
    );
    console.log(
      '╚════════════════════════════════════════════════════════════╝'
    );
    console.log(`\n📊 Statistics:`);
    console.log(`   Total blocks scanned: ${currentHeight - startHeight + 1}`);
    console.log(`   VerusID stakes found: ${totalFound}`);
    console.log(`   VerusIDs tracked: ${verusIDs.length}`);

    const totalStakes = await pool.query('SELECT COUNT(*) FROM stake_events');
    console.log(`   Total stakes in database: ${totalStakes.rows[0].count}\n`);
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', async () => {
  console.log('\n\n⚠️  Interrupted by user. Saving progress...');
  await pool.end();
  process.exit(0);
});

// Run
if (require.main === module) {
  main().catch(console.error);
}
