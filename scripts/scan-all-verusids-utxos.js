#!/usr/bin/env node
/**
 * scan-all-verusids-utxos.js
 * Comprehensive UTXO scanner for ALL VerusIDs
 * Scans blocks to extract UTXO creation and spending events
 */

const { Pool } = require('pg');

const VERUSID_ACTIVATION_BLOCK = 800200;

console.log('╔═══════════════════════════════════════════════╗');
console.log('║  Comprehensive VerusID UTXO Scanner           ║');
console.log('║  Scanning ALL blocks for UTXO events          ║');
console.log('╚═══════════════════════════════════════════════╝\n');

// Configuration
const dbConfig = {
  connectionString:
    process.env.DATABASE_URL ||
    'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
  max: 10,
};

const db = new Pool(dbConfig);
const BATCH_SIZE = 50; // Smaller batches for UTXO processing
const PROGRESS_INTERVAL = 100; // Show progress every N blocks

let stats = {
  totalBlocks: 0,
  blocksScanned: 0,
  utxosCreated: 0,
  utxosSpent: 0,
  verusIDsFound: new Set(),
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
  const rpcPass =
    process.env.VERUS_RPC_PASSWORD || '1CvFqDVqdPlznV4pksyoiyZ1eKhLoRKb';
  const rpcHost = process.env.VERUS_RPC_HOST || '127.0.0.1';
  const rpcPort = process.env.VERUS_RPC_PORT || '18843';

  const rpcData = JSON.stringify({
    jsonrpc: '1.0',
    id: 'utxo-scanner',
    method,
    params,
  });

  const curlCmd = `curl -s -u ${rpcUser}:${rpcPass} -d '${rpcData}' -H 'Content-Type: application/json' http://${rpcHost}:${rpcPort}`;

  try {
    const { stdout } = await execAsync(curlCmd);
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

// Get all VerusID addresses from staking_rewards
async function getAllVerusIDAddresses() {
  try {
    const result = await db.query(`
      SELECT DISTINCT identity_address 
      FROM staking_rewards 
      ORDER BY identity_address
    `);

    return result.rows.map(row => row.identity_address);
  } catch (error) {
    console.error('❌ Error fetching VerusID addresses:', error);
    throw error;
  }
}

// Process a single block for UTXO events
async function processBlockForUTXOs(blockHeight, verusIDAddresses) {
  try {
    // Get block hash
    const blockHash = await rpcCall('getblockhash', [blockHeight]);
    if (!blockHash) {
      return { created: 0, spent: 0 };
    }

    // Get block details
    const block = await rpcCall('getblock', [blockHash, 2]);
    if (!block || !block.tx) {
      return { created: 0, spent: 0 };
    }

    const blockTime = new Date(block.time * 1000);
    let utxosCreated = 0;
    let utxosSpent = 0;

    // Process each transaction in the block
    for (const tx of block.tx) {
      if (!tx.vout || !tx.vin) continue;

      // Check vouts for UTXO creation (payments TO VerusID addresses)
      for (let i = 0; i < tx.vout.length; i++) {
        const vout = tx.vout[i];
        if (vout.scriptPubKey && vout.scriptPubKey.addresses) {
          for (const address of vout.scriptPubKey.addresses) {
            if (verusIDAddresses.includes(address)) {
              // This is a UTXO creation for a VerusID
              await insertUTXO({
                address,
                txid: tx.txid,
                vout: i,
                value: Math.round(vout.value * 100000000), // Convert to satoshis
                creationHeight: blockHeight,
                creationTime: blockTime,
                isSpent: false,
                isEligible: true, // Will be updated based on confirmations
              });
              utxosCreated++;
              stats.verusIDsFound.add(address);
            }
          }
        }
      }

      // Check vins for UTXO spending (payments FROM VerusID addresses)
      for (const vin of tx.vin) {
        if (vin.txid && vin.vout !== undefined) {
          // Mark this UTXO as spent
          await markUTXOSpent(
            vin.txid,
            vin.vout,
            tx.txid,
            blockHeight,
            blockTime
          );
          utxosSpent++;
        }
      }
    }

    return { created: utxosCreated, spent: utxosSpent };
  } catch (error) {
    console.error(`❌ Error processing block ${blockHeight}:`, error.message);
    stats.errors++;
    return { created: 0, spent: 0 };
  }
}

// Insert a new UTXO
async function insertUTXO(utxo) {
  try {
    await db.query(
      `
      INSERT INTO utxos (
        address, txid, vout, value, creation_height, creation_time,
        is_spent, is_eligible, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()
      )
      ON CONFLICT (txid, vout) 
      DO UPDATE SET
        address = EXCLUDED.address,
        value = EXCLUDED.value,
        creation_height = EXCLUDED.creation_height,
        creation_time = EXCLUDED.creation_time,
        is_spent = EXCLUDED.is_spent,
        is_eligible = EXCLUDED.is_eligible,
        updated_at = NOW()
    `,
      [
        utxo.address,
        utxo.txid,
        utxo.vout,
        utxo.value,
        utxo.creationHeight,
        utxo.creationTime,
        utxo.isSpent,
        utxo.isEligible,
      ]
    );
  } catch (error) {
    console.error('❌ Error inserting UTXO:', error);
    throw error;
  }
}

// Mark a UTXO as spent
async function markUTXOSpent(txid, vout, spentTxid, spentHeight, spentTime) {
  try {
    await db.query(
      `
      UPDATE utxos 
      SET 
        is_spent = true,
        spent_txid = $3,
        spent_height = $4,
        spent_time = $5,
        updated_at = NOW()
      WHERE txid = $1 AND vout = $2
    `,
      [txid, vout, spentTxid, spentHeight, spentTime]
    );
  } catch (error) {
    // Ignore errors for UTXOs not in our database (they might be from other addresses)
  }
}

// Update UTXO eligibility based on confirmations
async function updateUTXOEligibility(currentHeight) {
  try {
    await db.query(`
      UPDATE utxos 
      SET 
        is_eligible = (currentHeight - creation_height) >= 150,
        updated_at = NOW()
      WHERE is_spent = false
    `);
  } catch (error) {
    console.error('❌ Error updating UTXO eligibility:', error);
  }
}

// Main scanning function
async function scanUTXOs() {
  try {
    console.log('🔍 Fetching VerusID addresses...');
    const verusIDAddresses = await getAllVerusIDAddresses();
    console.log(`📊 Found ${verusIDAddresses.length} VerusIDs with stakes`);

    console.log('🔍 Getting current blockchain height...');
    const blockchainInfo = await rpcCall('getblockchaininfo');
    const currentHeight = blockchainInfo.blocks;
    stats.totalBlocks = currentHeight - VERUSID_ACTIVATION_BLOCK + 1;

    console.log(
      `📊 Scanning from block ${VERUSID_ACTIVATION_BLOCK} to ${currentHeight} (${stats.totalBlocks} blocks)`
    );
    console.log('🚀 Starting UTXO scan...\n');

    // Process blocks in batches
    for (
      let startBlock = VERUSID_ACTIVATION_BLOCK;
      startBlock <= currentHeight;
      startBlock += BATCH_SIZE
    ) {
      const endBlock = Math.min(startBlock + BATCH_SIZE - 1, currentHeight);

      console.log(`📦 Processing blocks ${startBlock}-${endBlock}...`);

      // Process each block in the batch
      for (
        let blockHeight = startBlock;
        blockHeight <= endBlock;
        blockHeight++
      ) {
        const result = await processBlockForUTXOs(
          blockHeight,
          verusIDAddresses
        );
        stats.blocksScanned++;
        stats.utxosCreated += result.created;
        stats.utxosSpent += result.spent;

        // Show progress
        if (stats.blocksScanned % PROGRESS_INTERVAL === 0) {
          const elapsed = Date.now() - stats.startTime;
          const rate = stats.blocksScanned / (elapsed / 1000);
          const eta = (stats.totalBlocks - stats.blocksScanned) / rate;

          console.log(
            `⏳ Progress: ${stats.blocksScanned}/${stats.totalBlocks} blocks (${((stats.blocksScanned / stats.totalBlocks) * 100).toFixed(1)}%)`
          );
          console.log(
            `   📊 UTXOs: ${stats.utxosCreated} created, ${stats.utxosSpent} spent`
          );
          console.log(
            `   🏃 Rate: ${rate.toFixed(1)} blocks/sec, ETA: ${Math.round(eta / 60)}min`
          );
          console.log(`   🎯 VerusIDs found: ${stats.verusIDsFound.size}`);
          console.log('');
        }
      }

      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Update UTXO eligibility
    console.log('🔄 Updating UTXO eligibility...');
    await updateUTXOEligibility(currentHeight);

    // Final statistics
    const elapsed = Date.now() - stats.startTime;
    console.log('\n╔═══════════════════════════════════════════════╗');
    console.log('║              SCAN COMPLETE                    ║');
    console.log('╚═══════════════════════════════════════════════╝');
    console.log(`⏱️  Total time: ${Math.round(elapsed / 1000)}s`);
    console.log(`📦 Blocks scanned: ${stats.blocksScanned}`);
    console.log(`💰 UTXOs created: ${stats.utxosCreated}`);
    console.log(`💸 UTXOs spent: ${stats.utxosSpent}`);
    console.log(`🎯 VerusIDs with UTXOs: ${stats.verusIDsFound.size}`);
    console.log(`❌ Errors: ${stats.errors}`);
    console.log(
      `🏃 Average rate: ${(stats.blocksScanned / (elapsed / 1000)).toFixed(1)} blocks/sec`
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
    `📊 Final stats: ${stats.blocksScanned} blocks scanned, ${stats.utxosCreated} UTXOs created`
  );
  await db.end();
  process.exit(0);
});

// Start the scan
scanUTXOs().catch(console.error);
