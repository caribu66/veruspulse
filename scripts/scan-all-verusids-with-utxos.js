#!/usr/bin/env node
/**
 * scan-all-verusids-with-utxos.js
 * Enhanced VerusID scanner that tracks BOTH stakes AND UTXOs
 * Creates UTXO records when stakes are found
 */

const { Pool } = require('pg');

const VERUSID_ACTIVATION_BLOCK = 800200;

console.log('╔═══════════════════════════════════════════════╗');
console.log('║  Enhanced VerusID Scanner (Stakes + UTXOs)    ║');
console.log('║  Scanning ALL blocks for complete data        ║');
console.log('╚═══════════════════════════════════════════════╝\n');

// Configuration
const dbConfig = {
  connectionString:
    process.env.DATABASE_URL ||
    'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
  max: 10,
};

const db = new Pool(dbConfig);
const BATCH_SIZE = 100;
const PROGRESS_INTERVAL = 500;

let stats = {
  totalVerusIDs: 0,
  blocksScanned: 0,
  stakeEventsFound: 0,
  utxosCreated: 0,
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
  const rpcPass =
    process.env.VERUS_RPC_PASSWORD || '1CvFqDVqdPlznV4pksyoiyZ1eKhLoRKb';
  const rpcHost = process.env.VERUS_RPC_HOST || '127.0.0.1';
  const rpcPort = process.env.VERUS_RPC_PORT || '18843';

  const rpcData = JSON.stringify({
    jsonrpc: '1.0',
    id: 'enhanced-scanner',
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

// Enhanced stake detection that also creates UTXO records
async function findStakesInBlock(block, blockHeight, blockHash, blockTime) {
  const stakes = [];

  if (!block.tx || block.tx.length === 0) {
    return stakes;
  }

  // Check if this is a PoS block (has coinstake transaction)
  const coinstakeTx = block.tx[0]; // First transaction is the staking reward
  if (!coinstakeTx || !coinstakeTx.vout) {
    return stakes;
  }

  // Process the coinstake transaction
  for (let voutIndex = 0; voutIndex < coinstakeTx.vout.length; voutIndex++) {
    const vout = coinstakeTx.vout[voutIndex];

    if (vout.scriptPubKey && vout.scriptPubKey.addresses) {
      for (const address of vout.scriptPubKey.addresses) {
        // Check if this is a VerusID address (starts with 'i')
        if (address.startsWith('i') && address.length > 20) {
          const amount = Math.round(vout.value * 100000000); // Convert to satoshis

          if (amount > 0) {
            stakes.push({
              address,
              txid: coinstakeTx.txid,
              vout: voutIndex,
              blockHeight,
              blockHash,
              blockTime,
              amount,
            });
          }
        }
      }
    }
  }

  return stakes;
}

// Insert stake AND create corresponding UTXO record
async function insertStakeWithUTXO(stake) {
  try {
    // Start a transaction
    await db.query('BEGIN');

    // Insert stake record
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

    // Create UTXO record for this stake
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
        stake.address,
        stake.txid,
        stake.vout,
        stake.amount,
        stake.blockHeight,
        stake.blockTime,
        false, // is_spent - stakes create new UTXOs
        true, // is_eligible - stakes are immediately eligible (after cooldown)
      ]
    );

    // Commit the transaction
    await db.query('COMMIT');

    return true;
  } catch (error) {
    // Rollback on error
    await db.query('ROLLBACK');
    console.error('❌ Error inserting stake with UTXO:', error);
    throw error;
  }
}

// Main scanning function
async function scanAllVerusIDs() {
  try {
    console.log('🔍 Getting current blockchain height...');
    const blockchainInfo = await rpcCall('getblockchaininfo');
    const currentHeight = blockchainInfo.blocks;

    console.log(
      `📊 Scanning from block ${VERUSID_ACTIVATION_BLOCK} to ${currentHeight}`
    );
    console.log(
      `📊 Total blocks to scan: ${currentHeight - VERUSID_ACTIVATION_BLOCK + 1}`
    );
    console.log('🚀 Starting enhanced scan...\n');

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
        try {
          // Get block hash
          const blockHash = await rpcCall('getblockhash', [blockHeight]);
          if (!blockHash) {
            stats.errors++;
            continue;
          }

          // Get block details
          const block = await rpcCall('getblock', [blockHash, 2]);
          if (!block) {
            stats.errors++;
            continue;
          }

          const blockTime = new Date(block.time * 1000);

          // Find stakes in this block
          const stakes = await findStakesInBlock(
            block,
            blockHeight,
            blockHash,
            blockTime
          );

          // Process each stake
          for (const stake of stakes) {
            try {
              await insertStakeWithUTXO(stake);
              stats.stakeEventsFound++;
              stats.utxosCreated++; // Each stake creates a UTXO
              stats.verusIDsWithNewStakes.add(stake.address);
            } catch (error) {
              console.error(
                `❌ Error processing stake for ${stake.address}:`,
                error.message
              );
              stats.errors++;
            }
          }

          stats.blocksScanned++;

          // Show progress
          if (stats.blocksScanned % PROGRESS_INTERVAL === 0) {
            const elapsed = Date.now() - stats.startTime;
            const rate = stats.blocksScanned / (elapsed / 1000);
            const eta =
              (currentHeight -
                VERUSID_ACTIVATION_BLOCK +
                1 -
                stats.blocksScanned) /
              rate;

            console.log(
              `⏳ Progress: ${stats.blocksScanned}/${currentHeight - VERUSID_ACTIVATION_BLOCK + 1} blocks (${((stats.blocksScanned / (currentHeight - VERUSID_ACTIVATION_BLOCK + 1)) * 100).toFixed(1)}%)`
            );
            console.log(`   💰 Stakes found: ${stats.stakeEventsFound}`);
            console.log(`   🎯 UTXOs created: ${stats.utxosCreated}`);
            console.log(
              `   🏃 Rate: ${rate.toFixed(1)} blocks/sec, ETA: ${Math.round(eta / 60)}min`
            );
            console.log(`   🎯 VerusIDs: ${stats.verusIDsWithNewStakes.size}`);
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

      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Final statistics
    const elapsed = Date.now() - stats.startTime;
    console.log('\n╔═══════════════════════════════════════════════╗');
    console.log('║              SCAN COMPLETE                    ║');
    console.log('╚═══════════════════════════════════════════════╝');
    console.log(`⏱️  Total time: ${Math.round(elapsed / 1000)}s`);
    console.log(`📦 Blocks scanned: ${stats.blocksScanned}`);
    console.log(`💰 Stakes found: ${stats.stakeEventsFound}`);
    console.log(`🎯 UTXOs created: ${stats.utxosCreated}`);
    console.log(
      `🏷️  VerusIDs with stakes: ${stats.verusIDsWithNewStakes.size}`
    );
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
    `📊 Final stats: ${stats.blocksScanned} blocks scanned, ${stats.stakeEventsFound} stakes found, ${stats.utxosCreated} UTXOs created`
  );
  await db.end();
  process.exit(0);
});

// Start the scan
scanAllVerusIDs().catch(console.error);
