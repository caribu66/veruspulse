#!/usr/bin/env node
/**
 * proper-utxo-tracker.js
 * Get ACTUAL current UTXOs for joanna@ using RPC listunspent
 * This separates UTXO tracking from staking rewards completely
 */

const { Pool } = require('pg');

const JOANNA_IADDR = 'iPZkWmFAhQSFsgKiLExowaoXvzaor2bBZ5';

console.log('╔═══════════════════════════════════════════════╗');
console.log('║  Proper UTXO Tracker for joanna@              ║');
console.log('╚═══════════════════════════════════════════════╝\n');

const dbConfig = {
  connectionString:
    process.env.DATABASE_URL ||
    'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
  max: 10,
};

const db = new Pool(dbConfig);

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
    id: 'proper-utxo-tracker',
    method,
    params,
  });

  const curlCmd = `curl -s -u ${rpcUser}:${rpcPass} -d '${rpcData}' -H 'Content-Type: application/json' http://${rpcHost}:${rpcPort}`;

  try {
    const { stdout } = await execAsync(curlCmd, {
      maxBuffer: 10 * 1024 * 1024,
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

    return true;
  } catch (error) {
    if (error.message.includes('duplicate key')) {
      return false; // UTXO already exists
    } else {
      console.error('❌ Error creating UTXO:', error);
      return false;
    }
  }
}

// Get current blockchain height
async function getCurrentHeight() {
  try {
    const info = await rpcCall('getblockchaininfo');
    return info.blocks;
  } catch (error) {
    console.error('❌ Error getting blockchain info:', error);
    return null;
  }
}

// Get block time
async function getBlockTime(blockHeight) {
  try {
    const blockHash = await rpcCall('getblockhash', [blockHeight]);
    const block = await rpcCall('getblock', [blockHash, 1]);
    return new Date(block.time * 1000);
  } catch (error) {
    console.error(`❌ Error getting block time for ${blockHeight}:`, error);
    return new Date();
  }
}

// Main function to track actual UTXOs
async function trackActualUTXOs() {
  try {
    console.log(`🎯 Target: joanna@ (${JOANNA_IADDR})`);

    // Get current blockchain height
    const currentHeight = await getCurrentHeight();
    if (!currentHeight) {
      console.error('❌ Could not get current blockchain height');
      return;
    }

    console.log(`📊 Current blockchain height: ${currentHeight}`);

    // Use listunspent to get ACTUAL current UTXOs
    console.log('🔍 Fetching actual UTXOs using listunspent...');
    const utxos = await rpcCall('listunspent', [1, 9999999, [JOANNA_IADDR]]);

    if (!utxos || utxos.length === 0) {
      console.log('❌ No UTXOs found for joanna@');
      return;
    }

    console.log(`✅ Found ${utxos.length} actual UTXOs`);

    // Process each UTXO
    let created = 0;
    let skipped = 0;
    let totalValue = 0;

    for (const utxo of utxos) {
      const value = Math.round(utxo.amount * 100000000); // Convert to satoshis
      totalValue += value;

      // Get block time for creation height
      const blockTime = await getBlockTime(utxo.height);

      const utxoData = {
        address: JOANNA_IADDR,
        txid: utxo.txid,
        vout: utxo.vout,
        value: value,
        creationHeight: utxo.height,
        creationTime: blockTime,
      };

      const wasCreated = await createUTXO(utxoData);
      if (wasCreated) {
        created++;
        console.log(
          `✅ Created UTXO: ${utxo.txid}:${utxo.vout} = ${(value / 100000000).toFixed(8)} VRSC`
        );
      } else {
        skipped++;
      }
    }

    console.log('\n╔═══════════════════════════════════════════════╗');
    console.log('║              TRACKING COMPLETE                ║');
    console.log('╚═══════════════════════════════════════════════╝');
    console.log(`📦 UTXOs processed: ${utxos.length}`);
    console.log(`✅ New UTXOs created: ${created}`);
    console.log(`♻️  UTXOs already existed: ${skipped}`);
    console.log(`💎 Total value: ${(totalValue / 100000000).toFixed(8)} VRSC`);

    // Get final summary from database
    const finalResult = await db.query(
      `
      SELECT 
        COUNT(*) as total_utxos,
        SUM(value) as total_value_satoshis,
        SUM(value)/100000000 as total_value_vrsc
      FROM utxos
      WHERE address = $1
    `,
      [JOANNA_IADDR]
    );

    const final = finalResult.rows[0];
    console.log('\n📊 Database Summary:');
    console.log(`   💰 Total UTXOs: ${final.total_utxos}`);
    console.log(`   💎 Total value: ${final.total_value_vrsc} VRSC`);

    // Verify the data makes sense
    if (final.total_value_vrsc > 1000000) {
      console.log(
        '\n⚠️  WARNING: Total value seems high. Please verify this is correct.'
      );
    } else {
      console.log('\n✅ UTXO data looks reasonable!');
    }
  } catch (error) {
    console.error('❌ Fatal error during tracking:', error);
  } finally {
    await db.end();
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  await db.end();
  process.exit(0);
});

// Start the tracking
trackActualUTXOs().catch(console.error);
