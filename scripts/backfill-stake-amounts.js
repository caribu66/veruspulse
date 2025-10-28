#!/usr/bin/env node
/**
 * Backfill Stake Amounts for Existing Rewards
 *
 * This script extracts actual stake amounts from historical coinstake transactions
 * and updates the staking_rewards table. It processes stakes that don't yet have
 * stake_amount_sats populated.
 *
 * Features:
 * - Processes in batches to manage load
 * - Rate-limited RPC calls
 * - Progress tracking and resume capability
 * - Can be run multiple times safely (idempotent)
 * - Focuses on I-address stakes only
 *
 * Usage:
 *   node scripts/backfill-stake-amounts.js [options]
 *
 * Options:
 *   --batch-size <number>    Number of stakes to process per batch (default: 100)
 *   --rate-limit <ms>        Milliseconds between RPC calls (default: 100)
 *   --max-stakes <number>    Maximum number of stakes to process (default: unlimited)
 *   --address <iaddr>        Only process this specific I-address
 *   --resume                 Resume from last processed block height
 */

const { Pool } = require('pg');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

require('dotenv').config();

// Configuration
const BATCH_SIZE =
  parseInt(
    process.argv.find(a => a.startsWith('--batch-size'))?.split('=')[1]
  ) || 100;
const RATE_LIMIT_MS =
  parseInt(
    process.argv.find(a => a.startsWith('--rate-limit'))?.split('=')[1]
  ) || 100;
const MAX_STAKES =
  parseInt(
    process.argv.find(a => a.startsWith('--max-stakes'))?.split('=')[1]
  ) || null;
const SPECIFIC_ADDRESS =
  process.argv.find(a => a.startsWith('--address'))?.split('=')[1] || null;
const RESUME_MODE = process.argv.includes('--resume');

// RPC Configuration
const RPC_USER = process.env.VERUS_RPC_USER || 'verus';
const RPC_PASS = process.env.VERUS_RPC_PASSWORD || 'verus';
const RPC_HOST = process.env.VERUS_RPC_HOST || '127.0.0.1';
const RPC_PORT = process.env.VERUS_RPC_PORT || '18843';

// Statistics
const stats = {
  totalProcessed: 0,
  successful: 0,
  failed: 0,
  skipped: 0,
  startTime: Date.now(),
  lastProgress: Date.now(),
};

/**
 * RPC call helper
 */
async function rpcCall(method, params = []) {
  const rpcData = JSON.stringify({
    jsonrpc: '1.0',
    id: 'backfill-script',
    method,
    params,
  });

  const escapedData = rpcData.replace(/'/g, "'\\''");
  const cmd = `curl -s --user ${RPC_USER}:${RPC_PASS} --data-binary '${escapedData}' -H 'content-type: text/plain;' http://${RPC_HOST}:${RPC_PORT}/`;

  try {
    const { stdout } = await execAsync(cmd, { maxBuffer: 10 * 1024 * 1024 });
    const result = JSON.parse(stdout);

    if (result.error) {
      throw new Error(result.error.message || JSON.stringify(result.error));
    }

    return result.result;
  } catch (error) {
    throw new Error(`RPC call failed: ${error.message}`);
  }
}

/**
 * Extract stake amount from coinstake transaction
 */
async function extractStakeAmount(coinstakeTxid, identityAddress) {
  try {
    // Get the coinstake transaction
    const tx = await rpcCall('getrawtransaction', [coinstakeTxid, true]);

    if (!tx || !tx.vin || tx.vin.length === 0) {
      return null;
    }

    let totalStakedAmount = 0;
    let inputsProcessed = 0;

    // Iterate through inputs to find staked UTXOs
    for (const vin of tx.vin) {
      if (vin.coinbase) continue; // Skip coinbase

      if (!vin.txid || vin.vout === undefined) continue;

      try {
        // Fetch previous transaction
        const prevTx = await rpcCall('getrawtransaction', [vin.txid, true]);

        if (!prevTx || !prevTx.vout || !prevTx.vout[vin.vout]) continue;

        const prevOutput = prevTx.vout[vin.vout];

        // Check if this UTXO belongs to our identity
        const outputAddresses = prevOutput.scriptPubKey?.addresses || [];

        if (outputAddresses.includes(identityAddress)) {
          totalStakedAmount += prevOutput.value * 100000000; // Convert to satoshis
          inputsProcessed++;
        }

        // Rate limiting
        if (RATE_LIMIT_MS > 0) {
          await sleep(RATE_LIMIT_MS);
        }
      } catch (error) {
        console.warn(
          `  ⚠️  Could not fetch prev tx ${vin.txid}: ${error.message}`
        );
        // Continue with other inputs
      }
    }

    if (inputsProcessed > 0) {
      return Math.round(totalStakedAmount);
    }

    return null;
  } catch (error) {
    console.error(`  ❌ Error extracting stake amount: ${error.message}`);
    return null;
  }
}

/**
 * Sleep helper
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Format duration
 */
function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Show progress update
 */
function showProgress(totalToProcess, force = false) {
  const now = Date.now();

  // Only show progress every 10 seconds unless forced
  if (!force && now - stats.lastProgress < 10000) {
    return;
  }

  stats.lastProgress = now;

  const elapsed = now - stats.startTime;
  const rate = stats.totalProcessed / (elapsed / 1000); // per second
  const remaining = totalToProcess - stats.totalProcessed;
  const eta = remaining > 0 ? remaining / rate : 0;

  const pct = ((stats.totalProcessed / totalToProcess) * 100).toFixed(1);

  console.log(`\n📊 Progress Report:`);
  console.log(
    `   Processed: ${stats.totalProcessed.toLocaleString()}/${totalToProcess.toLocaleString()} (${pct}%)`
  );
  console.log(`   ✅ Successful: ${stats.successful.toLocaleString()}`);
  console.log(`   ❌ Failed: ${stats.failed.toLocaleString()}`);
  console.log(`   ⏭️  Skipped: ${stats.skipped.toLocaleString()}`);
  console.log(`   ⏱️  Elapsed: ${formatDuration(elapsed)}`);
  console.log(`   🚀 Rate: ${rate.toFixed(2)}/sec`);
  console.log(`   ⏳ ETA: ${formatDuration(eta * 1000)}`);
}

/**
 * Main backfill process
 */
async function backfillStakeAmounts() {
  console.log(
    '\n╔═══════════════════════════════════════════════════════════╗'
  );
  console.log('║          Backfill Stake Amounts from Blockchain          ║');
  console.log(
    '╚═══════════════════════════════════════════════════════════╝\n'
  );

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔗 Connecting to database...');

    // Build query based on options
    let query = `
      SELECT 
        id, 
        identity_address, 
        txid, 
        block_height,
        amount_sats
      FROM staking_rewards
      WHERE stake_amount_sats IS NULL
        AND source_address = identity_address
    `;

    const params = [];

    if (SPECIFIC_ADDRESS) {
      query += ' AND identity_address = $1';
      params.push(SPECIFIC_ADDRESS);
      console.log(`🎯 Processing only address: ${SPECIFIC_ADDRESS}`);
    }

    query += ' ORDER BY block_height ASC';

    if (MAX_STAKES) {
      query += ` LIMIT ${MAX_STAKES}`;
      console.log(`📏 Limited to ${MAX_STAKES} stakes`);
    }

    // Get count
    const countQuery = query.replace(
      'id, identity_address, txid, block_height, amount_sats',
      'COUNT(*) as total'
    );
    const countResult = await pool.query(countQuery, params);
    const totalToProcess = parseInt(countResult.rows[0].total);

    console.log(
      `\n📊 Found ${totalToProcess.toLocaleString()} stakes to process`
    );
    console.log(`⚙️  Batch size: ${BATCH_SIZE}`);
    console.log(`⏱️  Rate limit: ${RATE_LIMIT_MS}ms between RPC calls`);
    console.log(`\n🚀 Starting backfill process...\n`);

    if (totalToProcess === 0) {
      console.log('✅ No stakes need backfilling!\n');
      return;
    }

    let lastBlockHeight = 0;

    // Process in batches
    while (stats.totalProcessed < totalToProcess) {
      // Get next batch
      const batchQuery = query + ` LIMIT ${BATCH_SIZE}`;
      const batch = await pool.query(batchQuery, params);

      if (batch.rows.length === 0) {
        break; // No more to process
      }

      // Process each stake in the batch
      for (const stake of batch.rows) {
        try {
          lastBlockHeight = stake.block_height;

          // Extract stake amount
          const stakeAmountSats = await extractStakeAmount(
            stake.txid,
            stake.identity_address
          );

          if (stakeAmountSats !== null && stakeAmountSats > 0) {
            // Update database
            await pool.query(
              `UPDATE staking_rewards 
               SET stake_amount_sats = $1 
               WHERE id = $2`,
              [stakeAmountSats, stake.id]
            );

            stats.successful++;

            // Log successful extraction every 50 stakes
            if (stats.successful % 50 === 0) {
              const stakeAmountVRSC = (stakeAmountSats / 100000000).toFixed(2);
              console.log(
                `   ✅ Stake ${stats.successful}: Block ${stake.block_height} - ${stakeAmountVRSC} VRSC staked`
              );
            }
          } else {
            stats.skipped++;

            if (stats.skipped % 100 === 0) {
              console.log(
                `   ⏭️  Skipped ${stats.skipped} stakes (no stake amount found)`
              );
            }
          }
        } catch (error) {
          stats.failed++;
          console.error(
            `   ❌ Failed to process stake ${stake.id}: ${error.message}`
          );
        }

        stats.totalProcessed++;

        // Show progress
        showProgress(totalToProcess);

        // Check if we've hit the maximum
        if (MAX_STAKES && stats.totalProcessed >= MAX_STAKES) {
          break;
        }
      }

      // Small delay between batches
      await sleep(100);

      // Check if we've hit the maximum
      if (MAX_STAKES && stats.totalProcessed >= MAX_STAKES) {
        break;
      }
    }

    // Final progress report
    showProgress(totalToProcess, true);

    // Calculate success rate
    const successRate =
      stats.totalProcessed > 0
        ? ((stats.successful / stats.totalProcessed) * 100).toFixed(1)
        : 0;

    console.log(
      '\n\n╔═══════════════════════════════════════════════════════════╗'
    );
    console.log(
      '║                  Backfill Complete!                       ║'
    );
    console.log(
      '╚═══════════════════════════════════════════════════════════╝\n'
    );
    console.log(
      `✅ Successfully extracted: ${stats.successful.toLocaleString()}`
    );
    console.log(`⏭️  Skipped (no data): ${stats.skipped.toLocaleString()}`);
    console.log(`❌ Failed: ${stats.failed.toLocaleString()}`);
    console.log(`📊 Success rate: ${successRate}%`);
    console.log(
      `⏱️  Total time: ${formatDuration(Date.now() - stats.startTime)}`
    );
    console.log(`📍 Last block processed: ${lastBlockHeight.toLocaleString()}`);

    if (stats.successful > 0) {
      console.log('\n🎯 Next steps:');
      console.log('   1. Run this script again to process more stakes');
      console.log(
        '   2. Recalculate VerusID statistics: node scripts/recalculate-all-stats.js'
      );
      console.log('   3. Check APY confidence in the UI\n');
    }
  } catch (error) {
    console.error('\n❌ Backfill failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the script
backfillStakeAmounts()
  .then(() => {
    console.log('✅ Script completed successfully\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
