#!/usr/bin/env node

const { Pool } = require('pg');
const { execSync } = require('child_process');

const pool = new Pool({
  connectionString:
    'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
  max: 1,
});

async function scanRecentBlocksOnly() {
  try {
    console.log(
      '🔍 Scanning recent blocks with fixed logic to catch missing stakes...'
    );

    const caribu66Address = 'iCDYc7VjEREzSBwj442MXrWLHLWJrDVdiB';

    // Get the last scanned block from database
    const lastBlockResult = await pool.query(
      'SELECT MAX(block_height) as last_height FROM staking_rewards WHERE identity_address = $1',
      [caribu66Address]
    );
    const lastScannedBlock = lastBlockResult.rows[0].last_height || 2416419;

    console.log(`Last scanned block for caribu66@: ${lastScannedBlock}`);

    // Get current blockchain height
    const currentHeight = parseInt(
      execSync('/home/explorer/verus-cli/verus getblockcount', {
        encoding: 'utf8',
      }).trim()
    );
    console.log(`Current blockchain height: ${currentHeight}`);

    // Scan from last scanned block to current (this should be a smaller range)
    let foundStakes = 0;
    let addedStakes = 0;
    let totalFound = 0;

    console.log(
      `\n🔍 Scanning blocks ${lastScannedBlock + 1} to ${currentHeight}...`
    );

    for (
      let blockHeight = lastScannedBlock + 1;
      blockHeight <= currentHeight;
      blockHeight++
    ) {
      try {
        const blockData = execSync(
          `/home/explorer/verus-cli/verus getblock ${blockHeight} 2`,
          { encoding: 'utf8' }
        );
        const block = JSON.parse(blockData);

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
              // Check all addresses in the array (fixed logic)
              for (let i = 0; i < output.scriptPubKey.addresses.length; i++) {
                const stakerAddress = output.scriptPubKey.addresses[i];

                if (stakerAddress === caribu66Address) {
                  foundStakes++;

                  // Check if this stake already exists
                  const existingStake = await pool.query(
                    'SELECT * FROM staking_rewards WHERE block_height = $1 AND identity_address = $1',
                    [blockHeight, caribu66Address]
                  );

                  if (existingStake.rows.length === 0) {
                    // Check if it exists with wrong identity
                    const wrongStake = await pool.query(
                      'SELECT * FROM staking_rewards WHERE block_height = $1 AND txid = $2',
                      [blockHeight, coinstake.txid]
                    );

                    if (wrongStake.rows.length > 0) {
                      // Update the identity
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
                      // Add new stake
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

      if (blockHeight % 1000 === 0) {
        console.log(`   Processed up to block ${blockHeight}...`);
      }
    }

    console.log(`\n🎉 RECENT BLOCKS SCAN COMPLETE!`);
    console.log(`   Found caribu66@ stakes: ${foundStakes}`);
    console.log(`   Added/fixed stakes: ${addedStakes}`);
    console.log(`   Total amount found: ${totalFound.toFixed(8)} VRSC`);

    // Check updated totals
    const totalResult = await pool.query(
      'SELECT COUNT(*) as count, SUM(amount_sats) as total_sats FROM staking_rewards WHERE identity_address = $1',
      [caribu66Address]
    );

    const finalCount = parseInt(totalResult.rows[0].count);
    const finalAmount = parseInt(totalResult.rows[0].total_sats) / 100000000;

    console.log(`\n📊 UPDATED TOTALS:`);
    console.log(`   Stakes: ${finalCount.toLocaleString()}`);
    console.log(`   Amount: ${finalAmount.toFixed(8)} VRSC`);

    // Compare with CSV
    const csvAmount = 8729.27650198;
    const difference = csvAmount - finalAmount;

    console.log(`\n🔍 COMPARISON WITH CSV:`);
    console.log(`   CSV Mint: ${csvAmount.toFixed(8)} VRSC`);
    console.log(`   Database: ${finalAmount.toFixed(8)} VRSC`);
    console.log(`   Difference: ${difference.toFixed(8)} VRSC`);

    if (Math.abs(difference) < 50) {
      console.log(`\n✅ EXCELLENT MATCH! Very close to CSV amount.`);
    } else {
      console.log(`\n⚠️  Still some difference remaining.`);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

scanRecentBlocksOnly();
