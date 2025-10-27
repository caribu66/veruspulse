#!/usr/bin/env node
/**
 * batch-fast-scan-all.js
 * Scans ALL VerusIDs in database using fast method with parallel processing
 */

const { Pool } = require('pg');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const PARALLEL_SCANS = parseInt(process.argv[2]) || 5; // Number of parallel scans
const BATCH_SIZE = parseInt(process.argv[3]) || 100; // Process in batches

console.log('╔═══════════════════════════════════════════════╗');
console.log('║   BATCH Fast Scanner - All VerusIDs          ║');
console.log('╚═══════════════════════════════════════════════╝\n');

const dbConfig = {
  connectionString:
    process.env.DATABASE_URL ||
    'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
  max: 20,
};

const db = new Pool(dbConfig);
const VERUSID_ACTIVATION_BLOCK = 800200;

let stats = {
  total: 0,
  completed: 0,
  failed: 0,
  totalStakes: 0,
  skipped: 0,
  startTime: Date.now(),
};

// RPC helper
async function rpcCall(method, params = []) {
  const rpcUser = process.env.VERUS_RPC_USER || 'verus';
  const rpcPass = process.env.VERUS_RPC_PASSWORD || 'verus';
  const rpcHost = process.env.VERUS_RPC_HOST || '127.0.0.1';
  const rpcPort = process.env.VERUS_RPC_PORT || '18843';

  const rpcData = JSON.stringify({
    jsonrpc: '1.0',
    id: 'batch',
    method,
    params,
  });

  const escapedData = rpcData.replace(/'/g, "'\\''");
  const cmd = `curl -s --user ${rpcUser}:${rpcPass} --data-binary '${escapedData}' -H 'content-type: text/plain;' http://${rpcHost}:${rpcPort}/`;

  try {
    const { stdout } = await execAsync(cmd, { maxBuffer: 50 * 1024 * 1024 });
    const result = JSON.parse(stdout);
    if (result.error) {
      throw new Error(result.error.message);
    }
    return result.result;
  } catch (error) {
    throw new Error(`RPC call failed: ${error.message}`);
  }
}

// Scan single address
async function scanAddress(address, name, currentHeight) {
  try {
    // Check if address has transactions
    const txids = await rpcCall('getaddresstxids', [
      {
        addresses: [address],
        start: VERUSID_ACTIVATION_BLOCK,
        end: currentHeight,
      },
    ]);

    if (txids.length === 0) {
      stats.skipped++;
      return { success: true, stakes: 0, name, skipped: true };
    }

    let stakesFound = 0;

    // Process transactions in batches
    const TX_BATCH = 50;
    for (let i = 0; i < txids.length; i += TX_BATCH) {
      const batch = txids.slice(i, Math.min(i + TX_BATCH, txids.length));

      await Promise.all(
        batch.map(async txid => {
          try {
            const rawTx = await rpcCall('getrawtransaction', [txid, 1]);
            const isCoinstake =
              rawTx.vin && rawTx.vin[0] && rawTx.vin[0].coinbase;

            if (isCoinstake && rawTx.vout) {
              const block = await rpcCall('getblock', [rawTx.blockhash, 1]);
              const isPoS =
                block.validationtype === 'stake' ||
                block.blocktype === 'minted';

              if (isPoS) {
                for (let voutIdx = 0; voutIdx < rawTx.vout.length; voutIdx++) {
                  const vout = rawTx.vout[voutIdx];

                  if (vout.scriptPubKey && vout.scriptPubKey.addresses) {
                    const hasTargetAddress =
                      vout.scriptPubKey.addresses.includes(address);

                    if (hasTargetAddress) {
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
                          address,
                          rawTx.txid,
                          voutIdx,
                          rawTx.height || block.height,
                          rawTx.blockhash,
                          new Date(
                            (rawTx.time || block.time) * 1000
                          ).toISOString(),
                          // Fix for data corruption: Handle both VRSC and satoshi units
                          vout.value > 1000
                            ? Math.round(vout.value)
                            : Math.round(vout.value * 100000000),
                          'coinbase',
                          address,
                        ]
                      );
                      stakesFound++;
                      break;
                    }
                  }
                }
              }
            }
          } catch (error) {
            // Skip transaction errors
          }
        })
      );
    }

    stats.totalStakes += stakesFound;
    return { success: true, stakes: stakesFound, name };
  } catch (error) {
    return { success: false, error: error.message, name };
  }
}

// Process batch with parallel execution
async function processBatch(addresses, currentHeight) {
  const results = [];

  for (let i = 0; i < addresses.length; i += PARALLEL_SCANS) {
    const batch = addresses.slice(
      i,
      Math.min(i + PARALLEL_SCANS, addresses.length)
    );

    const batchResults = await Promise.all(
      batch.map(addr =>
        scanAddress(addr.identity_address, addr.base_name, currentHeight)
      )
    );

    results.push(...batchResults);

    // Update stats
    for (const result of batchResults) {
      if (result.success) {
        stats.completed++;
      } else {
        stats.failed++;
      }
    }

    // Progress update
    const progress = ((stats.completed + stats.failed) / stats.total) * 100;
    const elapsed = (Date.now() - stats.startTime) / 1000;
    const rate = (stats.completed + stats.failed) / elapsed;
    const remaining = stats.total - (stats.completed + stats.failed);
    const eta = remaining / rate;

    process.stdout.write(
      `\r  Progress: ${progress.toFixed(1)}% | Completed: ${stats.completed} | Stakes: ${stats.totalStakes} | Skipped: ${stats.skipped} | Failed: ${stats.failed} | ETA: ${(eta / 60).toFixed(1)}m`
    );
  }

  return results;
}

// Main
async function main() {
  try {
    console.log(`⚙️  Configuration:`);
    console.log(`   Parallel scans: ${PARALLEL_SCANS}`);
    console.log(`   Batch size: ${BATCH_SIZE}\n`);

    // Get current height
    console.log('Getting blockchain height...');
    const currentHeight = await rpcCall('getblockcount');
    console.log(`✓ Current height: ${currentHeight.toLocaleString()}\n`);

    // Get all VerusIDs
    console.log('Loading VerusIDs from database...');
    const result = await db.query(`
      SELECT identity_address, base_name, friendly_name
      FROM identities
      WHERE identity_address LIKE 'i%'
      ORDER BY identity_address
    `);

    stats.total = result.rows.length;
    console.log(`✓ Found ${stats.total.toLocaleString()} VerusIDs\n`);

    if (stats.total === 0) {
      console.log('⚠️  No VerusIDs found!');
      return;
    }

    // Clear existing data (optional - comment out to keep existing)
    // console.log('Clearing existing staking data...');
    // await db.query('DELETE FROM staking_rewards');
    // console.log('✓ Cleared\n');

    console.log('🚀 Starting batch scan...\n');
    stats.startTime = Date.now();

    // Process in batches
    for (let i = 0; i < result.rows.length; i += BATCH_SIZE) {
      const batch = result.rows.slice(
        i,
        Math.min(i + BATCH_SIZE, result.rows.length)
      );
      await processBatch(batch, currentHeight);
    }

    console.log('\n');

    // Final stats
    const totalTime = (Date.now() - stats.startTime) / 1000;
    console.log('\n╔═══════════════════════════════════════════════╗');
    console.log('║           BATCH SCAN COMPLETE!                ║');
    console.log('╚═══════════════════════════════════════════════╝');
    console.log(`Total VerusIDs: ${stats.total.toLocaleString()}`);
    console.log(`Completed: ${stats.completed.toLocaleString()}`);
    console.log(`Skipped (no activity): ${stats.skipped.toLocaleString()}`);
    console.log(`Failed: ${stats.failed.toLocaleString()}`);
    console.log(`Total stakes found: ${stats.totalStakes.toLocaleString()}`);
    console.log(
      `Time: ${(totalTime / 60).toFixed(1)} minutes (${(totalTime / 3600).toFixed(2)} hours)`
    );
    console.log(
      `Average: ${(totalTime / stats.total).toFixed(2)} sec/VerusID\n`
    );

    // Database summary
    const summary = await db.query(`
      SELECT 
        COUNT(DISTINCT identity_address) as total_verusids_with_stakes,
        COUNT(*) as total_stakes,
        ROUND(SUM(amount_sats) / 100000000.0, 2) as total_vrsc
      FROM staking_rewards
    `);

    console.log('📊 Database Summary:');
    console.log(
      `   VerusIDs with stakes: ${summary.rows[0].total_verusids_with_stakes}`
    );
    console.log(
      `   Total stakes: ${summary.rows[0].total_stakes?.toLocaleString()}`
    );
    console.log(
      `   Total rewards: ${summary.rows[0].total_vrsc?.toLocaleString()} VRSC\n`
    );

    console.log('✅ Batch scan complete!');
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  } finally {
    await db.end();
  }
}

main().catch(console.error);
