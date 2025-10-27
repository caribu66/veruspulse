#!/usr/bin/env node

/**
 * Direct staking data extension using the WORKING logic
 * This uses the same logic that already found your 35,037 stakes
 */

const { execSync } = require('child_process');
const { Pool } = require('pg');

// Database connection
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function extendStakingData() {
  console.log('🚀 Extending staking data from Feb 2023 to current tip...\n');

  try {
    // Get current blockchain height
    const currentHeight = parseInt(
      execSync('/home/explorer/verus-cli/verus getblockcount', {
        encoding: 'utf8',
      }).trim()
    );
    console.log(`📊 Current blockchain height: ${currentHeight}`);

    // Start from block 2,416,420 (Feb 2023)
    const startHeight = 2416420;
    const endHeight = currentHeight;

    console.log(`🎯 Scanning from block ${startHeight} to ${endHeight}`);
    console.log(`📊 Total blocks to scan: ${endHeight - startHeight}\n`);

    let stakesFound = 0;
    let blocksProcessed = 0;

    // Process blocks in batches
    const batchSize = 100;
    for (let height = startHeight; height <= endHeight; height += batchSize) {
      const batchEnd = Math.min(height + batchSize - 1, endHeight);

      console.log(`🔍 Processing blocks ${height} to ${batchEnd}...`);

      // Process each block in the batch
      for (let blockHeight = height; blockHeight <= batchEnd; blockHeight++) {
        try {
          // Get block data
          const blockData = execSync(
            `/home/explorer/verus-cli/verus getblock ${blockHeight} 2`,
            { encoding: 'utf8' }
          );
          const block = JSON.parse(blockData);

          // Check if it's a PoS block
          if (block.blocktype === 'minted' && block.tx && block.tx.length > 0) {
            const coinstake = block.tx[0];

            if (coinstake.vout && coinstake.vout.length > 0) {
              // Get staker address from first output
              const output = coinstake.vout[0];

              if (
                output.scriptPubKey?.addresses &&
                output.scriptPubKey.addresses.length > 0
              ) {
                const stakerAddress = output.scriptPubKey.addresses[0];

                // Calculate reward amount
                const totalOutput = coinstake.vout.reduce((sum, vout) => {
                  return sum + (vout.value || 0) * 100000000; // Convert to satoshis
                }, 0);

                // Insert into staking_rewards table (the WORKING table)
                const insertQuery = `
                                    INSERT INTO staking_rewards (
                                        identity_address, txid, block_height, block_time,
                                        amount_sats, stake_amount, stake_age
                                    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                                    ON CONFLICT (txid) DO NOTHING
                                `;

                await db.query(insertQuery, [
                  stakerAddress,
                  coinstake.txid,
                  blockHeight,
                  new Date(block.time * 1000),
                  totalOutput,
                  0, // stake_amount not available in block data
                  0, // stake_age not available in block data
                ]);

                stakesFound++;
                console.log(
                  `   ✅ Found stake: Block ${blockHeight}, Address: ${stakerAddress}, Reward: ${totalOutput / 100000000} VRSC`
                );
              }
            }
          }

          blocksProcessed++;

          // Progress update every 1000 blocks
          if (blocksProcessed % 1000 === 0) {
            const progress = (
              (blocksProcessed / (endHeight - startHeight + 1)) *
              100
            ).toFixed(1);
            console.log(
              `📊 Progress: ${blocksProcessed} blocks processed, ${stakesFound} stakes found (${progress}%)`
            );
          }
        } catch (error) {
          console.log(
            `   ⚠️  Error processing block ${blockHeight}: ${error.message}`
          );
          // Continue with next block
        }
      }

      // Small delay between batches to avoid overwhelming the RPC
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\n🎉 Scan complete!`);
    console.log(`📊 Total blocks processed: ${blocksProcessed}`);
    console.log(`🎯 Total stakes found: ${stakesFound}`);
    console.log(
      `💡 Staking data now extends from December 2020 to current tip!`
    );
  } catch (error) {
    console.error('❌ Error during scan:', error);
  } finally {
    await db.end();
  }
}

extendStakingData().catch(console.error);
