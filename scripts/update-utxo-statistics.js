#!/usr/bin/env node
/**
 * update-utxo-statistics.js
 * Fetches current UTXO data for all VerusIDs and updates statistics
 */

const { Pool } = require('pg');

console.log('╔═══════════════════════════════════════════════╗');
console.log('║   VerusID UTXO Statistics Updater            ║');
console.log('╚═══════════════════════════════════════════════╝\n');

// Configuration
const dbConfig = {
  connectionString: process.env.DATABASE_URL || 'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
  max: 10,
};

const db = new Pool(dbConfig);

// Constants
const MIN_CONFIRMATIONS_FOR_STAKING = 150; // Minimum confirmations required to stake
const COOLDOWN_BLOCKS = 150; // Blocks an UTXO must wait after staking

let stats = {
  totalProcessed: 0,
  successfulUpdates: 0,
  errors: 0,
  totalUTXOs: 0,
  totalEligible: 0,
  startTime: Date.now(),
};

// RPC helper
async function rpcCall(method, params = []) {
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);
  
  const rpcUser = process.env.VERUS_RPC_USER || 'verus';
  const rpcPass = process.env.VERUS_RPC_PASSWORD || 'verus';
  const rpcHost = process.env.VERUS_RPC_HOST || '127.0.0.1';
  const rpcPort = process.env.VERUS_RPC_PORT || '18843';
  
  const rpcData = JSON.stringify({
    jsonrpc: '1.0',
    id: 'utxo-updater',
    method,
    params,
  });
  
  const escapedData = rpcData.replace(/'/g, "'\\''");
  const cmd = `curl -s --user ${rpcUser}:${rpcPass} --data-binary '${escapedData}' -H 'content-type: text/plain;' http://${rpcHost}:${rpcPort}/`;
  
  try {
    const { stdout } = await execAsync(cmd, { maxBuffer: 10 * 1024 * 1024 });
    const result = JSON.parse(stdout);
    if (result.error) {
      throw new Error(result.error.message || JSON.stringify(result.error));
    }
    return result.result;
  } catch (error) {
    throw new Error(`RPC call failed: ${error.message}`);
  }
}

// Get all VerusID addresses that have statistics
async function getAllVerusIDsWithStats() {
  const result = await db.query(`
    SELECT address, friendly_name
    FROM verusid_statistics
    ORDER BY address
  `);
  return result.rows;
}

// Fetch UTXO data for an address
async function getUTXOData(address, currentHeight) {
  try {
    // Get UTXOs for this address
    const utxos = await rpcCall('getaddressutxos', [{ addresses: [address] }]);
    
    if (!utxos || !Array.isArray(utxos)) {
      return {
        total: 0,
        eligible: 0,
        cooldown: 0,
        totalValue: 0,
        eligibleValue: 0,
        largest: 0,
        smallestEligible: 0,
      };
    }

    let total = utxos.length;
    let eligible = 0;
    let cooldown = 0;
    let totalValue = 0;
    let eligibleValue = 0;
    let largest = 0;
    let smallestEligible = null;

    for (const utxo of utxos) {
      const value = utxo.satoshis || 0;
      const confirmations = utxo.height ? currentHeight - utxo.height : 0;
      
      totalValue += value;
      
      if (value > largest) {
        largest = value;
      }

      // Check if eligible for staking (enough confirmations)
      if (confirmations >= MIN_CONFIRMATIONS_FOR_STAKING) {
        eligible++;
        eligibleValue += value;
        
        if (smallestEligible === null || value < smallestEligible) {
          smallestEligible = value;
        }
      } else if (confirmations < COOLDOWN_BLOCKS) {
        // In cooldown period (recently created or staked)
        cooldown++;
      }
    }

    return {
      total,
      eligible,
      cooldown,
      totalValue,
      eligibleValue,
      largest,
      smallestEligible: smallestEligible || 0,
    };
  } catch (error) {
    console.error(`  ❌ Error fetching UTXOs for ${address}: ${error.message}`);
    throw error;
  }
}

// Update UTXO statistics in database
async function updateUTXOStats(address, utxoData) {
  try {
    await db.query(`
      UPDATE verusid_statistics
      SET 
        current_utxos = $1,
        eligible_utxos = $2,
        cooldown_utxos = $3,
        total_value_satoshis = $4,
        eligible_value_satoshis = $5,
        largest_utxo_satoshis = $6,
        smallest_eligible_satoshis = $7,
        updated_at = NOW()
      WHERE address = $8
    `, [
      utxoData.total,
      utxoData.eligible,
      utxoData.cooldown,
      utxoData.totalValue,
      utxoData.eligibleValue,
      utxoData.largest,
      utxoData.smallestEligible,
      address
    ]);
  } catch (error) {
    throw new Error(`Database update failed: ${error.message}`);
  }
}

// Process a single VerusID
async function processVerusID(verusID, currentHeight, index, total) {
  try {
    const progress = ((index + 1) / total * 100).toFixed(1);
    process.stdout.write(`\r[${progress}%] Processing ${verusID.friendly_name || verusID.address}...`);
    
    const utxoData = await getUTXOData(verusID.address, currentHeight);
    await updateUTXOStats(verusID.address, utxoData);
    
    stats.successfulUpdates++;
    stats.totalUTXOs += utxoData.total;
    stats.totalEligible += utxoData.eligible;
    
    // Show details for addresses with UTXOs
    if (utxoData.total > 0) {
      console.log(`\r✓ ${verusID.friendly_name || verusID.address}: ${utxoData.total} UTXOs (${utxoData.eligible} eligible, ${utxoData.cooldown} cooldown) = ${(utxoData.totalValue / 100000000).toFixed(2)} VRSC`);
    }
    
  } catch (error) {
    console.log(`\r❌ ${verusID.friendly_name || verusID.address}: ${error.message}`);
    stats.errors++;
  } finally {
    stats.totalProcessed++;
  }
}

// Main function
async function main() {
  try {
    // Get current blockchain height
    console.log('Getting current blockchain height...');
    const currentHeight = await rpcCall('getblockcount');
    console.log(`✓ Current height: ${currentHeight.toLocaleString()}\n`);
    
    // Get all VerusIDs with statistics
    console.log('Loading VerusIDs from database...');
    const verusIDs = await getAllVerusIDsWithStats();
    console.log(`✓ Found ${verusIDs.length} VerusIDs with statistics\n`);
    
    if (verusIDs.length === 0) {
      console.log('⚠️  No VerusIDs found in statistics table!');
      console.log('   Run the statistics calculation script first.\n');
      process.exit(1);
    }
    
    console.log('Starting UTXO data collection...\n');
    stats.startTime = Date.now();
    
    // Process each VerusID
    for (let i = 0; i < verusIDs.length; i++) {
      await processVerusID(verusIDs[i], currentHeight, i, verusIDs.length);
      
      // Small delay to avoid overwhelming the RPC
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Final stats
    console.log('\n\n╔═══════════════════════════════════════════════╗');
    console.log('║          UTXO UPDATE COMPLETE!                ║');
    console.log('╚═══════════════════════════════════════════════╝');
    
    const totalTime = (Date.now() - stats.startTime) / 1000;
    
    console.log(`\n📊 Summary:`);
    console.log(`   VerusIDs processed: ${stats.totalProcessed}`);
    console.log(`   Successful updates: ${stats.successfulUpdates}`);
    console.log(`   Errors: ${stats.errors}`);
    console.log(`   Total UTXOs found: ${stats.totalUTXOs.toLocaleString()}`);
    console.log(`   Eligible for staking: ${stats.totalEligible.toLocaleString()}`);
    console.log(`   Time taken: ${totalTime.toFixed(1)} seconds`);
    console.log(`   Rate: ${(stats.totalProcessed / totalTime).toFixed(1)} addresses/sec\n`);
    
    console.log('✅ UTXO statistics updated successfully!');
    console.log('   The dashboard should now display UTXO health data.\n');
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await db.end();
  }
}

main().catch(console.error);

