import { VerusIDDatabaseService } from '../lib/services/verusid-database.js';
import { UTXODatabaseService } from '../lib/services/utxo-database.js';
import { VerusAPIClient } from '../lib/rpc-client-robust.js';
import { getRpcConfig } from '../lib/utils/rpc-config.js';

/**
 * Populate UTXO database with accurate data from the Verus daemon
 * This script:
 * 1. Gets all known VerusIDs from the database
 * 2. For each VerusID, calls getaddressutxos to get current UTXOs
 * 3. Stores them in the database with proper metadata
 * 4. Marks old UTXOs as spent if they no longer exist
 */

async function populateUTXOsFromDaemon() {
  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║  Populating UTXO Database from Verus Daemon       ║');
  console.log('╚════════════════════════════════════════════════════╝\n');

  const rpcConfig = getRpcConfig();
  const verusApiClient = new VerusAPIClient(rpcConfig);
  const verusIdDb = new VerusIDDatabaseService(process.env.DATABASE_URL);
  const utxoDb = new UTXODatabaseService(process.env.DATABASE_URL);

  try {
    // Get current blockchain height
    console.log('🔍 Getting current blockchain height...');
    const blockchainInfo = await verusApiClient.getBlockchainInfo();
    const currentHeight = blockchainInfo.blocks;
    console.log(`✅ Current height: ${currentHeight}\n`);

    // Get all known VerusIDs
    console.log('📋 Fetching all known VerusIDs...');
    const allIdentities = await verusIdDb.getAllIdentities();
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
        const daemonUtxos = await verusApiClient.getAddressUTXOs(iaddr);

        if (!daemonUtxos || !Array.isArray(daemonUtxos)) {
          console.log(`   ⚠️  No UTXOs found for ${name}`);
          totalProcessed++;
          continue;
        }

        // First, mark all existing UTXOs for this address as spent
        // We'll update the ones that still exist
        await utxoDb.markAllUTXOsAsSpent(iaddr);

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

          // Prepare UTXO object
          const utxoData = {
            address: iaddr,
            txid,
            vout,
            value,
            creation_height: height,
            creation_time: blocktime ? new Date(blocktime * 1000) : null,
            is_spent: false,
            is_eligible: isEligible,
            staking_probability: 0, // Will be calculated separately
            estimated_reward: 0, // Will be calculated separately
          };

          // Upsert UTXO
          await utxoDb.upsertUTXO(utxoData);

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
  }
}

populateUTXOsFromDaemon().catch(console.error);
