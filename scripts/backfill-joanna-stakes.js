#!/usr/bin/env node
/**
 * backfill-joanna-stakes.js
 * Targeted backfill for joanna@ from block 800200 to 1998319
 */

const { Pool } = require('pg');

const VERUSID_ACTIVATION_BLOCK = 800200;
const JOANNA_IADDR = 'iPZkWmFAhQSFsgKiLExowaoXvzaor2bBZ5';
const START_HEIGHT = 800200;
const END_HEIGHT = 1998319; // Block before first known stake

console.log('╔═══════════════════════════════════════════════╗');
console.log('║      Backfill Stakes for joanna@              ║');
console.log('╚═══════════════════════════════════════════════╝\n');

// Configuration
const dbConfig = {
  connectionString:
    process.env.DATABASE_URL ||
    'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
  max: 10,
};

const db = new Pool(dbConfig);
const BATCH_SIZE = 100; // Blocks per batch

let stats = {
  blocksScanned: 0,
  stakeEventsFound: 0,
  errors: 0,
  startTime: Date.now(),
  lastSavedBlock: 0,
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
    id: 'scanner',
    method,
    params,
  });

  const escapedData = rpcData.replace(/'/g, "'\\''");
  const cmd = `curl -s --user ${rpcUser}:${rpcPass} --data-binary '${escapedData}' -H 'content-type: text/plain;' http://${rpcHost}:${rpcPort}/`;

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

// Find stakes for joanna@ in a block
function findStakesInBlock(block, targetAddress) {
  const stakes = [];

  if (!block || !block.tx || block.tx.length === 0) return stakes;

  // Check if this is a PoS block
  const isPoS =
    block.validationtype === 'stake' || block.blocktype === 'minted';
  if (!isPoS) return stakes;

  // Coinstake transaction (first tx in PoS block)
  const coinstake = block.tx[0];
  if (!coinstake || !coinstake.vout) return stakes;

  // Check each output - record ONE stake per block for this address
  let found = false;
  for (let voutIdx = 0; voutIdx < coinstake.vout.length && !found; voutIdx++) {
    const vout = coinstake.vout[voutIdx];
    if (!vout.scriptPubKey || !vout.scriptPubKey.addresses) continue;

    for (const addr of vout.scriptPubKey.addresses) {
      if (addr === targetAddress) {
        stakes.push({
          address: addr,
          amount: Math.round(vout.value * 100000000),
          blockHeight: block.height,
          blockTime: new Date(block.time * 1000).toISOString(),
          txid: coinstake.txid,
          vout: voutIdx,
          blockHash: block.hash,
        });
        found = true;
        break;
      }
    }
  }

  return stakes;
}

// Insert stake into database
async function insertStake(stake) {
  try {
    await db.query(
      `
      INSERT INTO staking_rewards (
        identity_address, txid, vout, block_height, block_hash, 
        block_time, amount_sats, classifier, source_address
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (txid, vout) DO NOTHING
    `,
      [
        stake.address,
        stake.txid,
        stake.vout,
        stake.blockHeight,
        stake.blockHash,
        stake.blockTime,
        stake.amount,
        'coinbase',
        stake.address,
      ]
    );
    stats.stakeEventsFound++;
    return true;
  } catch (error) {
    console.error(
      `Error inserting stake at block ${stake.blockHeight}: ${error.message}`
    );
    stats.errors++;
    return false;
  }
}

// Save progress
async function saveProgress(blockHeight) {
  stats.lastSavedBlock = blockHeight;
  try {
    await db.query(
      `
      INSERT INTO scan_progress (scan_key, last_block_scanned, updated_at)
      VALUES ('joanna_backfill', $1, NOW())
      ON CONFLICT (scan_key) 
      DO UPDATE SET last_block_scanned = $1, updated_at = NOW()
    `,
      [blockHeight]
    );
  } catch (error) {
    // Ignore if table doesn't exist
  }
}

// Get saved progress
async function getSavedProgress() {
  try {
    const result = await db.query(
      `SELECT last_block_scanned FROM scan_progress WHERE scan_key = 'joanna_backfill'`
    );
    if (result.rows.length > 0) {
      return result.rows[0].last_block_scanned;
    }
  } catch (error) {
    // Ignore if table doesn't exist
  }
  return null;
}

// Scan blocks
async function scanBlocks(startHeight, endHeight) {
  console.log(
    `\n🔍 Scanning blocks ${startHeight.toLocaleString()} to ${endHeight.toLocaleString()} for ${JOANNA_IADDR}\n`
  );

  for (let height = startHeight; height <= endHeight; height += BATCH_SIZE) {
    const batchEnd = Math.min(height + BATCH_SIZE - 1, endHeight);

    // Process batch
    for (let h = height; h <= batchEnd; h++) {
      try {
        const hash = await rpcCall('getblockhash', [h]);
        const block = await rpcCall('getblock', [hash, 2]);

        const stakes = findStakesInBlock(block, JOANNA_IADDR);
        for (const stake of stakes) {
          if (await insertStake(stake)) {
            console.log(
              `  ✅ Block ${h.toLocaleString()}: Found stake of ${(stake.amount / 100000000).toFixed(2)} VRSC`
            );
          }
        }

        stats.blocksScanned++;

        // Progress update every 5000 blocks
        if (stats.blocksScanned % 5000 === 0) {
          const elapsed = (Date.now() - stats.startTime) / 1000;
          const rate = stats.blocksScanned / elapsed;
          const remaining = endHeight - h;
          const eta = remaining / rate;
          const progress = (
            ((h - startHeight) / (endHeight - startHeight)) *
            100
          ).toFixed(1);

          console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
          console.log(
            `Progress: ${progress}% (Block ${h.toLocaleString()}/${endHeight.toLocaleString()})`
          );
          console.log(`Stakes: ${stats.stakeEventsFound} found for joanna@`);
          console.log(`Speed: ${rate.toFixed(1)} blocks/sec`);
          console.log(
            `ETA: ${(eta / 3600).toFixed(1)} hours (${(eta / 60).toFixed(0)} minutes)`
          );
          console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

          // Save progress
          await saveProgress(h);
        }
      } catch (error) {
        if (!error.message.includes('maxBuffer')) {
          stats.errors++;
          if (stats.errors % 100 === 0) {
            console.log(`  ⚠️  Errors: ${stats.errors} at block ${h}`);
          }
        }
      }
    }

    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 10));
  }
}

// Main
async function main() {
  try {
    console.log(`📍 Target: joanna@ (Joanna.VRSC@)`);
    console.log(`   I-address: ${JOANNA_IADDR}`);
    console.log(
      `   Block range: ${START_HEIGHT.toLocaleString()} - ${END_HEIGHT.toLocaleString()}`
    );
    console.log(
      `   Total blocks: ${(END_HEIGHT - START_HEIGHT + 1).toLocaleString()}\n`
    );

    // Check for saved progress
    const savedProgress = await getSavedProgress();
    const actualStart = savedProgress ? savedProgress + 1 : START_HEIGHT;

    if (savedProgress) {
      console.log(
        `✅ Resuming from saved progress: block ${savedProgress.toLocaleString()}\n`
      );
    }

    const estimatedHours = (END_HEIGHT - actualStart + 1) / 30 / 3600;
    console.log(
      `⏱️  Estimated time: ~${estimatedHours.toFixed(1)} hours at 30 blocks/sec\n`
    );

    // Start scan
    stats.startTime = Date.now();
    await scanBlocks(actualStart, END_HEIGHT);

    // Save final progress
    await saveProgress(END_HEIGHT);

    // Final stats
    const totalTime = (Date.now() - stats.startTime) / 1000;
    console.log('\n╔═══════════════════════════════════════════════╗');
    console.log('║       JOANNA@ BACKFILL COMPLETE!             ║');
    console.log('╚═══════════════════════════════════════════════╝');
    console.log(`Blocks scanned: ${stats.blocksScanned.toLocaleString()}`);
    console.log(`Stakes found: ${stats.stakeEventsFound}`);
    console.log(`Errors: ${stats.errors}`);
    console.log(`Total time: ${(totalTime / 3600).toFixed(2)} hours`);
    console.log(
      `Speed: ${(stats.blocksScanned / totalTime).toFixed(1)} blocks/sec\n`
    );

    if (stats.stakeEventsFound > 0) {
      console.log('✅ Historical stakes for joanna@ saved to database!');
      console.log('   Now run: node scripts/calculate-statistics.js');
      console.log('   to update statistics for joanna@\n');
    } else {
      console.log('ℹ️  No additional stakes found in this range.\n');
    }
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await db.end();
  }
}

main().catch(console.error);
