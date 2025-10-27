#!/usr/bin/env node

const { Pool } = require('pg');
const { execSync } = require('child_process');

const pool = new Pool({
  connectionString:
    'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
  max: 1,
});

async function fixMissingCaribu66Stakes() {
  try {
    console.log('🔍 Fixing missing caribu66@ stakes...');

    const caribu66Address = 'iCDYc7VjEREzSBwj442MXrWLHLWJrDVdiB';

    // Check blocks around 3783221
    const blocksToCheck = [
      3783221, 3783220, 3783219, 3783218, 3783217, 3783216, 3783215,
    ];

    for (const blockHeight of blocksToCheck) {
      try {
        console.log(`\nChecking block ${blockHeight}...`);

        const blockData = execSync(
          `/home/explorer/verus-cli/verus getblock ${blockHeight} 2`,
          { encoding: 'utf8' }
        );
        const block = JSON.parse(blockData);

        if (
          block.validationtype === 'stake' &&
          block.posrewarddest &&
          block.tx &&
          block.tx.length > 0
        ) {
          const coinstake = block.tx[0];

          if (coinstake.vout && coinstake.vout.length > 0) {
            const output = coinstake.vout[0];

            if (
              output.scriptPubKey?.addresses &&
              output.scriptPubKey.addresses.length > 0
            ) {
              // Check all addresses in the array
              for (let i = 0; i < output.scriptPubKey.addresses.length; i++) {
                const stakerAddress = output.scriptPubKey.addresses[i];

                if (stakerAddress === caribu66Address) {
                  console.log(
                    `   ✅ Found caribu66@ stake in block ${blockHeight}!`
                  );

                  // Check if it's already in database
                  const existingStake = await pool.query(
                    'SELECT * FROM staking_rewards WHERE block_height = $1 AND identity_address = $2',
                    [blockHeight, caribu66Address]
                  );

                  if (existingStake.rows.length === 0) {
                    console.log(`   📝 Adding missing stake to database...`);

                    // Add identity if not exists
                    await pool.query(
                      `
                      INSERT INTO identities (identity_address, base_name, friendly_name)
                      VALUES ($1, $2, $3)
                      ON CONFLICT (identity_address) DO NOTHING
                    `,
                      [caribu66Address, 'caribu66', 'caribu66.VRSC@']
                    );

                    // Add stake
                    const rewardAmount = Math.round(
                      (output.value || 0) * 100000000
                    );
                    await pool.query(
                      `
                      INSERT INTO staking_rewards (
                        identity_address, txid, vout, block_height, block_time,
                        amount_sats, classifier, source_address
                      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                      ON CONFLICT (txid, vout) DO NOTHING
                    `,
                      [
                        caribu66Address,
                        coinstake.txid,
                        0,
                        blockHeight,
                        new Date(block.time * 1000),
                        rewardAmount,
                        'stake_reward',
                        caribu66Address,
                      ]
                    );

                    console.log(
                      `   ✅ Added stake: ${output.value} VRSC at ${new Date(block.time * 1000).toUTCString()}`
                    );
                  } else {
                    console.log(`   ℹ️  Stake already exists in database`);
                  }
                }
              }
            }
          }
        }
      } catch (error) {
        console.log(
          `   ⚠️  Error checking block ${blockHeight}: ${error.message}`
        );
      }
    }

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
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

fixMissingCaribu66Stakes();
