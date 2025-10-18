#!/usr/bin/env node
/**
 * scan-single-verusid-complete.js
 * Scan ONE VerusID's COMPLETE staking history
 * Use this to verify accuracy before running full scan
 */

const { Pool } = require('pg');

const TARGET_ID = process.argv[2];

if (!TARGET_ID) {
  console.error('Usage: node scan-single-verusid-complete.js <i-address>');
  console.error(
    'Example: node scan-single-verusid-complete.js iPZkWmFAhQSFsgKiLExowaoXvzaor2bBZ5'
  );
  process.exit(1);
}

console.log('╔═══════════════════════════════════════════════╗');
console.log(`║  Complete History Scan for Single VerusID    ║`);
console.log('╚═══════════════════════════════════════════════╝\n');

const dbConfig = {
  connectionString:
    process.env.DATABASE_URL ||
    'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
  max: 5,
};

const db = new Pool(dbConfig);
const VERUSID_ACTIVATION_BLOCK = 800200;

let stats = {
  blocksScanned: 0,
  stakesFound: 0,
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
    id: 'single',
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

// Check if block has stake for target address
function blockHasStake(block, targetAddress) {
  if (!block || !block.tx || block.tx.length === 0) return null;

  // Check if PoS block
  const isPoS =
    block.validationtype === 'stake' || block.blocktype === 'minted';
  if (!isPoS) return null;

  // Coinstake (first tx)
  const coinstake = block.tx[0];
  if (!coinstake || !coinstake.vout) return null;

  // Check if any vout pays to target address
  for (let voutIdx = 0; voutIdx < coinstake.vout.length; voutIdx++) {
    const vout = coinstake.vout[voutIdx];
    if (!vout.scriptPubKey || !vout.scriptPubKey.addresses) continue;

    for (const addr of vout.scriptPubKey.addresses) {
      if (addr === targetAddress) {
        // Found stake! Return it (ONE stake per block)
        return {
          address: targetAddress,
          amount: Math.round(vout.value * 100000000),
          blockHeight: block.height,
          blockTime: new Date(block.time * 1000).toISOString(),
          txid: coinstake.txid,
          vout: voutIdx,
          blockHash: block.hash,
        };
      }
    }
  }

  return null;
}

// Insert stake
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
    stats.stakesFound++;
  } catch (error) {
    stats.errors++;
  }
}

// Scan complete history
async function scanCompleteHistory(targetAddress, startHeight, endHeight) {
  console.log(
    `Scanning blocks ${startHeight.toLocaleString()} to ${endHeight.toLocaleString()}...\n`
  );

  const BATCH_SIZE = 100;

  for (let height = startHeight; height <= endHeight; height += BATCH_SIZE) {
    const batchEnd = Math.min(height + BATCH_SIZE - 1, endHeight);

    for (let h = height; h <= batchEnd; h++) {
      try {
        const hash = await rpcCall('getblockhash', [h]);
        const block = await rpcCall('getblock', [hash, 2]);

        const stake = blockHasStake(block, targetAddress);
        if (stake) {
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
          console.log(`Progress: ${progress}% (Block ${h.toLocaleString()})`);
          console.log(`Stakes: ${stats.stakesFound} found`);
          console.log(`Speed: ${rate.toFixed(1)} blocks/sec`);
          console.log(
            `ETA: ${(eta / 60).toFixed(1)} min (${(eta / 3600).toFixed(1)} hours)`
          );
          console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
        }
      } catch (error) {
        if (!error.message.includes('maxBuffer')) {
          stats.errors++;
        }
      }
    }
  }
}

// Main
async function main() {
  try {
    console.log(`🎯 Target: ${TARGET_ID}\n`);

    // Clear existing data for this address
    console.log('Clearing old data for this VerusID...');
    const deleted = await db.query(
      'DELETE FROM staking_rewards WHERE identity_address = $1',
      [TARGET_ID]
    );
    console.log(`✓ Deleted ${deleted.rowCount} old records\n`);

    // Get current height
    console.log('Getting blockchain height...');
    const currentHeight = await rpcCall('getblockcount');
    console.log(`✓ Current height: ${currentHeight.toLocaleString()}\n`);

    console.log(`📊 Scan Plan:`);
    console.log(
      `   Start: ${VERUSID_ACTIVATION_BLOCK.toLocaleString()} (VerusID activation)`
    );
    console.log(`   End: ${currentHeight.toLocaleString()}`);
    console.log(
      `   Total blocks: ${(currentHeight - VERUSID_ACTIVATION_BLOCK).toLocaleString()}\n`
    );

    // Scan
    stats.startTime = Date.now();
    await scanCompleteHistory(
      TARGET_ID,
      VERUSID_ACTIVATION_BLOCK,
      currentHeight
    );

    // Results
    const totalTime = (Date.now() - stats.startTime) / 1000;
    console.log('\n╔═══════════════════════════════════════════════╗');
    console.log('║           SCAN COMPLETE!                      ║');
    console.log('╚═══════════════════════════════════════════════╝');
    console.log(`Blocks scanned: ${stats.blocksScanned.toLocaleString()}`);
    console.log(`Stakes found: ${stats.stakesFound}`);
    console.log(`Errors: ${stats.errors}`);
    console.log(`Time: ${(totalTime / 3600).toFixed(2)} hours`);
    console.log(
      `Speed: ${(stats.blocksScanned / totalTime).toFixed(1)} blocks/sec\n`
    );

    // Verify
    const verify = await db.query(
      `
      SELECT 
        COUNT(*) as total_stakes,
        ROUND(SUM(amount_sats) / 100000000.0, 2) as total_vrsc
      FROM staking_rewards 
      WHERE identity_address = $1
    `,
      [TARGET_ID]
    );

    console.log('📊 Verification:');
    console.log(`   Total stakes in DB: ${verify.rows[0].total_stakes}`);
    console.log(`   Total rewards: ${verify.rows[0].total_vrsc} VRSC\n`);

    console.log('✅ Ready to recalculate statistics!');
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  } finally {
    await db.end();
  }
}

main().catch(console.error);
