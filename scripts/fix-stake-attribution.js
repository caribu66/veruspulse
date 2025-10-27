#!/usr/bin/env node

/**
 * Fix Stake Attribution Script
 *
 * This script fixes the critical data integrity issue where all stakes
 * are incorrectly attributed to I-addresses instead of the actual R-addresses
 * that perform the staking.
 *
 * The issue: I-addresses cannot stake directly - only R-addresses can stake.
 * All stakes should be attributed to the R-address that actually performed
 * the staking, not the I-address.
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function rpcCall(method, params = []) {
  const response = await fetch('http://localhost:3001/api/rpc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, params }),
  });

  if (!response.ok) {
    throw new Error(`RPC call failed: ${response.statusText}`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(`RPC error: ${data.error.message}`);
  }

  return data.result;
}

async function getActualStakingAddress(txid, blockHeight) {
  try {
    // Get the transaction details
    const tx = await rpcCall('getrawtransaction', [txid, true]);

    if (!tx || !tx.vin || tx.vin.length === 0) {
      console.log(`⚠️  No inputs found for tx ${txid}`);
      return null;
    }

    // The staking address is typically in the first input
    // Look for the address that provided the stake
    for (const vin of tx.vin) {
      if (vin.txid && vin.vout !== undefined) {
        try {
          const prevTx = await rpcCall('getrawtransaction', [vin.txid, true]);
          if (prevTx && prevTx.vout && prevTx.vout[vin.vout]) {
            const prevVout = prevTx.vout[vin.vout];
            if (prevVout.scriptPubKey && prevVout.scriptPubKey.addresses) {
              const addresses = prevVout.scriptPubKey.addresses;
              // Look for R-addresses (starting with 'R')
              for (const addr of addresses) {
                if (addr.startsWith('R')) {
                  return addr;
                }
              }
              // If no R-address found, return the first address
              if (addresses.length > 0) {
                return addresses[0];
              }
            }
          }
        } catch (err) {
          console.log(
            `⚠️  Error getting previous tx ${vin.txid}: ${err.message}`
          );
          continue;
        }
      }
    }

    return null;
  } catch (err) {
    console.log(
      `⚠️  Error getting staking address for tx ${txid}: ${err.message}`
    );
    return null;
  }
}

async function fixStakeAttribution() {
  console.log('🔧 Starting stake attribution fix...\n');

  try {
    // Get all stakes that are incorrectly attributed to I-addresses
    const result = await pool.query(`
      SELECT 
        identity_address,
        txid,
        vout,
        block_height,
        amount_sats,
        COUNT(*) as stake_count
      FROM staking_rewards 
      WHERE source_address = identity_address 
        AND identity_address LIKE 'i%'
      GROUP BY identity_address, txid, vout, block_height, amount_sats
      ORDER BY identity_address, block_height DESC
      LIMIT 100
    `);

    console.log(`📊 Found ${result.rows.length} stake records to analyze\n`);

    let fixedCount = 0;
    let errorCount = 0;

    for (const row of result.rows) {
      console.log(`🔍 Processing stake: ${row.txid} (${row.identity_address})`);

      try {
        // Get the actual staking address
        const actualStakingAddress = await getActualStakingAddress(
          row.txid,
          row.block_height
        );

        if (actualStakingAddress) {
          console.log(`   ✓ Found staking address: ${actualStakingAddress}`);

          // Update the source_address in the database
          await pool.query(
            `
            UPDATE staking_rewards 
            SET source_address = $1 
            WHERE txid = $2 AND vout = $3 AND identity_address = $4
          `,
            [actualStakingAddress, row.txid, row.vout, row.identity_address]
          );

          fixedCount++;
          console.log(
            `   ✅ Updated source_address to ${actualStakingAddress}`
          );
        } else {
          console.log(`   ⚠️  Could not determine staking address`);
          errorCount++;
        }

        // Small delay to avoid overwhelming the RPC
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (err) {
        console.log(`   ❌ Error processing ${row.txid}: ${err.message}`);
        errorCount++;
      }

      console.log('');
    }

    console.log(`\n📈 Summary:`);
    console.log(`   ✅ Fixed: ${fixedCount} stakes`);
    console.log(`   ❌ Errors: ${errorCount} stakes`);
    console.log(`   📊 Total processed: ${result.rows.length} stakes`);
  } catch (err) {
    console.error(`❌ Fatal error: ${err.message}`);
  } finally {
    await pool.end();
  }
}

// Run the fix
if (require.main === module) {
  fixStakeAttribution().catch(console.error);
}

module.exports = { fixStakeAttribution };
