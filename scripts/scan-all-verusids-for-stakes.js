#!/usr/bin/env node
/**
 * scan-all-verusids-for-stakes.js
 * Scans ALL VerusID addresses in the database for stake events
 */

const { Pool } = require('pg');

console.log('╔═══════════════════════════════════════════════╗');
console.log('║   Scanning ALL VerusIDs for Staking Rewards  ║');
console.log('╚═══════════════════════════════════════════════╝\n');

// Configuration
const dbConfig = {
  connectionString:
    process.env.DATABASE_URL ||
    'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
  max: 10,
};

const db = new Pool(dbConfig);

// Get days to scan from command line (default 30)
const DAYS_TO_SCAN = parseInt(process.argv[2]) || 30;
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

// Get all VerusID addresses from database
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

// Check if block contains stakes for our addresses
function findStakesInBlock(block, targetAddresses) {
  const stakes = [];

  if (!block || !block.tx || block.tx.length === 0) return stakes;

  // Check if this is a PoS block (has validationtype or is minted)
  const isPoS =
    block.validationtype === 'stake' || block.blocktype === 'minted';
  if (!isPoS) return stakes;

  // Coinstake transaction (first tx)
  const coinstake = block.tx[0];
  if (!coinstake || !coinstake.vout) return stakes;

  // Check each output
  for (let voutIdx = 0; voutIdx < coinstake.vout.length; voutIdx++) {
    const vout = coinstake.vout[voutIdx];
    if (!vout.scriptPubKey || !vout.scriptPubKey.addresses) continue;

    for (const addr of vout.scriptPubKey.addresses) {
      if (targetAddresses.has(addr)) {
        stakes.push({
          address: addr,
          amount: Math.round(vout.value * 100000000), // Convert to satoshis
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
        'stake_reward',
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
  console.log(`\nScanning blocks ${startHeight} to ${endHeight}...`);

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

        if (stats.blocksScanned % 500 === 0) {
          const elapsed = (Date.now() - stats.startTime) / 1000;
          const rate = stats.blocksScanned / elapsed;
          const remaining = endHeight - h;
          const eta = remaining / rate;

          console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
          console.log(
            `Blocks: ${stats.blocksScanned} | Stakes: ${stats.stakeEventsFound}`
          );
          console.log(
            `Speed: ${rate.toFixed(1)} blocks/sec | ETA: ${(eta / 60).toFixed(1)} min`
          );
          console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
        }
      } catch (error) {
        if (!error.message.includes('maxBuffer')) {
          console.error(`Error at block ${h}: ${error.message}`);
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
    // Get all VerusIDs
    console.log('Loading VerusIDs from database...');
    const verusIDs = await getAllVerusIDs();
    stats.totalAddresses = verusIDs.length;
    console.log(`✓ Found ${stats.totalAddresses} VerusIDs\n`);

    if (stats.totalAddresses === 0) {
      console.log('⚠️  No VerusIDs found in database!');
      process.exit(1);
    }

    // Create address set for fast lookup
    const addressSet = new Set(verusIDs.map(v => v.address));

    // Get current height
    console.log('Getting blockchain height...');
    const currentHeight = await rpcCall('getblockcount');
    console.log(`✓ Current height: ${currentHeight}\n`);

    // Calculate block range
    const blocksToScan = DAYS_TO_SCAN * 1440; // ~1440 blocks per day
    const startHeight = Math.max(1, currentHeight - blocksToScan);
    const endHeight = currentHeight;

    console.log(`📅 Scanning last ${DAYS_TO_SCAN} days`);
    console.log(
      `   Block range: ${startHeight} to ${endHeight} (${blocksToScan} blocks)`
    );
    console.log(`   VerusIDs: ${stats.totalAddresses}\n`);

    // Start scan
    stats.startTime = Date.now();
    await scanBlocks(startHeight, endHeight, addressSet);

    // Final stats
    const totalTime = (Date.now() - stats.startTime) / 1000;
    console.log('\n╔═══════════════════════════════════════════════╗');
    console.log('║              SCAN COMPLETE!                   ║');
    console.log('╚═══════════════════════════════════════════════╝');
    console.log(`Blocks scanned: ${stats.blocksScanned}`);
    console.log(`Stakes found: ${stats.stakeEventsFound}`);
    console.log(`Errors: ${stats.errors}`);
    console.log(`Total time: ${(totalTime / 60).toFixed(1)} minutes`);
    console.log(
      `Speed: ${(stats.blocksScanned / totalTime).toFixed(1)} blocks/sec\n`
    );

    if (stats.stakeEventsFound > 0) {
      console.log('✅ Staking rewards added to database!');
      console.log(
        '   Run: ./scripts/update-statistics.sh to calculate stats\n'
      );
    } else {
      console.log(
        '⚠️  No stakes found in this period. Try a longer period with:'
      );
      console.log('   node scripts/scan-all-verusids-for-stakes.js 90\n');
    }
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  } finally {
    await db.end();
  }
}

main().catch(console.error);
