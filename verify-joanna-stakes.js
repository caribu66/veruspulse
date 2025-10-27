#!/usr/bin/env node

/**
 * Verify Joanna's Stakes - Check for calculation errors
 * Investigates the stake amount calculation for Joanna's rewards
 */

const { Pool } = require('pg');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const VERUS_CLI_PATH = '/home/explorer/verus-cli/verus';

const pool = new Pool({
  connectionString:
    'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
});

async function verifyJoannaStakes() {
  console.log("🔍 VERIFYING JOANNA'S STAKES - CHECKING FOR CALCULATION ERRORS");
  console.log(
    '================================================================\n'
  );

  try {
    const joannaAddress = 'iPZkWmFAhQSFsgKiLExowaoXvzaor2bBZ5';

    // Get Joanna's stake data
    const stakesResult = await pool.query(
      `
      SELECT 
        block_height,
        block_time,
        amount_sats,
        txid,
        vout
      FROM staking_rewards 
      WHERE identity_address = $1
      ORDER BY block_height DESC 
      LIMIT 10
    `,
      [joannaAddress]
    );

    console.log(`📊 Analyzing Joanna's recent stakes (${joannaAddress}):`);
    console.log('=====================================================');

    let totalFromDB = 0;
    let totalFromBlockchain = 0;

    for (const stake of stakesResult.rows) {
      const dbAmountVRSC = (stake.amount_sats / 100000000).toFixed(8);
      totalFromDB += stake.amount_sats;

      console.log(`\n🔍 Block ${stake.block_height} (${stake.block_time}):`);
      console.log(`   Database amount: ${dbAmountVRSC} VRSC`);
      console.log(`   TXID: ${stake.txid}`);

      try {
        // Get the actual block data from blockchain
        const { stdout: blockHash } = await execPromise(
          `${VERUS_CLI_PATH} getblockhash ${stake.block_height}`
        );
        const { stdout: blockData } = await execPromise(
          `${VERUS_CLI_PATH} getblock ${blockHash.trim()} 2`
        );
        const block = JSON.parse(blockData);

        if (block.tx && block.tx.length > 0) {
          const coinstake = block.tx[0];

          if (coinstake.vout && coinstake.vout.length > 0) {
            // Show all outputs
            console.log(`   📋 Blockchain outputs:`);
            coinstake.vout.forEach((vout, index) => {
              const voutVRSC = ((vout.value * 100000000) / 100000000).toFixed(
                8
              );
              const address = vout.scriptPubKey?.addresses?.[0] || 'Unknown';
              console.log(
                `      Output ${index}: ${voutVRSC} VRSC to ${address}`
              );
            });

            // Check if Joanna's address is in the outputs
            const joannaOutput = coinstake.vout.find(vout =>
              vout.scriptPubKey?.addresses?.includes(joannaAddress)
            );

            if (joannaOutput) {
              const actualAmount = Math.round(joannaOutput.value * 100000000);
              const actualAmountVRSC = (actualAmount / 100000000).toFixed(8);
              totalFromBlockchain += actualAmount;

              console.log(
                `   ✅ Joanna's actual stake: ${actualAmountVRSC} VRSC`
              );

              if (Math.abs(stake.amount_sats - actualAmount) < 1000) {
                console.log(`   ✅ Database amount matches blockchain`);
              } else {
                console.log(
                  `   ❌ MISMATCH: DB=${dbAmountVRSC} VRSC vs Blockchain=${actualAmountVRSC} VRSC`
                );
              }
            } else {
              console.log(
                `   ⚠️ Joanna's address not found in outputs - this might be an error`
              );
            }
          }
        }
      } catch (error) {
        console.log(
          `   ❌ Error verifying against blockchain: ${error.message}`
        );
      }
    }

    // Get total from database
    const totalResult = await pool.query(
      `
      SELECT SUM(amount_sats) as total_amount_sats
      FROM staking_rewards 
      WHERE identity_address = $1
    `,
      [joannaAddress]
    );

    const dbTotal = totalResult.rows[0].total_amount_sats;
    const dbTotalVRSC = (dbTotal / 100000000).toFixed(2);

    console.log('\n📊 SUMMARY:');
    console.log('============');
    console.log(`Total from database: ${dbTotalVRSC} VRSC`);
    console.log(
      `Total from recent blockchain verification: ${(totalFromBlockchain / 100000000).toFixed(2)} VRSC`
    );

    if (Math.abs(dbTotal - totalFromBlockchain) > 1000000) {
      // More than 0.01 VRSC difference
      console.log('❌ SIGNIFICANT DISCREPANCY FOUND!');
      console.log(
        '💡 The database amounts appear to be incorrect due to the calculation bug we found earlier.'
      );
      console.log('💡 The actual stake amounts should be much smaller.');
    } else {
      console.log('✅ Amounts appear to be correct');
    }
  } catch (error) {
    console.error("❌ Error verifying Joanna's stakes:", error.message);
  } finally {
    await pool.end();
  }
}

verifyJoannaStakes();
