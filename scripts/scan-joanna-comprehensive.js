#!/usr/bin/env node

/**
 * Comprehensive Joanna@ Stake Scanner
 * Scans from VerusID activation block (800200) to current tip
 * For wallet verification comparison
 */

const { Pool } = require('pg');
const https = require('https');

// Database connection
const pool = new Pool({
  connectionString:
    'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
});

// Joanna@ I-address
const JOANNA_IADDR = 'iPZkWmFAhQSFsgKiLExowaoXvzaor2bBZ5';

// Configuration
const BATCH_SIZE = 100; // Process 100 blocks at a time
const RPC_URL = 'http://localhost:18843';
const RPC_USERNAME = 'verus';
const RPC_PASSWORD = '1CvFqDVqdPlznV4pksyoiyZ1eKhLoRKb';

// Rate limiting
const DELAY_BETWEEN_BATCHES = 1000; // 1 second between batches

/**
 * Make RPC call to Verus daemon
 */
async function rpcCall(method, params = []) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      jsonrpc: '2.0',
      method: method,
      params: params,
      id: 1,
    });

    const options = {
      hostname: 'localhost',
      port: 27486,
      path: '/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        Authorization:
          'Basic ' +
          Buffer.from(`${RPC_USERNAME}:${RPC_PASSWORD}`).toString('base64'),
      },
    };

    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.error) {
            reject(new Error(`RPC Error: ${response.error.message}`));
          } else {
            resolve(response.result);
          }
        } catch (error) {
          reject(new Error(`JSON Parse Error: ${error.message}`));
        }
      });
    });

    req.on('error', error => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Get current blockchain height
 */
async function getCurrentHeight() {
  try {
    const blockCount = await rpcCall('getblockcount');
    return blockCount;
  } catch (error) {
    console.error('❌ Failed to get current height:', error.message);
    return 3768000; // Fallback to approximate height
  }
}

/**
 * Check if block is a PoS block (minted)
 */
function isPoSBlock(block) {
  return block && block.blocktype === 'minted';
}

/**
 * Find stakes for joanna@ in a block
 */
function findJoannaStakes(block) {
  const stakes = [];

  if (!block || !block.tx || block.tx.length === 0) {
    return stakes;
  }

  // Use tx[0] - the staking reward transaction (verified correct)
  const coinstake = block.tx[0];
  if (!coinstake || !coinstake.vout) {
    return stakes;
  }

  // Check all vouts for joanna@'s address
  for (const vout of coinstake.vout) {
    if (!vout.scriptPubKey || !vout.scriptPubKey.addresses) {
      continue;
    }

    for (const addr of vout.scriptPubKey.addresses) {
      if (addr === JOANNA_IADDR) {
        const amountSats = Math.round(vout.value * 100000000);

        stakes.push({
          identity_address: JOANNA_IADDR,
          txid: coinstake.txid,
          vout: vout.n,
          block_height: block.height,
          block_hash: block.hash,
          block_time: new Date(block.time * 1000).toISOString(),
          amount_sats: amountSats,
          classifier: 'coinbase',
          source_address: JOANNA_IADDR,
        });

        console.log(
          `  ✅ Found stake: Block ${block.height}, ${vout.value.toFixed(8)} VRSC`
        );
        break; // Only count once per block
      }
    }
  }

  return stakes;
}

/**
 * Insert stake into database
 */
async function insertStake(stake) {
  try {
    const result = await pool.query(
      `
      INSERT INTO staking_rewards (
        identity_address,
        txid,
        vout,
        block_height,
        block_hash,
        block_time,
        amount_sats,
        classifier,
        source_address
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (txid, vout) DO NOTHING
      RETURNING *
    `,
      [
        stake.identity_address,
        stake.txid,
        stake.vout,
        stake.block_height,
        stake.block_hash,
        stake.block_time,
        stake.amount_sats,
        stake.classifier,
        stake.source_address,
      ]
    );

    if (result.rows.length > 0) {
      return true; // Inserted new stake
    } else {
      return false; // Already existed
    }
  } catch (error) {
    console.error(`❌ Failed to insert stake: ${error.message}`);
    return false;
  }
}

/**
 * Sleep function for rate limiting
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Main scanning function
 */
async function scanJoannaComprehensive() {
  console.log('🚀 Starting Comprehensive Joanna@ Stake Scan\n');

  try {
    // Get current blockchain height
    const currentHeight = await getCurrentHeight();
    console.log(
      `📊 Current blockchain height: ${currentHeight.toLocaleString()}`
    );

    // Define scan range
    const startHeight = 800200; // VerusID activation block
    const endHeight = currentHeight;

    console.log(
      `🎯 Scanning range: ${startHeight.toLocaleString()} to ${endHeight.toLocaleString()}`
    );
    console.log(
      `📈 Total blocks to scan: ${(endHeight - startHeight + 1).toLocaleString()}\n`
    );

    let totalStakesFound = 0;
    let totalStakesInserted = 0;
    let totalBlocksProcessed = 0;
    let posBlocksFound = 0;

    const startTime = Date.now();

    // Process in batches
    for (
      let batchStart = startHeight;
      batchStart <= endHeight;
      batchStart += BATCH_SIZE
    ) {
      const batchEnd = Math.min(batchStart + BATCH_SIZE - 1, endHeight);

      console.log(
        `\n📦 Processing batch: blocks ${batchStart.toLocaleString()} to ${batchEnd.toLocaleString()}`
      );

      let batchStakesFound = 0;
      let batchStakesInserted = 0;

      // Process each block in the batch
      for (let height = batchStart; height <= batchEnd; height++) {
        try {
          // Get block hash
          const blockHash = await rpcCall('getblockhash', [height]);

          // Get block data
          const block = await rpcCall('getblock', [blockHash, 2]);

          totalBlocksProcessed++;

          // Check if it's a PoS block
          if (isPoSBlock(block)) {
            posBlocksFound++;

            // Look for joanna@ stakes
            const stakes = findJoannaStakes(block);

            if (stakes.length > 0) {
              batchStakesFound += stakes.length;

              // Insert stakes into database
              for (const stake of stakes) {
                const inserted = await insertStake(stake);
                if (inserted) {
                  batchStakesInserted++;
                }
              }
            }
          }

          // Progress indicator
          if (totalBlocksProcessed % 1000 === 0) {
            const elapsed = (Date.now() - startTime) / 1000;
            const rate = totalBlocksProcessed / elapsed;
            const eta = (endHeight - height) / rate;
            console.log(
              `  📊 Progress: ${totalBlocksProcessed.toLocaleString()}/${(endHeight - startHeight + 1).toLocaleString()} blocks (${rate.toFixed(1)} blocks/sec, ETA: ${Math.round(eta / 60)} min)`
            );
          }
        } catch (error) {
          console.error(
            `❌ Error processing block ${height}: ${error.message}`
          );
          // Continue with next block
        }
      }

      totalStakesFound += batchStakesFound;
      totalStakesInserted += batchStakesInserted;

      console.log(
        `  ✅ Batch complete: ${batchStakesFound} stakes found, ${batchStakesInserted} new stakes inserted`
      );

      // Rate limiting delay
      if (batchEnd < endHeight) {
        await sleep(DELAY_BETWEEN_BATCHES);
      }
    }

    const totalTime = (Date.now() - startTime) / 1000;
    const avgRate = totalBlocksProcessed / totalTime;

    console.log(`\n🎉 Scan Complete!\n`);
    console.log(`📊 Final Results:`);
    console.log(`  Blocks Processed: ${totalBlocksProcessed.toLocaleString()}`);
    console.log(`  PoS Blocks Found: ${posBlocksFound.toLocaleString()}`);
    console.log(`  Joanna@ Stakes Found: ${totalStakesFound}`);
    console.log(`  New Stakes Inserted: ${totalStakesInserted}`);
    console.log(`  Total Time: ${Math.round(totalTime / 60)} minutes`);
    console.log(`  Average Rate: ${avgRate.toFixed(1)} blocks/second`);

    // Get final database summary
    console.log(`\n📋 Final Database Summary:`);
    const summaryResult = await pool.query(
      `
      SELECT 
        COUNT(*) as total_stakes,
        MIN(block_height) as first_block,
        MAX(block_height) as last_block,
        SUM(amount_sats) as total_sats,
        MIN(block_time) as first_time,
        MAX(block_time) as last_time
      FROM staking_rewards 
      WHERE identity_address = $1
    `,
      [JOANNA_IADDR]
    );

    const summary = summaryResult.rows[0];
    console.log(`  Total Stakes: ${summary.total_stakes}`);
    console.log(
      `  Block Range: ${summary.first_block} to ${summary.last_block}`
    );
    console.log(
      `  Total Rewards: ${(summary.total_sats / 100000000).toFixed(2)} VRSC`
    );
    console.log(
      `  Time Range: ${new Date(summary.first_time).toISOString().split('T')[0]} to ${new Date(summary.last_time).toISOString().split('T')[0]}`
    );

    console.log(`\n✅ Ready for wallet comparison!`);
  } catch (error) {
    console.error(`❌ Scan failed: ${error.message}`);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the scan
if (require.main === module) {
  scanJoannaComprehensive().catch(console.error);
}

module.exports = { scanJoannaComprehensive };
