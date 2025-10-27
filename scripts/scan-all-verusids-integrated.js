#!/usr/bin/env node
/**
 * scan-all-verusids-integrated.js
 * Integrated scanner that captures BOTH staking rewards AND UTXOs
 *
 * This script:
 * 1. Scans blocks for staking rewards (like scan-all-verusids-for-stakes.js)
 * 2. Updates UTXO database with current state (like populate-all-utxos.js)
 *
 * Run after scan to update statistics:
 *   ./scripts/update-statistics.sh
 */

require('dotenv').config();
const { Pool } = require('pg');
const https = require('https');

console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║   Integrated VerusID Scanner: Stakes + UTXOs             ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

// Configuration
const DAYS_TO_SCAN = parseInt(process.argv[2]) || 30;
const BATCH_SIZE = 50;

// RPC configuration
const RPC_URL = 'http://127.0.0.1:18843';
const RPC_USER = 'verus';
const RPC_PASS = '1CvFqDVqdPlznV4pksyoiyZ1eKhLoRKb';

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Stats tracking
let stats = {
  totalAddresses: 0,
  blocksScanned: 0,
  stakeEventsFound: 0,
  utxosUpdated: 0,
  utxoErrors: 0,
  errors: 0,
  startTime: Date.now(),
};

// Make RPC call
async function rpcCall(method, params = []) {
  const auth = Buffer.from(`${RPC_USER}:${RPC_PASS}`).toString('base64');

  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      jsonrpc: '1.0',
      id: 'integrated-scanner',
      method,
      params,
    });

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': postData.length,
        Authorization: `Basic ${auth}`,
      },
    };

    const url = new URL(RPC_URL);
    options.hostname = url.hostname;
    options.port = url.port;
    options.path = url.pathname;
    options.protocol = url.protocol;

    const req = (url.protocol === 'https:' ? https : require('http')).request(
      options,
      res => {
        let data = '';
        res.on('data', chunk => (data += chunk));
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.error) reject(new Error(json.error.message));
            else resolve(json.result);
          } catch (e) {
            reject(e);
          }
        });
      }
    );

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Get all VerusID addresses from database
async function getAllVerusIDs() {
  const result = await pool.query(`
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
        // Calculate reward: sum(vouts) - sum(vins) for this address
        let totalOut = 0;
        let totalIn = 0;

        // Sum outputs for this address
        for (const v of coinstake.vout) {
          if (
            v.scriptPubKey &&
            v.scriptPubKey.addresses &&
            v.scriptPubKey.addresses.includes(addr)
          ) {
            totalOut += v.value || 0;
          }
        }

        // Sum inputs for this address (if we can get them)
        if (coinstake.vin) {
          for (const vin of coinstake.vin) {
            if (
              vin.scriptPubKey &&
              vin.scriptPubKey.addresses &&
              vin.scriptPubKey.addresses.includes(addr)
            ) {
              totalIn += vin.value || 0;
            }
          }
        }

        const reward = totalOut - totalIn;

        if (reward > 0) {
          stakes.push({
            address: addr,
            blockHeight: block.height,
            blockHash: block.hash,
            blockTime: new Date(block.time * 1000),
            txid: coinstake.txid,
            vout: voutIdx,
            reward: Math.round(reward * 100000000), // Convert to satoshis
          });
        }
      }
    }
  }

  return stakes;
}

// Save stake to database
async function saveStake(stake) {
  try {
    await pool.query(
      `INSERT INTO staking_rewards (
        identity_address, block_height, block_hash, block_time,
        txid, vout, amount_sats, classifier
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (txid, vout) DO NOTHING`,
      [
        stake.address,
        stake.blockHeight,
        stake.blockHash,
        stake.blockTime,
        stake.txid,
        stake.vout,
        stake.reward,
        'stake',
      ]
    );
  } catch (error) {
    console.error(`   Error saving stake: ${error.message}`);
    stats.errors++;
  }
}

// Scan blocks for stakes
async function scanBlocks(startHeight, endHeight, addressSet) {
  console.log('🔍 Starting block scan for stakes...\n');

  for (let height = startHeight; height <= endHeight; height += BATCH_SIZE) {
    const batchEnd = Math.min(height + BATCH_SIZE - 1, endHeight);

    try {
      // Scan batch
      for (let h = height; h <= batchEnd; h++) {
        const blockHash = await rpcCall('getblockhash', [h]);
        const block = await rpcCall('getblock', [blockHash, 2]);

        const stakes = findStakesInBlock(block, addressSet);
        for (const stake of stakes) {
          await saveStake(stake);
          stats.stakeEventsFound++;
        }

        stats.blocksScanned++;
      }

      // Progress update
      const progress = (
        (stats.blocksScanned / (endHeight - startHeight + 1)) *
        100
      ).toFixed(1);
      const elapsed = (Date.now() - stats.startTime) / 1000;
      const rate = stats.blocksScanned / elapsed;
      const remaining = endHeight - height;
      const eta = Math.ceil(remaining / rate / 60);

      process.stdout.write(
        `\r📊 Progress: ${stats.blocksScanned} blocks (${progress}%) | ` +
          `Stakes: ${stats.stakeEventsFound} | ` +
          `Rate: ${rate.toFixed(1)} blk/s | ` +
          `ETA: ${eta}min   `
      );
    } catch (error) {
      console.error(`\n   Error at block ${height}: ${error.message}`);
      stats.errors++;
    }
  }

  console.log('\n');
}

// Update UTXOs for all VerusIDs
async function updateAllUTXOs(verusIDs, currentHeight) {
  console.log('💾 Updating UTXO database...\n');

  for (let i = 0; i < verusIDs.length; i++) {
    const identity = verusIDs[i];
    const iaddr = identity.address;
    const name = identity.name;

    try {
      // Get current UTXOs from daemon
      const daemonUtxos = await rpcCall('getaddressutxos', [
        { addresses: [iaddr] },
      ]);

      if (
        !daemonUtxos ||
        !Array.isArray(daemonUtxos) ||
        daemonUtxos.length === 0
      ) {
        // No UTXOs - mark all as spent
        await pool.query(
          'UPDATE utxos SET is_spent = true, updated_at = NOW() WHERE address = $1 AND is_spent = false',
          [iaddr]
        );
        continue;
      }

      // Mark all existing UTXOs as spent
      await pool.query(
        'UPDATE utxos SET is_spent = true, updated_at = NOW() WHERE address = $1 AND is_spent = false',
        [iaddr]
      );

      // Insert/update current UTXOs
      for (const utxo of daemonUtxos) {
        const value = utxo.satoshis || 0;
        const height = utxo.height || 0;
        const blocktime = utxo.blocktime || 0;
        const txid = utxo.txid;
        const vout =
          utxo.outputIndex !== undefined ? utxo.outputIndex : utxo.vout;

        if (!txid || vout === undefined) continue;

        const confirmations = height ? currentHeight - height : 0;
        const isEligible = confirmations >= 150;
        const creationTime = blocktime ? new Date(blocktime * 1000) : null;

        await pool.query(
          `INSERT INTO utxos (
            address, txid, vout, value, creation_height, creation_time,
            is_spent, is_eligible, staking_probability, estimated_reward,
            created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
          ON CONFLICT (txid, vout) DO UPDATE SET
            address = EXCLUDED.address,
            value = EXCLUDED.value,
            creation_height = EXCLUDED.creation_height,
            creation_time = EXCLUDED.creation_time,
            is_spent = EXCLUDED.is_spent,
            is_eligible = EXCLUDED.is_eligible,
            updated_at = NOW()`,
          [
            iaddr,
            txid,
            vout,
            value,
            height,
            creationTime,
            false,
            isEligible,
            0,
            0,
          ]
        );
      }

      stats.utxosUpdated += daemonUtxos.length;

      // Progress update every 10 identities
      if ((i + 1) % 10 === 0) {
        const progress = (((i + 1) / verusIDs.length) * 100).toFixed(1);
        process.stdout.write(
          `\r💾 UTXO Progress: ${i + 1}/${verusIDs.length} (${progress}%) | ` +
            `UTXOs: ${stats.utxosUpdated}   `
        );
      }
    } catch (error) {
      console.error(`\n   UTXO Error for ${name}: ${error.message}`);
      stats.utxoErrors++;
    }
  }

  console.log('\n');
}

// Main
async function main() {
  try {
    // Get all VerusIDs
    console.log('📋 Loading VerusIDs from database...');
    const verusIDs = await getAllVerusIDs();
    stats.totalAddresses = verusIDs.length;
    console.log(`✅ Found ${stats.totalAddresses} VerusIDs\n`);

    if (stats.totalAddresses === 0) {
      console.log('⚠️  No VerusIDs found in database!');
      process.exit(1);
    }

    // Create address set for fast lookup
    const addressSet = new Set(verusIDs.map(v => v.address));

    // Get current height
    console.log('⛓️  Getting blockchain height...');
    const currentHeight = await rpcCall('getblockcount');
    console.log(`✅ Current height: ${currentHeight}\n`);

    // Calculate block range for stake scanning
    const blocksToScan = DAYS_TO_SCAN * 1440; // ~1440 blocks per day
    const startHeight = Math.max(1, currentHeight - blocksToScan);
    const endHeight = currentHeight;

    console.log(`📅 Configuration:`);
    console.log(`   Scanning last ${DAYS_TO_SCAN} days for stakes`);
    console.log(
      `   Block range: ${startHeight} to ${endHeight} (${blocksToScan} blocks)`
    );
    console.log(`   VerusIDs: ${stats.totalAddresses}\n`);

    // Phase 1: Scan for stakes
    console.log('═══════════════════════════════════════════════════════════');
    console.log('PHASE 1: SCANNING FOR STAKING REWARDS');
    console.log(
      '═══════════════════════════════════════════════════════════\n'
    );

    stats.startTime = Date.now();
    await scanBlocks(startHeight, endHeight, addressSet);

    const stakeTime = (Date.now() - stats.startTime) / 1000;
    console.log(
      `✅ Stake scan complete in ${(stakeTime / 60).toFixed(1)} minutes\n`
    );

    // Phase 2: Update UTXOs
    console.log('═══════════════════════════════════════════════════════════');
    console.log('PHASE 2: UPDATING UTXO DATABASE');
    console.log(
      '═══════════════════════════════════════════════════════════\n'
    );

    const utxoStartTime = Date.now();
    await updateAllUTXOs(verusIDs, currentHeight);

    const utxoTime = (Date.now() - utxoStartTime) / 1000;
    console.log(
      `✅ UTXO update complete in ${(utxoTime / 60).toFixed(1)} minutes\n`
    );

    // Final stats
    const totalTime = (Date.now() - stats.startTime) / 1000;
    console.log(
      '╔═══════════════════════════════════════════════════════════╗'
    );
    console.log(
      '║              INTEGRATED SCAN COMPLETE!                    ║'
    );
    console.log(
      '╚═══════════════════════════════════════════════════════════╝'
    );
    console.log('\n📊 STAKE SCANNING:');
    console.log(`   Blocks scanned: ${stats.blocksScanned}`);
    console.log(`   Stakes found: ${stats.stakeEventsFound}`);
    console.log(`   Errors: ${stats.errors}`);
    console.log(
      `   Speed: ${(stats.blocksScanned / stakeTime).toFixed(1)} blocks/sec`
    );

    console.log('\n💾 UTXO UPDATE:');
    console.log(`   VerusIDs processed: ${stats.totalAddresses}`);
    console.log(`   UTXOs updated: ${stats.utxosUpdated}`);
    console.log(`   Errors: ${stats.utxoErrors}`);

    console.log(`\n⏱️  TOTAL TIME: ${(totalTime / 60).toFixed(1)} minutes\n`);

    if (stats.stakeEventsFound > 0) {
      console.log('✅ Staking rewards added to database!');
      console.log('✅ UTXO database synchronized!');
      console.log('\n📈 Next step: Run statistics update:');
      console.log('   ./scripts/update-statistics.sh\n');
    } else {
      console.log(
        '⚠️  No stakes found in this period. Try a longer period with:'
      );
      console.log(`   node scripts/scan-all-verusids-integrated.js 90\n`);
    }
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
