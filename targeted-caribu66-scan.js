#!/usr/bin/env node

const { Pool } = require('pg');
const { execSync } = require('child_process');

const pool = new Pool({
  connectionString:
    'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
  max: 1,
});

async function targetedCaribu66Scan() {
  try {
    console.log('🎯 Targeted scan for missing caribu66@ stakes...');

    const caribu66Address = 'iCDYc7VjEREzSBwj442MXrWLHLWJrDVdiB';

    // Scan a specific range where we know there are missing stakes
    // Based on our analysis, we need to scan from Feb 2023 to current
    const startBlock = 2416420; // Feb 2023
    const endBlock = 3783221; // Recent block

    let processedBlocks = 0;
    let foundStakes = 0;
    let addedStakes = 0;
    let totalFound = 0;

    console.log(
      `🔍 Scanning blocks ${startBlock} to ${endBlock} for caribu66@ stakes...`
    );
    console.log('Using FIXED logic that checks ALL addresses in the array');

    // Process in smaller batches to avoid overwhelming the system
    const batchSize = 10000;
    for (let start = startBlock; start <= endBlock; start += batchSize) {
      const end = Math.min(start + batchSize - 1, endBlock);

      console.log(`\n📦 Processing batch: blocks ${start} to ${end}...`);

      for (let blockHeight = start; blockHeight <= end; blockHeight++) {
        try {
          const blockData = execSync(
            `/home/explorer/verus-cli/verus getblock ${blockHeight} 2`,
            { encoding: 'utf8' }
          );
          const block = JSON.parse(blockData);

          processedBlocks++;

          // Check if it's a PoS block
          if (
            block.validationtype === 'stake' &&
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
                // FIXED LOGIC: Check all addresses in the array
                for (let i = 0; i < output.scriptPubKey.addresses.length; i++) {
                  const stakerAddress = output.scriptPubKey.addresses[i];

                  if (stakerAddress === caribu66Address) {
                    foundStakes++;

                    // Check if this stake already exists for caribu66@
                    const existingStake = await pool.query(
                      'SELECT * FROM staking_rewards WHERE block_height = $1 AND identity_address = $2',
                      [blockHeight, caribu66Address]
                    );

                    if (existingStake.rows.length === 0) {
                      // Check if it exists with wrong identity
                      const wrongStake = await pool.query(
                        'SELECT * FROM staking_rewards WHERE block_height = $1 AND txid = $2',
                        [blockHeight, coinstake.txid]
                      );

                      if (wrongStake.rows.length > 0) {
                        // Update the identity to caribu66@
                        await pool.query(
                          'UPDATE staking_rewards SET identity_address = $1, source_address = $1 WHERE block_height = $2 AND txid = $3',
                          [caribu66Address, blockHeight, coinstake.txid]
                        );
                        console.log(
                          `   ✅ Fixed block ${blockHeight}: ${output.value} VRSC`
                        );
                        addedStakes++;
                        totalFound += output.value;
                      } else {
                        // Add new stake for caribu66@
                        const rewardAmount = Math.round(
                          (output.value || 0) * 100000000
                        );

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
                            blockHeight,
                            new Date(block.time * 1000),
                            rewardAmount,
                            'stake_reward',
                            caribu66Address,
                          ]
                        );

                        console.log(
                          `   ✅ Added block ${blockHeight}: ${output.value} VRSC`
                        );
                        addedStakes++;
                        totalFound += output.value;
                      }
                    }
                  }
                }
              }
            }
          }
        } catch (error) {
          // Continue if block doesn't exist
        }
      }

      console.log(`   ✅ Batch complete: processed ${batchSize} blocks`);
    }

    console.log(`\n🎉 TARGETED SCAN COMPLETE!`);
    console.log(`   Processed blocks: ${processedBlocks.toLocaleString()}`);
    console.log(`   Found caribu66@ stakes: ${foundStakes}`);
    console.log(`   Added/fixed stakes: ${addedStakes}`);
    console.log(`   Total amount found: ${totalFound.toFixed(8)} VRSC`);

    // Check final totals
    const totalResult = await pool.query(
      'SELECT COUNT(*) as count, SUM(amount_sats) as total_sats FROM staking_rewards WHERE identity_address = $1',
      [caribu66Address]
    );

    const finalCount = parseInt(totalResult.rows[0].count);
    const finalAmount = parseInt(totalResult.rows[0].total_sats) / 100000000;

    console.log(`\n📊 FINAL TOTALS:`);
    console.log(`   Stakes: ${finalCount.toLocaleString()}`);
    console.log(`   Amount: ${finalAmount.toFixed(8)} VRSC`);

    // Compare with CSV
    const csvAmount = 8729.27650198;
    const difference = csvAmount - finalAmount;
    const percentageDiff = (difference / csvAmount) * 100;

    console.log(`\n🔍 COMPARISON WITH CSV:`);
    console.log(`   CSV Mint: ${csvAmount.toFixed(8)} VRSC`);
    console.log(`   Database: ${finalAmount.toFixed(8)} VRSC`);
    console.log(
      `   Difference: ${difference.toFixed(8)} VRSC (${percentageDiff.toFixed(2)}%)`
    );

    if (Math.abs(difference) < 50) {
      console.log(`\n✅ EXCELLENT MATCH! Very close to CSV amount.`);
    } else if (Math.abs(difference) < 200) {
      console.log(`\n✅ GOOD MATCH! Close to CSV amount.`);
    } else {
      console.log(`\n⚠️  Still some difference remaining.`);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

targetedCaribu66Scan();
