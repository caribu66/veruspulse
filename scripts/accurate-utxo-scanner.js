#!/usr/bin/env node
/**
 * accurate-utxo-scanner.js
 * Scan ALL blocks for ALL transactions to get accurate UTXO data
 * This separates UTXO tracking from staking rewards
 */

const { Pool } = require('pg');

const JOANNA_IADDR = 'iPZkWmFAhQSFsgKiLExowaoXvzaor2bBZ5';
const START_BLOCK = 800200; // VerusID activation
const END_BLOCK = 3276256; // Current blockchain height

console.log('╔═══════════════════════════════════════════════╗');
console.log('║  Accurate UTXO Scanner for joanna@             ║');
console.log('╚═══════════════════════════════════════════════╝\n');

const dbConfig = {
  connectionString:
    process.env.DATABASE_URL ||
    'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
  max: 10,
};

const db = new Pool(dbConfig);

let stats = {
  blocksProcessed: 0,
  utxosCreated: 0,
  utxosSpent: 0,
  transactionsProcessed: 0,
  errors: 0,
  startTime: Date.now(),
};

// RPC helper
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
    id: 'accurate-utxo-scanner',
    method,
    params,
  });

  const curlCmd = `curl -s -u ${rpcUser}:${rpcPass} -d '${rpcData}' -H 'Content-Type: application/json' http://${rpcHost}:${rpcPort}`;

  try {
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

// Create UTXO record
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
      // UTXO already exists, skip
    } else {
      console.error('❌ Error creating UTXO:', error);
      stats.errors++;
    }
  }
}

// Mark UTXO as spent
async function markUTXOSpent(txid, vout, spentTxid, spentHeight, spentTime) {
  try {
    await db.query(
      `
      UPDATE utxos 
      SET is_spent = true, spent_txid = $3, spent_height = $4, spent_time = $5, updated_at = NOW()
      WHERE txid = $1 AND vout = $2
    `,
      [txid, vout, spentTxid, spentHeight, spentTime]
    );

    stats.utxosSpent++;
  } catch (error) {
    console.error('❌ Error marking UTXO spent:', error);
    stats.errors++;
  }
}

// Get existing UTXO
async function getUTXOByTxidVout(txid, vout) {
  try {
    const result = await db.query(
      `
      SELECT * FROM utxos WHERE txid = $1 AND vout = $2
    `,
      [txid, vout]
    );

    return result.rows[0] || null;
  } catch (error) {
    console.error('❌ Error getting UTXO:', error);
    return null;
  }
}

// Process a single block
async function processBlock(blockHeight) {
  try {
    const blockHash = await rpcCall('getblockhash', [blockHeight]);
    if (!blockHash) {
      stats.errors++;
      return;
    }

    const block = await rpcCall('getblock', [blockHash, 2]);
    if (!block || !block.tx) {
      stats.errors++;
      return;
    }

    const blockTime = new Date(block.time * 1000);

    // Process ALL transactions in the block
    for (const tx of block.tx) {
      stats.transactionsProcessed++;

      // Process outputs (UTXO creation)
      if (tx.vout) {
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
                }
              }
            }
          }
        }
      }

      // Process inputs (UTXO spending)
      if (tx.vin) {
        for (const vin of tx.vin) {
          if (vin.txid && vin.vout !== undefined) {
            // Check if this input spends a known UTXO
            const spentUtxo = await getUTXOByTxidVout(vin.txid, vin.vout);
            if (spentUtxo && spentUtxo.address === JOANNA_IADDR) {
              await markUTXOSpent(
                spentUtxo.txid,
                spentUtxo.vout,
                tx.txid,
                blockHeight,
                blockTime
              );
            }
          }
        }
      }
    }

    stats.blocksProcessed++;
  } catch (error) {
    console.error(`❌ Error processing block ${blockHeight}:`, error.message);
    stats.errors++;
  }
}

// Main scanning function
async function scanAllBlocks() {
  try {
    console.log(`🎯 Target: joanna@ (${JOANNA_IADDR})`);
    console.log(`📊 Block range: ${START_BLOCK} to ${END_BLOCK}`);
    console.log(`🚀 Starting comprehensive UTXO scan...\n`);

    // Clear existing UTXOs for joanna@ first
    console.log('🧹 Clearing existing UTXO data...');
    await db.query('DELETE FROM utxos WHERE address = $1', [JOANNA_IADDR]);
    console.log('✅ Cleared existing data\n');

    // Process blocks in batches
    const BATCH_SIZE = 100;
    const totalBlocks = END_BLOCK - START_BLOCK;

    for (
      let blockHeight = START_BLOCK;
      blockHeight <= END_BLOCK;
      blockHeight += BATCH_SIZE
    ) {
      const batchEnd = Math.min(blockHeight + BATCH_SIZE - 1, END_BLOCK);

      // Process batch
      for (
        let currentBlock = blockHeight;
        currentBlock <= batchEnd;
        currentBlock++
      ) {
        await processBlock(currentBlock);
      }

      // Show progress
      const elapsed = Date.now() - stats.startTime;
      const rate = stats.blocksProcessed / (elapsed / 1000);
      const remaining = totalBlocks - stats.blocksProcessed;
      const eta = remaining / rate;

      const progress = ((stats.blocksProcessed / totalBlocks) * 100).toFixed(1);

      console.log(
        `⏳ Progress: ${stats.blocksProcessed}/${totalBlocks} blocks (${progress}%)`
      );
      console.log(`   💰 UTXOs created: ${stats.utxosCreated}`);
      console.log(`   💸 UTXOs spent: ${stats.utxosSpent}`);
      console.log(`   📝 Transactions: ${stats.transactionsProcessed}`);
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
    console.log('║              SCAN COMPLETE                    ║');
    console.log('╚═══════════════════════════════════════════════╝');
    console.log(
      `⏱️  Total time: ${Math.round(elapsed / 1000)}s (${(elapsed / 60000).toFixed(1)}min)`
    );
    console.log(`📦 Blocks processed: ${stats.blocksProcessed}`);
    console.log(`💰 UTXOs created: ${stats.utxosCreated}`);
    console.log(`💸 UTXOs spent: ${stats.utxosSpent}`);
    console.log(`📝 Transactions processed: ${stats.transactionsProcessed}`);
    console.log(`❌ Errors: ${stats.errors}`);
    console.log(
      `🏃 Average rate: ${(stats.blocksProcessed / (elapsed / 1000)).toFixed(1)} blocks/sec`
    );

    // Get final UTXO summary
    const finalResult = await db.query(
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

    const final = finalResult.rows[0];
    console.log('\n📊 Final UTXO Summary:');
    console.log(`   💰 Total UTXOs: ${final.total_utxos}`);
    console.log(`   ✅ Unspent: ${final.unspent_utxos}`);
    console.log(
      `   💎 Total value: ${(final.total_value / 100000000).toFixed(2)} VRSC`
    );
  } catch (error) {
    console.error('❌ Fatal error during scan:', error);
  } finally {
    await db.end();
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  console.log(
    `📊 Final stats: ${stats.blocksProcessed} blocks, ${stats.utxosCreated} UTXOs created`
  );
  await db.end();
  process.exit(0);
});

// Start the scan
scanAllBlocks().catch(console.error);
