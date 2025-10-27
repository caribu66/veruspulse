#!/usr/bin/env node
/**
 * continue-scanning.js
 * Continues scanning from the last scanned block to catch up and keep gathering new data
 */

const { Pool } = require('pg');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

console.log('╔═══════════════════════════════════════════════╗');
console.log('║   Continue VerusID Scanning Service           ║');
console.log('╚═══════════════════════════════════════════════╝\n');

const dbConfig = {
  connectionString:
    process.env.DATABASE_URL ||
    'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
  max: 10,
};

const db = new Pool(dbConfig);

const BATCH_SIZE = 50; // Process 50 blocks at a time
const SCAN_INTERVAL = 30000; // Check for new blocks every 30 seconds
const MAX_BLOCKS_PER_BATCH = 1000; // Don't process more than 1000 blocks in one go

let stats = {
  blocksScanned: 0,
  stakesFound: 0,
  newVerusIDsFound: 0,
  startTime: Date.now(),
  isRunning: false,
};

// RPC helper
async function rpcCall(method, params = []) {
  const rpcUser = process.env.VERUS_RPC_USER || 'verus';
  const rpcPass = process.env.VERUS_RPC_PASSWORD || 'verus';
  const rpcHost = process.env.VERUS_RPC_HOST || '127.0.0.1';
  const rpcPort = process.env.VERUS_RPC_PORT || '18843';

  const rpcData = JSON.stringify({
    jsonrpc: '1.0',
    id: 'continue',
    method,
    params,
  });

  const curlCmd = `curl -s -u ${rpcUser}:${rpcPass} -H "Content-Type: application/json" -d '${rpcData}' http://${rpcHost}:${rpcPort}`;

  try {
    const { stdout } = await execAsync(curlCmd);
    const response = JSON.parse(stdout);

    if (response.error) {
      throw new Error(`RPC Error: ${response.error.message}`);
    }

    return response.result;
  } catch (error) {
    console.error(`RPC call failed for ${method}:`, error.message);
    throw error;
  }
}

// Get the highest scanned block from database
async function getHighestScannedBlock() {
  try {
    const result = await db.query(
      'SELECT MAX(block_height) as max_block FROM staking_rewards'
    );
    return result.rows[0]?.max_block || 800200; // Start from VerusID activation if no data
  } catch (error) {
    console.error('Error getting highest scanned block:', error.message);
    return 800200;
  }
}

// Get current blockchain height
async function getCurrentBlockHeight() {
  try {
    return await rpcCall('getblockcount');
  } catch (error) {
    console.error('Error getting current block height:', error.message);
    return null;
  }
}

// Get all VerusIDs from database
async function getAllVerusIDs() {
  try {
    const result = await db.query(`
      SELECT identity_address, base_name, friendly_name 
      FROM identities 
      WHERE identity_address LIKE 'i%'
    `);
    return result.rows;
  } catch (error) {
    console.error('Error getting VerusIDs:', error.message);
    return [];
  }
}

// Scan a single block for staking rewards
async function scanBlock(blockHeight, verusIDMap) {
  try {
    const blockHash = await rpcCall('getblockhash', [blockHeight]);
    const block = await rpcCall('getblock', [blockHash, 2]);

    if (!block || !block.tx) {
      return { stakes: 0, newVerusIDs: 0 };
    }

    let stakesFound = 0;
    let newVerusIDs = 0;

    // Check if this block has staking rewards
    for (const tx of block.tx) {
      if (tx.vout && tx.vout.length > 0) {
        for (const vout of tx.vout) {
          if (vout.scriptPubKey && vout.scriptPubKey.addresses) {
            for (const address of vout.scriptPubKey.addresses) {
              // Check if this is a VerusID address
              if (address.startsWith('i') && address.length > 20) {
                // Check if we know this VerusID
                if (!verusIDMap.has(address)) {
                  // New VerusID found - add to database
                  try {
                    await db.query(
                      `
                      INSERT INTO identities (identity_address, base_name, friendly_name, first_seen_block, last_refreshed_at)
                      VALUES ($1, $2, $3, $4, NOW())
                      ON CONFLICT (identity_address) DO NOTHING
                    `,
                      [address, 'unknown', `${address}@`, blockHeight]
                    );

                    verusIDMap.set(address, {
                      base_name: 'unknown',
                      friendly_name: `${address}@`,
                    });
                    newVerusIDs++;
                  } catch (error) {
                    // Ignore duplicate key errors
                  }
                }

                // Check if this is a staking reward
                if (vout.value > 0 && tx.vin && tx.vin.length > 0) {
                  // This looks like a staking reward
                  try {
                    await db.query(
                      `
                      INSERT INTO staking_rewards (
                        identity_address, txid, vout, block_height, block_hash, 
                        block_time, amount_sats, classifier, source_address
                      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                      ON CONFLICT (txid, vout) DO NOTHING
                    `,
                      [
                        address,
                        tx.txid,
                        vout.n,
                        blockHeight,
                        blockHash,
                        new Date(block.time * 1000),
                        Math.round(vout.value * 100000000), // Convert to satoshis
                        'staking_reward',
                        tx.vin[0]?.address || 'unknown',
                      ]
                    );

                    stakesFound++;
                  } catch (error) {
                    // Ignore duplicate key errors
                  }
                }
              }
            }
          }
        }
      }
    }

    return { stakes: stakesFound, newVerusIDs };
  } catch (error) {
    console.error(`Error scanning block ${blockHeight}:`, error.message);
    return { stakes: 0, newVerusIDs: 0 };
  }
}

// Main scanning function
async function scanBlocks(startHeight, endHeight, verusIDMap) {
  const totalBlocks = endHeight - startHeight + 1;
  let processedBlocks = 0;
  let totalStakes = 0;
  let totalNewVerusIDs = 0;

  console.log(
    `🔍 Scanning blocks ${startHeight} to ${endHeight} (${totalBlocks} blocks)`
  );

  for (let height = startHeight; height <= endHeight; height += BATCH_SIZE) {
    const batchEnd = Math.min(height + BATCH_SIZE - 1, endHeight);
    const batchSize = batchEnd - height + 1;

    console.log(
      `📦 Processing batch: blocks ${height} to ${batchEnd} (${batchSize} blocks)`
    );

    // Process blocks in parallel within the batch
    const promises = [];
    for (let blockHeight = height; blockHeight <= batchEnd; blockHeight++) {
      promises.push(scanBlock(blockHeight, verusIDMap));
    }

    try {
      const results = await Promise.all(promises);

      for (const result of results) {
        totalStakes += result.stakes;
        totalNewVerusIDs += result.newVerusIDs;
        processedBlocks++;
      }

      // Progress update
      const progress = ((processedBlocks / totalBlocks) * 100).toFixed(1);
      const elapsed = (Date.now() - stats.startTime) / 1000;
      const rate = processedBlocks / elapsed;
      const eta = (totalBlocks - processedBlocks) / rate;

      console.log(
        `   ✅ Batch complete: ${totalStakes} stakes, ${totalNewVerusIDs} new VerusIDs`
      );
      console.log(
        `   📊 Progress: ${progress}% (${processedBlocks}/${totalBlocks}) - Rate: ${rate.toFixed(1)} blocks/s - ETA: ${eta.toFixed(0)}s`
      );
    } catch (error) {
      console.error(
        `Error processing batch ${height}-${batchEnd}:`,
        error.message
      );
    }

    // Small delay to prevent overwhelming the RPC
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return { totalStakes, totalNewVerusIDs, processedBlocks };
}

// Main loop
async function main() {
  console.log('🚀 Starting continuous VerusID scanning...\n');

  // Get initial state
  const verusIDs = await getAllVerusIDs();
  const verusIDMap = new Map(verusIDs.map(v => [v.identity_address, v]));

  console.log(`📊 Found ${verusIDs.length} existing VerusIDs in database`);

  while (true) {
    try {
      const highestScanned = await getHighestScannedBlock();
      const currentHeight = await getCurrentBlockHeight();

      if (!currentHeight) {
        console.log(
          '❌ Could not get current block height, retrying in 30 seconds...'
        );
        await new Promise(resolve => setTimeout(resolve, SCAN_INTERVAL));
        continue;
      }

      const blocksToScan = currentHeight - highestScanned;

      if (blocksToScan <= 0) {
        console.log(
          `✅ Up to date! Current height: ${currentHeight}, Scanned: ${highestScanned}`
        );
        console.log(`⏳ Waiting for new blocks... (checking every 30 seconds)`);
        await new Promise(resolve => setTimeout(resolve, SCAN_INTERVAL));
        continue;
      }

      // Limit the number of blocks we process in one go
      const blocksToProcess = Math.min(blocksToScan, MAX_BLOCKS_PER_BATCH);
      const endHeight = highestScanned + blocksToProcess;

      console.log(
        `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
      );
      console.log(`🔄 Found ${blocksToScan} new blocks to scan`);
      console.log(
        `📦 Processing ${blocksToProcess} blocks (${highestScanned + 1} to ${endHeight})`
      );

      const result = await scanBlocks(
        highestScanned + 1,
        endHeight,
        verusIDMap
      );

      stats.blocksScanned += result.processedBlocks;
      stats.stakesFound += result.totalStakes;
      stats.newVerusIDsFound += result.totalNewVerusIDs;

      console.log(`\n📊 Batch Summary:`);
      console.log(`   • Blocks scanned: ${result.processedBlocks}`);
      console.log(`   • Stakes found: ${result.totalStakes}`);
      console.log(`   • New VerusIDs: ${result.totalNewVerusIDs}`);
      console.log(`\n📈 Total Progress:`);
      console.log(`   • Total blocks: ${stats.blocksScanned}`);
      console.log(`   • Total stakes: ${stats.stakesFound}`);
      console.log(`   • Total new VerusIDs: ${stats.newVerusIDsFound}`);
      console.log(
        `   • Runtime: ${((Date.now() - stats.startTime) / 1000 / 60).toFixed(1)} minutes`
      );

      // If we processed the maximum batch size, continue immediately
      if (blocksToProcess >= MAX_BLOCKS_PER_BATCH) {
        console.log(`⚡ Processed max batch size, continuing immediately...`);
        continue;
      }

      // Otherwise, wait before checking for more blocks
      console.log(`⏳ Waiting 30 seconds before checking for more blocks...`);
      await new Promise(resolve => setTimeout(resolve, SCAN_INTERVAL));
    } catch (error) {
      console.error('❌ Error in main loop:', error.message);
      console.log('⏳ Retrying in 30 seconds...');
      await new Promise(resolve => setTimeout(resolve, SCAN_INTERVAL));
    }
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  console.log(`📊 Final Stats:`);
  console.log(`   • Total blocks scanned: ${stats.blocksScanned}`);
  console.log(`   • Total stakes found: ${stats.stakesFound}`);
  console.log(`   • Total new VerusIDs: ${stats.newVerusIDsFound}`);
  console.log(
    `   • Runtime: ${((Date.now() - stats.startTime) / 1000 / 60).toFixed(1)} minutes`
  );
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Start the service
main().catch(error => {
  console.error('💥 Fatal error:', error.message);
  process.exit(1);
});
