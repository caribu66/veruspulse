#!/usr/bin/env node
/**
 * fast-on-demand-scanner.js
 * ULTRA-FAST on-demand scanner using address-based RPC calls
 *
 * Strategy:
 * 1. Use getaddressutxos - 1 call, instant UTXOs
 * 2. Use getaddresstxids - 1 call, all transaction IDs
 * 3. Fetch only stake transactions (coinstake type)
 * 4. Save to database
 *
 * Time: ~10-30 seconds instead of hours!
 */

require('dotenv').config();
const { Pool } = require('pg');
const https = require('https');
const http = require('http');

console.log('⚡ FAST On-Demand VerusID Scanner');

// Configuration
const PARALLEL_TX_FETCH = 20; // Fetch multiple transactions in parallel

// RPC configuration
const RPC_URL = process.env.VERUS_RPC_HOST || 'http://127.0.0.1:18843';
const RPC_USER = process.env.VERUS_RPC_USER || 'verus';
const RPC_PASS = process.env.VERUS_RPC_PASSWORD || 'verus';

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
});

// Progress tracking
let scanProgress = {
  status: 'idle',
  progress: 0,
  currentStep: '',
  stakesFound: 0,
  utxosFound: 0,
  txidsFound: 0,
  startTime: null,
};

// Make RPC call
async function rpcCall(method, params = []) {
  const auth = Buffer.from(`${RPC_USER}:${RPC_PASS}`).toString('base64');
  const postData = JSON.stringify({
    jsonrpc: '1.0',
    id: 'fast-scanner',
    method,
    params,
  });

  const url = new URL(RPC_URL);
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': postData.length,
      Authorization: `Basic ${auth}`,
    },
    hostname: url.hostname,
    port: url.port,
    path: url.pathname,
    protocol: url.protocol,
    agent:
      url.protocol === 'https:'
        ? new https.Agent({ rejectUnauthorized: false })
        : undefined,
  };

  return new Promise((resolve, reject) => {
    const req = (url.protocol === 'https:' ? https : http).request(
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

/**
 * Update UTXOs from daemon (FAST - 1 RPC call)
 */
async function updateUTXOs(identityAddress) {
  try {
    scanProgress.currentStep = `Fetching UTXOs for ${identityAddress}...`;
    scanProgress.progress = 10;
    console.log('   🔍 Fetching UTXOs from daemon...');

    const utxos = await rpcCall('getaddressutxos', [
      { addresses: [identityAddress] },
    ]);

    if (!utxos || utxos.length === 0) {
      console.log('   ℹ️  No UTXOs found');
      return 0;
    }

    console.log(`   ✅ Found ${utxos.length} UTXOs`);

    // Mark all existing UTXOs as spent
    await pool.query(
      `
      UPDATE utxos 
      SET is_spent = true, updated_at = NOW()
      WHERE address = $1 AND is_spent = false
    `,
      [identityAddress]
    );

    // Insert new UTXOs
    let inserted = 0;
    for (const utxo of utxos) {
      try {
        await pool.query(
          `
          INSERT INTO utxos 
            (txid, vout, address, value, creation_height, is_spent, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, false, NOW(), NOW())
          ON CONFLICT (txid, vout) 
          DO UPDATE SET 
            value = EXCLUDED.value,
            is_spent = false,
            updated_at = NOW()
        `,
          [
            utxo.txid,
            utxo.outputIndex,
            identityAddress,
            Math.round(utxo.satoshis),
            utxo.height,
          ]
        );
        inserted++;
      } catch (error) {
        // Ignore duplicate errors
        if (!error.message.includes('duplicate')) {
          console.error(`   ⚠️  UTXO insert error: ${error.message}`);
        }
      }
    }

    scanProgress.utxosFound = inserted;
    return inserted;
  } catch (error) {
    throw new Error(`Failed to update UTXOs: ${error.message}`);
  }
}

/**
 * Get all transaction IDs for an address (FAST - 1 RPC call)
 */
async function getAddressTxids(identityAddress) {
  try {
    scanProgress.currentStep = `Fetching transaction history...`;
    scanProgress.progress = 30;
    console.log('   🔍 Fetching all transaction IDs from daemon...');

    const txids = await rpcCall('getaddresstxids', [
      { addresses: [identityAddress] },
    ]);

    if (!txids || txids.length === 0) {
      console.log('   ℹ️  No transactions found');
      return [];
    }

    console.log(`   ✅ Found ${txids.length} transactions`);
    scanProgress.txidsFound = txids.length;

    return txids;
  } catch (error) {
    throw new Error(`Failed to get transaction IDs: ${error.message}`);
  }
}

/**
 * Check if a transaction is a coinstake (stake reward)
 */
async function isStakeTransaction(txid, identityAddress) {
  try {
    const tx = await rpcCall('getrawtransaction', [txid, 1]);

    // Check if this is a coinstake transaction
    if (!tx.vout || tx.vout.length === 0) return null;

    // Coinstake transactions have specific characteristics:
    // - They are the first transaction in a PoS block
    // - They have vout[0] with value = 0 (stake output)
    // - Subsequent vouts contain the actual rewards

    // Check if vout[0] has value 0 (typical coinstake pattern)
    if (tx.vout[0].value !== 0) return null;

    // Check if any vout pays to our identity address
    let totalReward = 0;
    let foundAddress = false;

    for (const vout of tx.vout) {
      if (vout.scriptPubKey && vout.scriptPubKey.addresses) {
        if (vout.scriptPubKey.addresses.includes(identityAddress)) {
          foundAddress = true;
          totalReward += vout.value;
        }
      }
    }

    if (!foundAddress) return null;

    // Get block information
    const blockHash = tx.blockhash;
    if (!blockHash) return null;

    const block = await rpcCall('getblock', [blockHash, 1]);

    return {
      txid: tx.txid,
      blockHeight: block.height,
      blockHash: blockHash,
      blockTime: new Date(block.time * 1000),
      reward: Math.round(totalReward * 100000000), // Convert to satoshis
      vout: 0, // Primary vout
    };
  } catch (error) {
    // Skip errors for individual transactions
    return null;
  }
}

/**
 * Process transactions in parallel batches
 */
async function processTransactions(txids, identityAddress) {
  scanProgress.currentStep = `Analyzing ${txids.length} transactions for stakes...`;
  console.log(`   🔍 Analyzing transactions for stakes...`);

  const stakes = [];
  let processed = 0;

  // Process in batches
  for (let i = 0; i < txids.length; i += PARALLEL_TX_FETCH) {
    const batch = txids.slice(i, i + PARALLEL_TX_FETCH);

    const batchResults = await Promise.all(
      batch.map(txid => isStakeTransaction(txid, identityAddress))
    );

    // Filter out nulls and add to stakes
    for (const result of batchResults) {
      if (result) {
        stakes.push(result);
      }
    }

    processed += batch.length;
    scanProgress.progress = 30 + (processed / txids.length) * 50; // 30% to 80%

    if (processed % 100 === 0) {
      console.log(
        `   Progress: ${processed}/${txids.length} transactions | Stakes: ${stakes.length}`
      );
    }
  }

  console.log(`   ✅ Found ${stakes.length} stake transactions`);
  return stakes;
}

/**
 * Save stakes to database
 */
async function saveStakes(stakes, identityAddress) {
  if (stakes.length === 0) return 0;

  scanProgress.currentStep = `Saving ${stakes.length} stakes to database...`;
  scanProgress.progress = 85;
  console.log(`   💾 Saving stakes to database...`);

  try {
    const values = stakes
      .map((stake, index) => {
        const offset = index * 8;
        return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8})`;
      })
      .join(', ');

    const params = stakes.flatMap(stake => [
      identityAddress,
      stake.blockHeight,
      stake.blockHash,
      stake.blockTime,
      stake.txid,
      stake.vout,
      stake.reward,
      'stake', // classifier
    ]);

    await pool.query(
      `
      INSERT INTO staking_rewards 
        (identity_address, block_height, block_hash, block_time, txid, vout, amount_sats, classifier)
      VALUES ${values}
      ON CONFLICT DO NOTHING
    `,
      params
    );

    return stakes.length;
  } catch (error) {
    throw new Error(`Failed to save stakes: ${error.message}`);
  }
}

/**
 * Main fast scan function
 */
async function fastScanVerusID(verusidName) {
  try {
    scanProgress.status = 'scanning';
    scanProgress.progress = 0;
    scanProgress.currentStep = 'Starting fast scan...';
    scanProgress.stakesFound = 0;
    scanProgress.utxosFound = 0;
    scanProgress.txidsFound = 0;
    scanProgress.startTime = Date.now();

    console.log(`\n⚡ Starting FAST scan for: ${verusidName}\n`);

    // Step 1: Get VerusID info from database
    scanProgress.currentStep = `Looking up VerusID...`;
    scanProgress.progress = 5;

    const result = await pool.query(
      `
      SELECT identity_address, base_name, friendly_name
      FROM identities
      WHERE friendly_name ILIKE $1
         OR base_name ILIKE $2
         OR friendly_name ILIKE $3
      LIMIT 1
    `,
      [
        verusidName,
        verusidName.replace('@', ''),
        `%${verusidName.replace('@', '')}%`,
      ]
    );

    if (result.rows.length === 0) {
      throw new Error(`VerusID not found in database: ${verusidName}`);
    }

    const verusid = result.rows[0];
    console.log(`✅ Found VerusID: ${verusid.friendly_name}`);
    console.log(`   Address: ${verusid.identity_address}\n`);

    // Step 2: Update UTXOs (FAST - 1 RPC call)
    const utxosUpdated = await updateUTXOs(verusid.identity_address);
    console.log('');

    // Step 3: Get all transaction IDs (FAST - 1 RPC call)
    const txids = await getAddressTxids(verusid.identity_address);
    console.log('');

    // Step 4: Process transactions to find stakes
    const stakes = await processTransactions(txids, verusid.identity_address);
    console.log('');

    // Step 5: Save stakes to database
    const stakesSaved = await saveStakes(stakes, verusid.identity_address);
    scanProgress.stakesFound = stakesSaved;
    console.log('');

    // Complete
    scanProgress.status = 'complete';
    scanProgress.progress = 100;
    scanProgress.currentStep = 'Scan complete!';

    const duration = ((Date.now() - scanProgress.startTime) / 1000).toFixed(1);
    console.log(`✅ FAST SCAN COMPLETE!`);
    console.log(`📊 Stakes found: ${stakesSaved}`);
    console.log(`📊 UTXOs updated: ${utxosUpdated}`);
    console.log(`📊 Transactions analyzed: ${txids.length}`);
    console.log(`⏱️  Duration: ${duration} seconds\n`);

    return {
      verusid: verusid.friendly_name,
      address: verusid.identity_address,
      stakes: stakesSaved,
      utxos: utxosUpdated,
      txids: txids.length,
      duration: parseFloat(duration),
    };
  } catch (error) {
    scanProgress.status = 'error';
    scanProgress.currentStep = `Error: ${error.message}`;
    console.error('❌ Fast scan failed:', error.message);
    throw error;
  }
}

/**
 * Get current progress
 */
function getProgress() {
  return { ...scanProgress };
}

/**
 * Main execution (for testing)
 */
async function main() {
  try {
    const verusidName = process.argv[2];
    if (!verusidName) {
      console.log('Usage: node fast-on-demand-scanner.js <verusid-name>');
      console.log('Example: node fast-on-demand-scanner.js "joanna@"');
      process.exit(1);
    }

    const result = await fastScanVerusID(verusidName);
    console.log('📊 Final Result:');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Fatal error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Export functions for use in API
module.exports = {
  fastScanVerusID,
  getProgress,
};

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}
