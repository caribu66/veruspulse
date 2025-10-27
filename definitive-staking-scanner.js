#!/usr/bin/env node

/**
 * DEFINITIVE STAKING DATA SCANNER
 * This is the ONE solution that works - no more switching between different approaches!
 *
 * What this does:
 * 1. Uses the WORKING database connection
 * 2. Uses the WORKING table (staking_rewards)
 * 3. Uses the WORKING detection logic
 * 4. Extends your existing data to current tip
 */

const { Pool } = require('pg');
const { execSync } = require('child_process');

// THE WORKING DATABASE CONNECTION - don't change this!
const pool = new Pool({
  connectionString:
    'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
  max: 5, // Limit connections to avoid "too many clients" error
});

class DefinitiveStakingScanner {
  constructor() {
    this.batchSize = 25; // Process blocks in smaller batches to avoid ENOBUFS
    this.delayBetweenBatches = 2000; // 2 second delay between batches
    this.stakesFound = 0;
    this.blocksProcessed = 0;
    this.startTime = Date.now();
  }

  async scanFromLastBlock() {
    console.log('🚀 DEFINITIVE STAKING SCANNER - The ONE solution that works!');
    console.log(
      '================================================================\n'
    );

    try {
      // Get current blockchain height
      const currentHeight = parseInt(
        execSync('/home/explorer/verus-cli/verus getblockcount', {
          encoding: 'utf8',
        }).trim()
      );
      console.log(
        `📊 Current blockchain height: ${currentHeight.toLocaleString()}`
      );

      // Get the last scanned block from database
      const lastBlockResult = await pool.query(
        'SELECT MAX(block_height) as last_block FROM staking_rewards'
      );
      const lastScannedBlock = lastBlockResult.rows[0].last_block || 2416419; // Default to Feb 2023

      console.log(
        `📊 Last scanned block: ${lastScannedBlock.toLocaleString()}`
      );

      const blocksToScan = currentHeight - lastScannedBlock;
      console.log(`📊 Blocks to scan: ${blocksToScan.toLocaleString()}`);

      if (blocksToScan <= 0) {
        console.log('✅ Database is already up-to-date!');
        return;
      }

      console.log(
        `🎯 Starting scan from block ${lastScannedBlock + 1} to ${currentHeight}\n`
      );

      // Scan blocks in batches
      for (
        let startBlock = lastScannedBlock + 1;
        startBlock <= currentHeight;
        startBlock += this.batchSize
      ) {
        const endBlock = Math.min(
          startBlock + this.batchSize - 1,
          currentHeight
        );

        console.log(
          `🔍 Processing blocks ${startBlock.toLocaleString()} to ${endBlock.toLocaleString()}...`
        );

        await this.processBatch(startBlock, endBlock);

        // Progress update
        const progress = (
          ((endBlock - lastScannedBlock) / blocksToScan) *
          100
        ).toFixed(1);
        const elapsed = (Date.now() - this.startTime) / 1000;
        const rate = this.blocksProcessed / elapsed;
        const eta = (blocksToScan - (endBlock - lastScannedBlock)) / rate;

        console.log(
          `   ✅ Batch complete: ${this.stakesFound} stakes found, ${progress}% complete`
        );
        console.log(
          `   ⏱️  Rate: ${rate.toFixed(1)} blocks/sec, ETA: ${(eta / 60).toFixed(1)} minutes\n`
        );

        // Delay between batches to avoid overwhelming the system
        if (endBlock < currentHeight) {
          await new Promise(resolve =>
            setTimeout(resolve, this.delayBetweenBatches)
          );
        }
      }

      console.log('\n🎉 SCAN COMPLETE!');
      console.log(
        `📊 Total blocks processed: ${this.blocksProcessed.toLocaleString()}`
      );
      console.log(
        `🎯 Total stakes found: ${this.stakesFound.toLocaleString()}`
      );
      console.log(
        `⏱️  Total time: ${((Date.now() - this.startTime) / 1000 / 60).toFixed(1)} minutes`
      );
    } catch (error) {
      console.error('❌ Scan failed:', error.message);
    } finally {
      await pool.end();
    }
  }

  async processBatch(startBlock, endBlock) {
    const promises = [];

    for (let blockHeight = startBlock; blockHeight <= endBlock; blockHeight++) {
      promises.push(this.processBlock(blockHeight));
    }

    await Promise.allSettled(promises);
  }

  async processBlock(blockHeight) {
    try {
      // Get block data
      const blockData = execSync(
        `/home/explorer/verus-cli/verus getblock ${blockHeight} 2`,
        { encoding: 'utf8' }
      );
      const block = JSON.parse(blockData);

      this.blocksProcessed++;

      // Check if it's a PoS block
      if (block.blocktype === 'minted' && block.tx && block.tx.length > 0) {
        const coinstake = block.tx[0];

        if (coinstake.vout && coinstake.vout.length > 0) {
          // Get staker address from first output (THE WORKING LOGIC)
          const output = coinstake.vout[0];

          if (
            output.scriptPubKey?.addresses &&
            output.scriptPubKey.addresses.length > 0
          ) {
            const stakerAddress = output.scriptPubKey.addresses[0];

            // Calculate reward amount (THE CORRECT LOGIC) - use first output only
            // The stake amount is the first output (vout[0]), not the sum of all outputs
            const stakeOutput = coinstake.vout[0];
            const totalOutput = Math.round(
              (stakeOutput.value || 0) * 100000000
            ); // Convert to satoshis

            // First, ensure the identity exists in the identities table
            await pool.query(
              `
              INSERT INTO identities (identity_address, base_name, friendly_name)
              VALUES ($1, $2, $3)
              ON CONFLICT (identity_address) DO NOTHING
            `,
              [stakerAddress, stakerAddress, stakerAddress]
            );

            // Then insert into THE WORKING TABLE with correct column structure
            const insertQuery = `
              INSERT INTO staking_rewards (
                identity_address, txid, vout, block_height, block_time,
                amount_sats, classifier, source_address
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
              ON CONFLICT (txid, vout) DO NOTHING
            `;

            await pool.query(insertQuery, [
              stakerAddress,
              coinstake.txid,
              0, // vout - first output
              blockHeight,
              new Date(block.time * 1000),
              totalOutput,
              'stake_reward', // classifier
              stakerAddress, // source_address
            ]);

            this.stakesFound++;
          }
        }
      }
    } catch (error) {
      // Continue with other blocks if one fails
      console.log(
        `   ⚠️  Error processing block ${blockHeight}: ${error.message}`
      );
    }
  }
}

// Run the scanner
const scanner = new DefinitiveStakingScanner();
scanner.scanFromLastBlock().catch(console.error);
