#!/usr/bin/env node
/**
 * backfill-joanna-utxos.js
 * Scan ALL historical blocks where joanna@ has stakes and create UTXO records
 * This ensures we have complete UTXO data for joanna@
 */

const { Pool } = require('pg');

const JOANNA_IADDR = 'iPZkWmFAhQSFsgKiLExowaoXvzaor2bBZ5';
const VERUSID_ACTIVATION_BLOCK = 800200;

console.log('╔═══════════════════════════════════════════════╗');
console.log('║  Backfilling UTXOs for joanna@                ║');
console.log('╚═══════════════════════════════════════════════╝\n');

const dbConfig = {
  connectionString:
    process.env.DATABASE_URL ||
    'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
  max: 10,
};

const db = new Pool(dbConfig);

let stats = {
  blocksToScan: 0,
  blocksProcessed: 0,
  utxosCreated: 0,
  utxosAlreadyExist: 0,
  errors: 0,
  startTime: Date.now(),
};

// RPC helper with increased buffer
async function rpcCall(method, params = []) {
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);

  const rpcUser = process.env.VERUS_RPC_USER || 'verus';
  const rpcPass =
    process.env.VERUS_RPC_PASSWORD || '1CvFqDVqdPlznV4pksyoiyZ1eKhLoRKb';
  const rpcHost = process.env.VERUS_RPC_HOST || '127.0.0.1';
  const rpcPort = process.env.VERUS_RPC_PORT || '18843';

  const rpcData = JSON.stringify({
    jsonrpc: '1.0',
    id: 'backfill-joanna-utxos',
    method,
    params,
  });

  const curlCmd = `curl -s -u ${rpcUser}:${rpcPass} -d '${rpcData}' -H 'Content-Type: application/json' http://${rpcHost}:${rpcPort}`;

  try {
    // Increase maxBuffer to 50MB for large blocks
    const { stdout } = await execAsync(curlCmd, {
      maxBuffer: 50 * 1024 * 1024,
    });
    const response = JSON.parse(stdout);

    if (response.error) {
      throw new Error(`RPC Error: ${response.error.message}`);
    }

    return response.result;
  } catch (error) {
    console.error(`❌ RPC call failed for ${method}:`, error.message);
    throw error;
  }
}

// Get all block heights where joanna@ has stakes
async function getJoannaStakeBlocks() {
  try {
    const result = await db.query(
      `
      SELECT DISTINCT block_height
      FROM staking_rewards
      WHERE identity_address = $1
      ORDER BY block_height ASC
    `,
      [JOANNA_IADDR]
    );

    return result.rows.map(row => row.block_height);
  } catch (error) {
    console.error('❌ Error fetching stake blocks:', error);
    throw error;
  }
}

// Create a UTXO record
async function createUTXO(utxo) {
  try {
    await db.query(
      `
      INSERT INTO utxos (
        address, txid, vout, value, creation_height, creation_time,
        is_spent, is_eligible, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()
      )
      ON CONFLICT (txid, vout) DO NOTHING
    `,
      [
        utxo.address,
        utxo.txid,
        utxo.vout,
        utxo.value,
        utxo.creationHeight,
        utxo.creationTime,
        false, // is_spent
        true, // is_eligible
      ]
    );

    stats.utxosCreated++;
  } catch (error) {
    if (error.message.includes('duplicate key')) {
      stats.utxosAlreadyExist++;
    } else {
      console.error('❌ Error creating UTXO:', error);
      stats.errors++;
    }
  }
}

// Process a single block for joanna's UTXOs
async function processBlockForJoanna(blockHeight) {
  try {
    const blockHash = await rpcCall('getblockhash', [blockHeight]);
    if (!blockHash) {
      stats.errors++;
      return 0;
    }

    const block = await rpcCall('getblock', [blockHash, 2]);
    if (!block || !block.tx) {
      stats.errors++;
      return 0;
    }

    const blockTime = new Date(block.time * 1000);
    let utxosFoundInBlock = 0;

    // Process ALL transactions in the block
    for (const tx of block.tx) {
      if (!tx.vout) continue;

      // Check all vouts for payments TO joanna@
      for (let voutIndex = 0; voutIndex < tx.vout.length; voutIndex++) {
        const vout = tx.vout[voutIndex];

        if (vout.scriptPubKey && vout.scriptPubKey.addresses) {
          for (const address of vout.scriptPubKey.addresses) {
            if (address === JOANNA_IADDR) {
              const amount = Math.round(vout.value * 100000000); // Convert to satoshis

              if (amount > 0) {
                await createUTXO({
                  address: JOANNA_IADDR,
                  txid: tx.txid,
                  vout: voutIndex,
                  value: amount,
                  creationHeight: blockHeight,
                  creationTime: blockTime,
                });
                utxosFoundInBlock++;
              }
            }
          }
        }
      }
    }

    stats.blocksProcessed++;
    return utxosFoundInBlock;
  } catch (error) {
    console.error(`❌ Error processing block ${blockHeight}:`, error.message);
    stats.errors++;
    return 0;
  }
}

// Main backfill function
async function backfillJoannaUTXOs() {
  try {
    console.log(`🎯 Target: joanna@ (${JOANNA_IADDR})`);

    // Get current UTXO count
    const utxoResult = await db.query(
      `
      SELECT COUNT(*) as total_utxos
      FROM utxos
      WHERE address = $1
    `,
      [JOANNA_IADDR]
    );

    console.log(
      `💰 Current UTXOs in database: ${utxoResult.rows[0].total_utxos}`
    );

    // Get all blocks where joanna@ has stakes
    console.log('🔍 Finding all blocks where joanna@ has stakes...');
    const stakeBlocks = await getJoannaStakeBlocks();
    stats.blocksToScan = stakeBlocks.length;

    console.log(`📊 Found ${stakeBlocks.length} blocks with stakes`);
    console.log(`🚀 Starting UTXO backfill...\n`);

    // Process blocks in batches
    const BATCH_SIZE = 10;
    for (let i = 0; i < stakeBlocks.length; i += BATCH_SIZE) {
      const batch = stakeBlocks.slice(
        i,
        Math.min(i + BATCH_SIZE, stakeBlocks.length)
      );

      // Process batch sequentially
      for (const blockHeight of batch) {
        const utxosFound = await processBlockForJoanna(blockHeight);

        if (utxosFound > 0) {
          console.log(`✅ Block ${blockHeight}: Found ${utxosFound} UTXO(s)`);
        }
      }

      // Show progress every batch
      const elapsed = Date.now() - stats.startTime;
      const rate = stats.blocksProcessed / (elapsed / 1000);
      const remaining = stats.blocksToScan - stats.blocksProcessed;
      const eta = remaining / rate;

      console.log(
        `⏳ Progress: ${stats.blocksProcessed}/${stats.blocksToScan} blocks (${((stats.blocksProcessed / stats.blocksToScan) * 100).toFixed(1)}%)`
      );
      console.log(`   💰 UTXOs created: ${stats.utxosCreated}`);
      console.log(`   ♻️  Already existed: ${stats.utxosAlreadyExist}`);
      console.log(
        `   🏃 Rate: ${rate.toFixed(1)} blocks/sec, ETA: ${Math.round(eta / 60)}min`
      );
      console.log(`   ❌ Errors: ${stats.errors}`);
      console.log('');

      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Final statistics
    const elapsed = Date.now() - stats.startTime;
    console.log('\n╔═══════════════════════════════════════════════╗');
    console.log('║              BACKFILL COMPLETE                ║');
    console.log('╚═══════════════════════════════════════════════╝');
    console.log(
      `⏱️  Total time: ${Math.round(elapsed / 1000)}s (${(elapsed / 60000).toFixed(1)}min)`
    );
    console.log(`📦 Blocks processed: ${stats.blocksProcessed}`);
    console.log(`💰 New UTXOs created: ${stats.utxosCreated}`);
    console.log(`♻️  UTXOs already existed: ${stats.utxosAlreadyExist}`);
    console.log(`❌ Errors: ${stats.errors}`);
    console.log(
      `🏃 Average rate: ${(stats.blocksProcessed / (elapsed / 1000)).toFixed(1)} blocks/sec`
    );

    // Get final UTXO count
    const finalUtxoResult = await db.query(
      `
      SELECT 
        COUNT(*) as total_utxos,
        COUNT(*) FILTER (WHERE is_spent = false) as unspent_utxos,
        SUM(value) FILTER (WHERE is_spent = false) as total_value
      FROM utxos
      WHERE address = $1
    `,
      [JOANNA_IADDR]
    );

    const finalUtxos = finalUtxoResult.rows[0];
    console.log('\n📊 Final UTXO Summary:');
    console.log(`   💰 Total UTXOs: ${finalUtxos.total_utxos}`);
    console.log(`   ✅ Unspent: ${finalUtxos.unspent_utxos}`);
    console.log(
      `   💎 Total value: ${(finalUtxos.total_value / 100000000).toFixed(2)} VRSC`
    );
  } catch (error) {
    console.error('❌ Fatal error during backfill:', error);
  } finally {
    await db.end();
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  console.log(
    `📊 Final stats: ${stats.blocksProcessed}/${stats.blocksToScan} blocks, ${stats.utxosCreated} UTXOs created`
  );
  await db.end();
  process.exit(0);
});

// Start the backfill
backfillJoannaUTXOs().catch(console.error);
