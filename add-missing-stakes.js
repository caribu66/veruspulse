#!/usr/bin/env node

const { Pool } = require('pg');
const { execSync } = require('child_process');

const pool = new Pool({
  connectionString:
    'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
  max: 1,
});

async function addMissingStakes() {
  try {
    console.log('🔍 Adding the 4 missing caribu66@ stakes we found...');

    const caribu66Address = 'iCDYc7VjEREzSBwj442MXrWLHLWJrDVdiB';

    // The 4 missing stakes we found
    const missingStakes = [
      { block: 3458720, amount: 3.04620818, time: '2025-03-05T06:38:19.000Z' },
      { block: 3642120, amount: 3.06867406, time: '2025-07-14T16:53:05.000Z' },
      { block: 3664020, amount: 3.05331705, time: '2025-07-30T09:21:35.000Z' },
      { block: 3705220, amount: 3.03742997, time: '2025-08-28T21:29:15.000Z' },
    ];

    let addedCount = 0;
    let addedAmount = 0;

    for (const stake of missingStakes) {
      try {
        console.log(`\nProcessing block ${stake.block}...`);

        // Get block data to get the txid
        const blockData = execSync(
          `/home/explorer/verus-cli/verus getblock ${stake.block} 2`,
          { encoding: 'utf8' }
        );
        const block = JSON.parse(blockData);

        if (
          block.validationtype === 'stake' &&
          block.tx &&
          block.tx.length > 0
        ) {
          const coinstake = block.tx[0];

          // Check if stake already exists
          const existingStake = await pool.query(
            'SELECT * FROM staking_rewards WHERE block_height = $1 AND identity_address = $2',
            [stake.block, caribu66Address]
          );

          if (existingStake.rows.length === 0) {
            // Add the missing stake
            const rewardAmount = Math.round(stake.amount * 100000000);

            await pool.query(
              `
              INSERT INTO staking_rewards (
                identity_address, txid, vout, block_height, block_time,
                amount_sats, classifier, source_address
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `,
              [
                caribu66Address,
                coinstake.txid,
                0,
                stake.block,
                new Date(stake.time),
                rewardAmount,
                'stake_reward',
                caribu66Address,
              ]
            );

            console.log(`   ✅ Added stake: ${stake.amount} VRSC`);
            addedCount++;
            addedAmount += stake.amount;
          } else {
            console.log(`   ℹ️  Stake already exists`);
          }
        }
      } catch (error) {
        console.log(
          `   ❌ Error processing block ${stake.block}: ${error.message}`
        );
      }
    }

    console.log(
      `\n📊 Added ${addedCount} stakes totaling ${addedAmount.toFixed(8)} VRSC`
    );

    // Check updated totals
    const totalResult = await pool.query(
      'SELECT COUNT(*) as count, SUM(amount_sats) as total_sats, MAX(block_time) as last_stake FROM staking_rewards WHERE identity_address = $1',
      [caribu66Address]
    );

    const { count, total_sats, last_stake } = totalResult.rows[0];

    console.log('\n📊 Updated caribu66@ totals:');
    console.log(`   Total stakes: ${parseInt(count).toLocaleString()}`);
    console.log(
      `   Total amount: ${(parseInt(total_sats) / 100000000).toFixed(8)} VRSC`
    );
    console.log(
      `   Last stake: ${last_stake ? last_stake.toUTCString() : 'N/A'}`
    );

    // Compare with CSV
    const csvAmount = 8729.27650198;
    const dbAmount = parseInt(total_sats) / 100000000;
    const difference = csvAmount - dbAmount;

    console.log('\n🔍 COMPARISON WITH CSV:');
    console.log(`   CSV Mint: ${csvAmount.toFixed(8)} VRSC`);
    console.log(`   Database: ${dbAmount.toFixed(8)} VRSC`);
    console.log(`   Difference: ${difference.toFixed(8)} VRSC`);
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

addMissingStakes();
