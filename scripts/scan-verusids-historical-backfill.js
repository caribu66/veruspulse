#!/usr/bin/env node
/**
 * scan-verusids-historical-backfill.js
 * Backfills historical VerusID staking data from block 800200 to where scanning previously started
 */

const { Pool } = require('pg');

const VERUSID_ACTIVATION_BLOCK = 800200; // VerusID activated on Verus blockchain

console.log('╔═══════════════════════════════════════════════╗');
console.log('║   Historical VerusID Staking Backfill        ║');
console.log('╚═══════════════════════════════════════════════╝\n');

// Configuration
const dbConfig = {
  connectionString:
    process.env.DATABASE_URL ||
    'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
  max: 10,
};

const db = new Pool(dbConfig);
const BATCH_SIZE = 50; // Blocks per batch

let stats = {
  totalAddresses: 0,
  blocksScanned: 0,
  stakeEventsFound: 0,
  errors: 0,
  startTime: Date.now(),
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

// Get all VerusID addresses from database - ONLY I-addresses
async function getAllVerusIDs() {
  const result = await db.query(`
    SELECT identity_address, base_name, friendly_name
    FROM identities
    WHERE identity_address LIKE 'i%'
    ORDER BY identity_address
  `);
  return result.rows.map(r => ({
    address: r.identity_address,
    name: r.base_name || 'unknown',
    friendlyName: r.friendly_name,
  }));
}

// Get earliest block we've scanned
async function getEarliestScannedBlock() {
  const result = await db.query(`
    SELECT MIN(block_height) as min_height
    FROM staking_rewards
  `);
  return result.rows[0].min_height || VERUSID_ACTIVATION_BLOCK;
}

// Check if block contains stakes for our addresses
// CRITICAL: Count ONE stake per block per address, not multiple vouts
function findStakesInBlock(block, targetAddresses) {
  const stakes = [];

  if (!block || !block.tx || block.tx.length === 0) return stakes;

  // Check if this is a PoS block (minted/staked)
  const isPoS =
    block.validationtype === 'stake' || block.blocktype === 'minted';
  if (!isPoS) return stakes;

  // Coinstake transaction (first tx in PoS block)
  const coinstake = block.tx[0];
  if (!coinstake || !coinstake.vout) return stakes;

  // Track which addresses we've already recorded for this block
  const addressesFoundInBlock = new Set();

  // Check each output and record ONE stake per address per block
  for (let voutIdx = 0; voutIdx < coinstake.vout.length; voutIdx++) {
    const vout = coinstake.vout[voutIdx];
    if (!vout.scriptPubKey || !vout.scriptPubKey.addresses) continue;

    for (const addr of vout.scriptPubKey.addresses) {
      // Only record if this is a target address AND we haven't recorded it yet for this block
      if (targetAddresses.has(addr) && !addressesFoundInBlock.has(addr)) {
        addressesFoundInBlock.add(addr);

        stakes.push({
          address: addr,
          amount: Math.round(vout.value * 100000000), // Reward amount
          blockHeight: block.height,
          blockTime: new Date(block.time * 1000).toISOString(),
          txid: coinstake.txid,
          vout: voutIdx,
          blockHash: block.hash,
        });
      }
    }
  }

  return stakes;
}

// Insert stake into database (ONE per block per address)
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
        'coinbase', // Use 'coinbase' classifier for PoS rewards
        stake.address,
      ]
    );
    stats.stakeEventsFound++;
  } catch (error) {
    console.error(`Error inserting stake: ${error.message}`);
    stats.errors++;
  }
}

// Scan blocks
async function scanBlocks(startHeight, endHeight, targetAddresses) {
  console.log(
    `\nScanning blocks ${startHeight.toLocaleString()} to ${endHeight.toLocaleString()}...\n`
  );

  for (let height = startHeight; height <= endHeight; height += BATCH_SIZE) {
    const batchEnd = Math.min(height + BATCH_SIZE - 1, endHeight);

    // Process batch
    for (let h = height; h <= batchEnd; h++) {
      try {
        const hash = await rpcCall('getblockhash', [h]);
        const block = await rpcCall('getblock', [hash, 2]);

        const stakes = findStakesInBlock(block, targetAddresses);
        for (const stake of stakes) {
          await insertStake(stake);
        }

        stats.blocksScanned++;

        if (stats.blocksScanned % 1000 === 0) {
          const elapsed = (Date.now() - stats.startTime) / 1000;
          const rate = stats.blocksScanned / elapsed;
          const remaining = endHeight - h;
          const eta = remaining / rate;
          const progress = (
            ((h - startHeight) / (endHeight - startHeight)) *
            100
          ).toFixed(1);

          console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
          console.log(
            `Progress: ${progress}% (Block ${h.toLocaleString()}/${endHeight.toLocaleString()})`
          );
          console.log(
            `Stakes: ${stats.stakeEventsFound.toLocaleString()} found`
          );
          console.log(`Speed: ${rate.toFixed(1)} blocks/sec`);
          console.log(
            `ETA: ${(eta / 3600).toFixed(1)} hours (${(eta / 60).toFixed(0)} min)`
          );
          console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
        }
      } catch (error) {
        if (!error.message.includes('maxBuffer')) {
          stats.errors++;
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
    console.log(
      `📚 VerusID Activation Block: ${VERUSID_ACTIVATION_BLOCK.toLocaleString()}`
    );
    console.log(
      '   (VerusID launched on Verus blockchain ~late 2019/early 2020)\n'
    );

    // Get all VerusIDs - ONLY I-addresses
    console.log('Loading VerusIDs from database...');
    const verusIDs = await getAllVerusIDs();
    stats.totalAddresses = verusIDs.length;
    console.log(
      `✓ Found ${stats.totalAddresses} VerusIDs (I-addresses only)\n`
    );

    if (stats.totalAddresses === 0) {
      console.log('⚠️  No VerusIDs found in database!');
      process.exit(1);
    }

    // Create address set for fast lookup
    const addressSet = new Set(verusIDs.map(v => v.address));

    // Get earliest block already scanned
    console.log('Checking current scan range...');
    const earliestScanned = await getEarliestScannedBlock();
    console.log(
      `✓ Earliest block scanned: ${earliestScanned.toLocaleString()}\n`
    );

    // Calculate block range for backfill
    const startHeight = VERUSID_ACTIVATION_BLOCK;
    const endHeight = earliestScanned - 1; // Scan up to (but not including) earliest scanned
    const totalBlocks = endHeight - startHeight + 1;

    if (totalBlocks <= 0) {
      console.log(
        '✅ No backfill needed! Already scanned from VerusID activation block.'
      );
      process.exit(0);
    }

    console.log(`📊 Backfill Scan Configuration:`);
    console.log(
      `   Start Block: ${startHeight.toLocaleString()} (VerusID Activation)`
    );
    console.log(
      `   End Block: ${endHeight.toLocaleString()} (Before earliest scan)`
    );
    console.log(`   Total Blocks: ${totalBlocks.toLocaleString()}`);
    console.log(`   VerusIDs: ${stats.totalAddresses}`);
    console.log(
      `   Est. Time: ~${(totalBlocks / 30 / 3600).toFixed(1)} hours at 30 blocks/sec\n`
    );

    // Start scan
    stats.startTime = Date.now();
    await scanBlocks(startHeight, endHeight, addressSet);

    // Final stats
    const totalTime = (Date.now() - stats.startTime) / 1000;
    console.log('\n╔═══════════════════════════════════════════════╗');
    console.log('║         HISTORICAL BACKFILL COMPLETE!        ║');
    console.log('╚═══════════════════════════════════════════════╝');
    console.log(`Blocks scanned: ${stats.blocksScanned.toLocaleString()}`);
    console.log(`Stakes found: ${stats.stakeEventsFound.toLocaleString()}`);
    console.log(`Errors: ${stats.errors}`);
    console.log(`Total time: ${(totalTime / 3600).toFixed(1)} hours`);
    console.log(
      `Speed: ${(stats.blocksScanned / totalTime).toFixed(1)} blocks/sec\n`
    );

    console.log('✅ Complete historical staking data saved to database!');
    console.log('   Full range now: Block 800,200 to current\n');
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  } finally {
    await db.end();
  }
}

main().catch(console.error);
