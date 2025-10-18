#!/usr/bin/env node
/**
 * fast-scan-address.js
 * FAST staking scan using getaddresstxids + getaddressdeltas
 * Scans in seconds instead of hours!
 */

const { Pool } = require('pg');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const TARGET_ADDRESS = process.argv[2];

if (!TARGET_ADDRESS) {
  console.error('Usage: node fast-scan-address.js <i-address>');
  console.error(
    'Example: node fast-scan-address.js iCDYc7VjEREzSBwj442MXrWLHLWJrDVdiB'
  );
  process.exit(1);
}

console.log('╔═══════════════════════════════════════════════╗');
console.log('║       FAST Address Staking Scanner           ║');
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
  totalTxs: 0,
  stakeRewards: 0,
  errors: 0,
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
    id: 'fast',
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
    stats.stakeRewards++;
  } catch (error) {
    stats.errors++;
    console.error(`Error inserting stake: ${error.message}`);
  }
}

// Main
async function main() {
  try {
    console.log(`🎯 Target Address: ${TARGET_ADDRESS}\n`);

    // Clear existing data
    console.log('Clearing old staking data...');
    const deleted = await db.query(
      'DELETE FROM staking_rewards WHERE identity_address = $1',
      [TARGET_ADDRESS]
    );
    console.log(`✓ Deleted ${deleted.rowCount} old records\n`);

    // Get current height
    console.log('Getting blockchain height...');
    const currentHeight = await rpcCall('getblockcount');
    console.log(`✓ Current height: ${currentHeight.toLocaleString()}\n`);

    // Get all transactions for address using addressindex
    console.log('📡 Querying address transactions (using addressindex)...');
    const txids = await rpcCall('getaddresstxids', [
      {
        addresses: [TARGET_ADDRESS],
        start: VERUSID_ACTIVATION_BLOCK,
        end: currentHeight,
      },
    ]);

    stats.totalTxs = txids.length;
    console.log(`✓ Found ${stats.totalTxs.toLocaleString()} transactions\n`);

    if (stats.totalTxs === 0) {
      console.log('⚠️  No transactions found for this address');
      return;
    }

    console.log('🔍 Analyzing transactions for staking rewards...\n');

    // Process transactions in batches
    const BATCH_SIZE = 100;
    let processed = 0;

    for (let i = 0; i < txids.length; i += BATCH_SIZE) {
      const batch = txids.slice(i, Math.min(i + BATCH_SIZE, txids.length));

      // Process batch
      await Promise.all(
        batch.map(async txid => {
          try {
            // Get raw transaction
            const rawTx = await rpcCall('getrawtransaction', [txid, 1]);

            // Check if this is a coinstake (first tx in block with vin[0].coinbase)
            const isCoinstake =
              rawTx.vin && rawTx.vin[0] && rawTx.vin[0].coinbase;

            if (isCoinstake && rawTx.vout) {
              // Get block info
              const block = await rpcCall('getblock', [rawTx.blockhash, 1]);

              // Verify it's a PoS block
              const isPoS =
                block.validationtype === 'stake' ||
                block.blocktype === 'minted';

              if (isPoS) {
                // Find vouts that pay to our address
                for (let voutIdx = 0; voutIdx < rawTx.vout.length; voutIdx++) {
                  const vout = rawTx.vout[voutIdx];

                  if (vout.scriptPubKey && vout.scriptPubKey.addresses) {
                    const hasTargetAddress =
                      vout.scriptPubKey.addresses.includes(TARGET_ADDRESS);

                    if (hasTargetAddress) {
                      // This is a stake reward!
                      await insertStake({
                        address: TARGET_ADDRESS,
                        amount: Math.round(vout.value * 100000000),
                        blockHeight: rawTx.height || block.height,
                        blockTime: new Date(
                          (rawTx.time || block.time) * 1000
                        ).toISOString(),
                        txid: rawTx.txid,
                        vout: voutIdx,
                        blockHash: rawTx.blockhash,
                      });
                      break; // Only count one per transaction
                    }
                  }
                }
              }
            }
          } catch (error) {
            if (!error.message.includes('No such')) {
              stats.errors++;
            }
          }
        })
      );

      processed += batch.length;
      const progress = ((processed / stats.totalTxs) * 100).toFixed(1);
      process.stdout.write(
        `\r  Progress: ${progress}% (${processed.toLocaleString()}/${stats.totalTxs.toLocaleString()}) - Stakes found: ${stats.stakeRewards}`
      );
    }

    console.log('\n');

    // Results
    const totalTime = (Date.now() - stats.startTime) / 1000;
    console.log('\n╔═══════════════════════════════════════════════╗');
    console.log('║           SCAN COMPLETE!                      ║');
    console.log('╚═══════════════════════════════════════════════╝');
    console.log(`Transactions analyzed: ${stats.totalTxs.toLocaleString()}`);
    console.log(`Stakes found: ${stats.stakeRewards}`);
    console.log(`Errors: ${stats.errors}`);
    console.log(
      `Time: ${totalTime.toFixed(1)} seconds (${(totalTime / 60).toFixed(1)} minutes)\n`
    );

    // Verify
    const verify = await db.query(
      `
      SELECT 
        COUNT(*) as total_stakes,
        ROUND(SUM(amount_sats) / 100000000.0, 2) as total_vrsc,
        MIN(block_height) as first_block,
        MAX(block_height) as last_block,
        MIN(block_time) as first_stake,
        MAX(block_time) as last_stake
      FROM staking_rewards 
      WHERE identity_address = $1
    `,
      [TARGET_ADDRESS]
    );

    const result = verify.rows[0];
    console.log('📊 Database Verification:');
    console.log(`   Total stakes: ${result.total_stakes}`);
    console.log(`   Total rewards: ${result.total_vrsc} VRSC`);
    console.log(
      `   Block range: ${result.first_block?.toLocaleString()} - ${result.last_block?.toLocaleString()}`
    );
    console.log(
      `   Date range: ${result.first_stake?.toISOString().split('T')[0]} to ${result.last_stake?.toISOString().split('T')[0]}\n`
    );

    console.log('✅ Ready for statistics calculation!');
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  } finally {
    await db.end();
  }
}

main().catch(console.error);
