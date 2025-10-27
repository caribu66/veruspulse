#!/usr/bin/env node
/**
 * comprehensive-utxo-scanner.js
 * Complete UTXO scanner that tracks ALL transactions for VerusID addresses
 * - Tracks UTXO creation from ALL sources (stakes, transfers, conversions, etc.)
 * - Tracks UTXO spending (transfers, consolidations, etc.)
 * - Maintains accurate UTXO state for all VerusIDs
 */

const { Pool } = require('pg');

const VERUSID_ACTIVATION_BLOCK = 800200;

console.log('╔═══════════════════════════════════════════════╗');
console.log('║  Comprehensive UTXO Scanner                    ║');
console.log('║  Tracking ALL transactions for VerusIDs       ║');
console.log('╚═══════════════════════════════════════════════╝\n');

// Configuration
const dbConfig = {
  connectionString:
    process.env.DATABASE_URL ||
    'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
  max: 10,
};

const db = new Pool(dbConfig);
const BATCH_SIZE = 50; // Smaller batches for comprehensive processing
const PROGRESS_INTERVAL = 100;

let stats = {
  blocksScanned: 0,
  transactionsProcessed: 0,
  utxosCreated: 0,
  utxosSpent: 0,
  verusIDAddresses: new Set(),
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
    id: 'comprehensive-utxo-scanner',
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

// Get all VerusID addresses from the database
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

// Check if an address is a VerusID (starts with 'i' and correct length)
function isVerusIDAddress(address) {
  return address && address.startsWith('i') && address.length > 20;
}

// Process all transactions in a block for UTXO events
async function processBlockForUTXOs(block, blockHeight, verusIDAddresses) {
  if (!block || !block.tx) {
    return { created: 0, spent: 0 };
  }

  const blockTime = new Date(block.time * 1000);
  let utxosCreated = 0;
  let utxosSpent = 0;

  // Process ALL transactions in the block
  for (const tx of block.tx) {
    if (!tx.vout || !tx.vin) continue;

    stats.transactionsProcessed++;

    // 1. UTXO CREATION: Check all vouts for payments TO VerusID addresses
    for (let voutIndex = 0; voutIndex < tx.vout.length; voutIndex++) {
      const vout = tx.vout[voutIndex];

      if (vout.scriptPubKey && vout.scriptPubKey.addresses) {
        for (const address of vout.scriptPubKey.addresses) {
          // Check if this is a VerusID address OR in our tracked list
          if (isVerusIDAddress(address) || verusIDAddresses.includes(address)) {
            const amount = Math.round(vout.value * 100000000); // Convert to satoshis

            if (amount > 0) {
              try {
                await createUTXO({
                  address,
                  txid: tx.txid,
                  vout: voutIndex,
                  value: amount,
                  creationHeight: blockHeight,
                  creationTime: blockTime,
                });
                utxosCreated++;
                stats.verusIDAddresses.add(address);
              } catch (error) {
                // Ignore duplicate key errors (UTXO already exists)
                if (!error.message.includes('duplicate key')) {
                  console.error(`❌ Error creating UTXO:`, error.message);
                  stats.errors++;
                }
              }
            }
          }
        }
      }
    }

    // 2. UTXO SPENDING: Check all vins for UTXOs being spent
    for (const vin of tx.vin) {
      if (vin.txid && vin.vout !== undefined) {
        try {
          const wasSpent = await markUTXOSpent(
            vin.txid,
            vin.vout,
            tx.txid,
            blockHeight,
            blockTime
          );
          if (wasSpent) {
            utxosSpent++;
          }
        } catch (error) {
          // Ignore errors for UTXOs not in our database
        }
      }
    }
  }

  return { created: utxosCreated, spent: utxosSpent };
}

// Create a new UTXO record
async function createUTXO(utxo) {
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
      true, // is_eligible (will be calculated based on confirmations later)
    ]
  );
}

// Mark a UTXO as spent
async function markUTXOSpent(txid, vout, spentTxid, spentHeight, spentTime) {
  const result = await db.query(
    `
    UPDATE utxos 
    SET 
      is_spent = true,
      spent_txid = $3,
      spent_height = $4,
      spent_time = $5,
      updated_at = NOW()
    WHERE txid = $1 AND vout = $2
    RETURNING *
  `,
    [txid, vout, spentTxid, spentHeight, spentTime]
  );

  return result.rowCount > 0;
}

// Main scanning function
async function scanAllUTXOs() {
  try {
    console.log('🔍 Fetching VerusID addresses...');
    const verusIDAddresses = await getAllVerusIDAddresses();
    console.log(`📊 Tracking ${verusIDAddresses.length} known VerusIDs`);
    console.log('📊 Will also detect new VerusIDs during scan\n');

    console.log('🔍 Getting current blockchain height...');
    const blockchainInfo = await rpcCall('getblockchaininfo');
    const currentHeight = blockchainInfo.blocks;
    const totalBlocks = currentHeight - VERUSID_ACTIVATION_BLOCK + 1;

    console.log(
      `📊 Scanning from block ${VERUSID_ACTIVATION_BLOCK} to ${currentHeight}`
    );
    console.log(`📊 Total blocks to scan: ${totalBlocks}`);
    console.log('🚀 Starting comprehensive UTXO scan...\n');

    // Process blocks in batches
    for (
      let startBlock = VERUSID_ACTIVATION_BLOCK;
      startBlock <= currentHeight;
      startBlock += BATCH_SIZE
    ) {
      const endBlock = Math.min(startBlock + BATCH_SIZE - 1, currentHeight);

      // Process each block in the batch
      for (
        let blockHeight = startBlock;
        blockHeight <= endBlock;
        blockHeight++
      ) {
        try {
          // Get block hash
          const blockHash = await rpcCall('getblockhash', [blockHeight]);
          if (!blockHash) {
            stats.errors++;
            continue;
          }

          // Get block details with full transaction data
          const block = await rpcCall('getblock', [blockHash, 2]);
          if (!block) {
            stats.errors++;
            continue;
          }

          // Process all transactions in this block
          const result = await processBlockForUTXOs(
            block,
            blockHeight,
            verusIDAddresses
          );
          stats.utxosCreated += result.created;
          stats.utxosSpent += result.spent;
          stats.blocksScanned++;

          // Show progress
          if (stats.blocksScanned % PROGRESS_INTERVAL === 0) {
            const elapsed = Date.now() - stats.startTime;
            const rate = stats.blocksScanned / (elapsed / 1000);
            const eta = (totalBlocks - stats.blocksScanned) / rate;

            console.log(
              `⏳ Progress: ${stats.blocksScanned}/${totalBlocks} blocks (${((stats.blocksScanned / totalBlocks) * 100).toFixed(1)}%)`
            );
            console.log(
              `   💰 UTXOs: ${stats.utxosCreated} created, ${stats.utxosSpent} spent`
            );
            console.log(`   📊 Transactions: ${stats.transactionsProcessed}`);
            console.log(
              `   🏃 Rate: ${rate.toFixed(1)} blocks/sec, ETA: ${Math.round(eta / 60)}min`
            );
            console.log(`   🎯 VerusIDs: ${stats.verusIDAddresses.size}`);
            console.log(`   ❌ Errors: ${stats.errors}`);
            console.log('');
          }
        } catch (error) {
          console.error(
            `❌ Error processing block ${blockHeight}:`,
            error.message
          );
          stats.errors++;
        }
      }

      // Small delay between batches to avoid overloading RPC
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
    console.log(`📦 Blocks scanned: ${stats.blocksScanned}`);
    console.log(`📊 Transactions processed: ${stats.transactionsProcessed}`);
    console.log(`💰 UTXOs created: ${stats.utxosCreated}`);
    console.log(`💸 UTXOs spent: ${stats.utxosSpent}`);
    console.log(`🔄 Net UTXOs: ${stats.utxosCreated - stats.utxosSpent}`);
    console.log(`🎯 VerusIDs tracked: ${stats.verusIDAddresses.size}`);
    console.log(`❌ Errors: ${stats.errors}`);
    console.log(
      `🏃 Average rate: ${(stats.blocksScanned / (elapsed / 1000)).toFixed(1)} blocks/sec`
    );

    // Show UTXO summary from database
    console.log('\n📊 Database UTXO Summary:');
    const utxoSummary = await db.query(`
      SELECT 
        COUNT(*) as total_utxos,
        COUNT(*) FILTER (WHERE is_spent = false) as unspent_utxos,
        COUNT(*) FILTER (WHERE is_spent = true) as spent_utxos,
        COUNT(DISTINCT address) as unique_addresses,
        SUM(value) FILTER (WHERE is_spent = false) as total_value
      FROM utxos
    `);

    const summary = utxoSummary.rows[0];
    console.log(`   💰 Total UTXOs: ${summary.total_utxos}`);
    console.log(`   ✅ Unspent UTXOs: ${summary.unspent_utxos}`);
    console.log(`   ❌ Spent UTXOs: ${summary.spent_utxos}`);
    console.log(`   🎯 Unique addresses: ${summary.unique_addresses}`);
    console.log(
      `   💎 Total value (unspent): ${(summary.total_value / 100000000).toFixed(2)} VRSC`
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
    `📊 Final stats: ${stats.blocksScanned} blocks, ${stats.utxosCreated} created, ${stats.utxosSpent} spent`
  );
  await db.end();
  process.exit(0);
});

// Start the scan
scanAllUTXOs().catch(console.error);
