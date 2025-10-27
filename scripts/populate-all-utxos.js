#!/usr/bin/env node
/**
 * populate-all-utxos.js
 * Populate UTXO database with accurate data from the Verus daemon for ALL VerusIDs
 */

require('dotenv').config();
const { Pool } = require('pg');
const https = require('https');

// RPC configuration
const RPC_URL = 'http://127.0.0.1:18843';
const RPC_USER = 'verus';
const RPC_PASS = '1CvFqDVqdPlznV4pksyoiyZ1eKhLoRKb';

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Make RPC call
async function rpcCall(method, params = []) {
  const auth = Buffer.from(`${RPC_USER}:${RPC_PASS}`).toString('base64');

  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      jsonrpc: '1.0',
      id: 'populate-utxos',
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

async function populateAllUTXOs() {
  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║  Populating UTXO Database from Verus Daemon       ║');
  console.log('╚════════════════════════════════════════════════════╝\n');

  try {
    // Get current blockchain height
    console.log('🔍 Getting current blockchain height...');
    const blockchainInfo = await rpcCall('getblockchaininfo');
    const currentHeight = blockchainInfo.blocks;
    console.log(`✅ Current height: ${currentHeight}\n`);

    // Get all known VerusIDs
    console.log('📋 Fetching all known VerusIDs...');
    const identitiesResult = await pool.query('SELECT * FROM identities');
    const allIdentities = identitiesResult.rows;
    console.log(`✅ Found ${allIdentities.length} VerusIDs\n`);

    let totalProcessed = 0;
    let totalUTXOs = 0;
    let totalValue = 0;
    let errorCount = 0;
    const startTime = Date.now();

    // Process each VerusID
    for (let i = 0; i < allIdentities.length; i++) {
      const identity = allIdentities[i];
      const iaddr = identity.identity_address;
      const name =
        identity.name || identity.friendly_name || iaddr.substring(0, 10);

      try {
        console.log(`[${i + 1}/${allIdentities.length}] Processing ${name}...`);

        // Get current UTXOs from daemon
        const daemonUtxos = await rpcCall('getaddressutxos', [
          { addresses: [iaddr] },
        ]);

        if (
          !daemonUtxos ||
          !Array.isArray(daemonUtxos) ||
          daemonUtxos.length === 0
        ) {
          console.log(`   ⚠️  No UTXOs found for ${name}`);
          totalProcessed++;
          continue;
        }

        // First, mark all existing UTXOs for this address as spent
        await pool.query(
          'UPDATE utxos SET is_spent = true, updated_at = NOW() WHERE address = $1 AND is_spent = false',
          [iaddr]
        );

        let utxoCount = 0;
        let addressValue = 0;

        // Process each UTXO
        for (const utxo of daemonUtxos) {
          const value = utxo.satoshis || 0;
          const height = utxo.height || 0;
          const blocktime = utxo.blocktime || 0;
          const txid = utxo.txid;
          const vout =
            utxo.outputIndex !== undefined ? utxo.outputIndex : utxo.vout;

          if (!txid || vout === undefined) {
            console.log(`   ⚠️  Skipping invalid UTXO (missing txid or vout)`);
            continue;
          }

          // Calculate confirmations
          const confirmations = height ? currentHeight - height : 0;

          // Determine if eligible (150+ confirmations)
          const isEligible = confirmations >= 150;

          const creationTime = blocktime ? new Date(blocktime * 1000) : null;

          // Upsert UTXO
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

          utxoCount++;
          addressValue += value;
        }

        totalUTXOs += utxoCount;
        totalValue += addressValue;
        totalProcessed++;

        const valueVRSC = (addressValue / 100000000).toFixed(2);
        console.log(`   ✅ ${utxoCount} UTXOs, ${valueVRSC} VRSC`);

        // Progress update every 10 identities
        if ((i + 1) % 10 === 0) {
          const elapsedSeconds = (Date.now() - startTime) / 1000;
          const rate = (i + 1) / elapsedSeconds;
          const remaining = allIdentities.length - (i + 1);
          const etaSeconds = remaining / rate;
          const etaMinutes = Math.ceil(etaSeconds / 60);

          console.log(
            `\n⏳ Progress: ${i + 1}/${allIdentities.length} (${(((i + 1) / allIdentities.length) * 100).toFixed(1)}%)`
          );
          console.log(`   💰 Total UTXOs: ${totalUTXOs}`);
          console.log(
            `   💎 Total value: ${(totalValue / 100000000).toFixed(2)} VRSC`
          );
          console.log(
            `   🏃 Rate: ${rate.toFixed(1)} IDs/sec, ETA: ${etaMinutes}min`
          );
          console.log(`   ❌ Errors: ${errorCount}\n`);
        }
      } catch (error) {
        console.error(`   ❌ Error processing ${name}: ${error.message}`);
        errorCount++;
        totalProcessed++;
      }
    }

    const totalSeconds = (Date.now() - startTime) / 1000;
    const totalMinutes = (totalSeconds / 60).toFixed(1);

    console.log('\n╔════════════════════════════════════════════════════╗');
    console.log('║              POPULATION COMPLETE                   ║');
    console.log('╚════════════════════════════════════════════════════╝');
    console.log(
      `⏱️  Total time: ${totalSeconds.toFixed(0)}s (${totalMinutes}min)`
    );
    console.log(`📊 VerusIDs processed: ${totalProcessed}`);
    console.log(`💰 Total UTXOs: ${totalUTXOs}`);
    console.log(`💎 Total value: ${(totalValue / 100000000).toFixed(2)} VRSC`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(
      `🏃 Average rate: ${(totalProcessed / totalSeconds).toFixed(1)} IDs/sec\n`
    );
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

populateAllUTXOs().catch(console.error);
