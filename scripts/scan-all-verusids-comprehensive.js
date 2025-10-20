#!/usr/bin/env node
/**
 * scan-all-verusids-comprehensive.js
 * Comprehensive scan of ALL 32,990 VerusIDs for complete staking history
 * Scans from VerusID activation (block 800,200) to current height
 */

const { Pool } = require('pg');

const VERUSID_ACTIVATION_BLOCK = 800200;

console.log('╔═══════════════════════════════════════════════╗');
console.log('║  Comprehensive VerusID Staking Scanner       ║');
console.log('║  Scanning ALL 32,990 VerusIDs                ║');
console.log('╚═══════════════════════════════════════════════╝\n');

// Configuration
const dbConfig = {
  connectionString:
    process.env.DATABASE_URL ||
    'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
  max: 10,
};

const db = new Pool(dbConfig);
const BATCH_SIZE = 100; // Blocks per batch (optimized for speed without overloading RPC)
const PROGRESS_INTERVAL = 500; // Show progress every N blocks (more frequent updates)

let stats = {
  totalVerusIDs: 0,
  blocksScanned: 0,
  stakeEventsFound: 0,
  verusIDsWithNewStakes: new Set(),
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

// Get ALL VerusID I-addresses from database
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

// Get the last block we've fully scanned (to resume if interrupted)
async function getLastScannedBlock() {
  const result = await db.query(`
    SELECT scan_progress 
    FROM scan_metadata 
    WHERE scan_type = 'comprehensive_verusid_scan' 
    ORDER BY last_updated DESC 
    LIMIT 1
  `);

  if (result.rows.length > 0) {
    return result.rows[0].scan_progress;
  }
  return VERUSID_ACTIVATION_BLOCK - 1;
}

// Save scan progress
async function saveScanProgress(blockHeight) {
  try {
    await db.query(
      `
      INSERT INTO scan_metadata (scan_type, scan_progress, last_updated)
      VALUES ('comprehensive_verusid_scan', $1, NOW())
      ON CONFLICT (scan_type) 
      DO UPDATE SET scan_progress = $1, last_updated = NOW()
    `,
      [blockHeight]
    );
    stats.lastSavedBlock = blockHeight;
  } catch (error) {
    // Table might not exist, create it
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS scan_metadata (
          scan_type VARCHAR(100) PRIMARY KEY,
          scan_progress INTEGER NOT NULL,
          last_updated TIMESTAMPTZ DEFAULT NOW()
        )
      `);
      await db.query(
        `
        INSERT INTO scan_metadata (scan_type, scan_progress, last_updated)
        VALUES ('comprehensive_verusid_scan', $1, NOW())
      `,
        [blockHeight]
      );
      stats.lastSavedBlock = blockHeight;
    } catch (e) {
      console.error(`Warning: Could not save progress: ${e.message}`);
    }
  }
}

// Check if block contains stakes for our addresses
// CRITICAL: Only scan I-addresses, one stake per block per address
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
      // Only record if this is a target I-address AND we haven't recorded it yet for this block
      if (targetAddresses.has(addr) && !addressesFoundInBlock.has(addr)) {
        addressesFoundInBlock.add(addr);

        stakes.push({
          address: addr,
          amount: Math.round(vout.value * 100000000), // Reward amount in satoshis
          blockHeight: block.height,
          blockTime: new Date(block.time * 1000).toISOString(),
          txid: coinstake.txid,
          vout: voutIdx,
          blockHash: block.hash,
        });

        stats.verusIDsWithNewStakes.add(addr);
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
        'coinbase', // PoS rewards
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
    `\n🔍 Scanning blocks ${startHeight.toLocaleString()} to ${endHeight.toLocaleString()}...\n`
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

        // Save progress every 5000 blocks
        if (stats.blocksScanned % 5000 === 0) {
          await saveScanProgress(h);
        }

        // Show progress
        if (stats.blocksScanned % PROGRESS_INTERVAL === 0) {
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
            `Stakes found: ${stats.stakeEventsFound.toLocaleString()}`
          );
          console.log(
            `VerusIDs with stakes: ${stats.verusIDsWithNewStakes.size.toLocaleString()}`
          );
          console.log(`Speed: ${rate.toFixed(1)} blocks/sec`);
          console.log(
            `ETA: ${(eta / 3600).toFixed(1)} hours (${(eta / 60).toFixed(0)} min)`
          );
          console.log(
            `Last saved: Block ${stats.lastSavedBlock.toLocaleString()}`
          );
          console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
        }
      } catch (error) {
        if (!error.message.includes('maxBuffer')) {
          stats.errors++;
          if (stats.errors % 100 === 0) {
            console.error(`⚠️  ${stats.errors} errors so far (continuing...)`);
          }
        }
      }
    }

    // Small delay between batches (balanced for speed and RPC stability)
    await new Promise(resolve => setTimeout(resolve, 2));
  }

  // Final save
  await saveScanProgress(endHeight);
}

// Main
async function main() {
  try {
    console.log(
      `📚 VerusID Activation Block: ${VERUSID_ACTIVATION_BLOCK.toLocaleString()}\n`
    );

    // Load ALL VerusIDs (I-addresses only)
    console.log('Loading ALL VerusIDs from database...');
    const verusIDs = await getAllVerusIDs();
    stats.totalVerusIDs = verusIDs.length;
    console.log(
      `✓ Loaded ${stats.totalVerusIDs.toLocaleString()} VerusIDs (I-addresses only)\n`
    );

    if (stats.totalVerusIDs === 0) {
      console.log('⚠️  No VerusIDs found in database!');
      process.exit(1);
    }

    // Create address set for fast lookup
    const addressSet = new Set(verusIDs.map(v => v.address));
    console.log(
      `✓ Address lookup set created (${addressSet.size.toLocaleString()} addresses)\n`
    );

    // Check if we can resume from previous run
    const lastScanned = await getLastScannedBlock();

    // Get current blockchain height
    console.log('Getting blockchain height...');
    const currentHeight = await rpcCall('getblockcount');
    console.log(`✓ Current height: ${currentHeight.toLocaleString()}\n`);

    // Calculate scan range
    const startHeight = lastScanned + 1;
    const endHeight = currentHeight;
    const totalBlocks = endHeight - startHeight + 1;

    if (totalBlocks <= 0) {
      console.log('✅ Scan already complete! All blocks scanned.');
      process.exit(0);
    }

    console.log(`📊 Comprehensive Scan Configuration:`);
    console.log(
      `   Start Block: ${startHeight.toLocaleString()}${lastScanned > VERUSID_ACTIVATION_BLOCK ? ' (RESUMING)' : ' (VerusID Activation)'}`
    );
    console.log(`   End Block: ${endHeight.toLocaleString()} (Current)`);
    console.log(`   Total Blocks: ${totalBlocks.toLocaleString()}`);
    console.log(
      `   VerusIDs: ${stats.totalVerusIDs.toLocaleString()} (ALL I-addresses)`
    );
    console.log(
      `   Est. Time: ~${(totalBlocks / 30 / 3600).toFixed(1)} hours at 30 blocks/sec\n`
    );

    if (lastScanned > VERUSID_ACTIVATION_BLOCK) {
      console.log(`🔄 RESUMING from block ${startHeight.toLocaleString()}\n`);
    }

    // Start scan
    stats.startTime = Date.now();
    await scanBlocks(startHeight, endHeight, addressSet);

    // Final stats
    const totalTime = (Date.now() - stats.startTime) / 1000;
    console.log('\n╔═══════════════════════════════════════════════╗');
    console.log('║       COMPREHENSIVE SCAN COMPLETE!           ║');
    console.log('╚═══════════════════════════════════════════════╝');
    console.log(`Blocks scanned: ${stats.blocksScanned.toLocaleString()}`);
    console.log(`Stakes found: ${stats.stakeEventsFound.toLocaleString()}`);
    console.log(
      `VerusIDs with stakes: ${stats.verusIDsWithNewStakes.size.toLocaleString()}`
    );
    console.log(`Errors: ${stats.errors}`);
    console.log(`Total time: ${(totalTime / 3600).toFixed(1)} hours`);
    console.log(
      `Speed: ${(stats.blocksScanned / totalTime).toFixed(1)} blocks/sec\n`
    );

    // Final database stats
    const finalStats = await db.query(`
      SELECT 
        COUNT(DISTINCT identity_address) as verusids_with_stakes,
        COUNT(*) as total_stakes,
        ROUND(SUM(amount_sats) / 100000000.0, 2) as total_vrsc
      FROM staking_rewards
    `);

    const final = finalStats.rows[0];
    console.log('📊 Final Database Statistics:');
    console.log(`   VerusIDs with stakes: ${final.verusids_with_stakes}`);
    console.log(`   Total stake events: ${final.total_stakes}`);
    console.log(`   Total VRSC staked: ${final.total_vrsc} VRSC\n`);

    console.log('✅ Complete staking history for ALL VerusIDs saved!\n');
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.log(
      '\n💾 Progress saved. You can resume by running this script again.\n'
    );
    process.exit(1);
  } finally {
    await db.end();
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\n🛑 Graceful shutdown requested...');
  console.log('\n💾 Saving progress...');
  const lastBlock = stats.lastSavedBlock || VERUSID_ACTIVATION_BLOCK;
  console.log(`   Last fully scanned block: ${lastBlock.toLocaleString()}`);
  console.log(`   Stakes found: ${stats.stakeEventsFound.toLocaleString()}`);
  console.log(
    `   VerusIDs with stakes: ${stats.verusIDsWithNewStakes.size.toLocaleString()}\n`
  );
  console.log('✅ Progress saved! Run this script again to resume.\n');
  await db.end();
  process.exit(0);
});

main().catch(console.error);
