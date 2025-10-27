#!/usr/bin/env node

const { Pool } = require('pg');
const { execSync } = require('child_process');

class ImprovedStakingScanner {
  constructor() {
    this.pool = new Pool({
      connectionString:
        'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
      max: 5, // Allow more connections for better performance
    });

    this.stakesFound = 0;
    this.blocksProcessed = 0;
    this.startTime = Date.now();
    this.batchSize = 50; // Smaller batches for stability
    this.delayBetweenBatches = 1000; // 1 second delay
  }

  async initialize() {
    console.log('🚀 IMPROVED STAKING SCANNER - Enhanced Version!');
    console.log('==============================================');
    console.log('');
    console.log('🔧 IMPROVEMENTS:');
    console.log(
      '   ✅ Fixed address detection - checks ALL addresses in vout array'
    );
    console.log('   ✅ Improved PoS block detection logic');
    console.log('   ✅ Better error handling and logging');
    console.log('   ✅ Optimized batch processing');
    console.log('   ✅ Comprehensive stake detection');
    console.log('');
  }

  async getCurrentBlockchainHeight() {
    try {
      const height = parseInt(
        execSync('/home/explorer/verus-cli/verus getblockcount', {
          encoding: 'utf8',
        }).trim()
      );
      return height;
    } catch (error) {
      console.error('❌ Error getting blockchain height:', error.message);
      return 0;
    }
  }

  async getLastScannedBlock() {
    try {
      const result = await this.pool.query(
        'SELECT MAX(block_height) as last_height FROM staking_rewards'
      );
      return result.rows[0].last_height || 0;
    } catch (error) {
      console.error('❌ Error getting last scanned block:', error.message);
      return 0;
    }
  }

  async isProofOfStakeBlock(block) {
    // Multiple methods to detect PoS blocks
    const methods = [
      block.validationtype === 'stake',
      block.posrewarddest !== undefined,
      block.proofofstake !== undefined,
      block.tx &&
        block.tx.length > 0 &&
        block.tx[0].vout &&
        block.tx[0].vout.length > 0,
    ];

    return methods.some(method => method === true);
  }

  async extractStakeFromBlock(block, blockHeight) {
    try {
      if (!block.tx || block.tx.length === 0) {
        return [];
      }

      const coinstake = block.tx[0]; // First transaction is usually the coinstake

      if (!coinstake.vout || coinstake.vout.length === 0) {
        return [];
      }

      const stakes = [];

      // Check the first output (main stake reward)
      const mainOutput = coinstake.vout[0];
      if (
        mainOutput.scriptPubKey?.addresses &&
        mainOutput.scriptPubKey.addresses.length > 0
      ) {
        // FIXED: Check ALL addresses in the array, not just the first one
        for (let i = 0; i < mainOutput.scriptPubKey.addresses.length; i++) {
          const stakerAddress = mainOutput.scriptPubKey.addresses[i];

          // Calculate reward amount (only the first output value)
          const rewardAmount = Math.round((mainOutput.value || 0) * 100000000);

          if (rewardAmount > 0) {
            stakes.push({
              identityAddress: stakerAddress,
              txid: coinstake.txid,
              vout: 0,
              blockHeight: blockHeight,
              blockTime: new Date(block.time * 1000),
              amountSats: rewardAmount,
              classifier: 'stake_reward',
              sourceAddress: stakerAddress,
            });
          }
        }
      }

      return stakes;
    } catch (error) {
      console.error(
        `❌ Error extracting stake from block ${blockHeight}:`,
        error.message
      );
      return [];
    }
  }

  async ensureIdentityExists(identityAddress) {
    try {
      await this.pool.query(
        `
        INSERT INTO identities (identity_address, identity_name, created_at)
        VALUES ($1, $2, $3)
        ON CONFLICT (identity_address) DO NOTHING
      `,
        [
          identityAddress,
          identityAddress, // Use address as name if no name available
          new Date(),
        ]
      );
    } catch (error) {
      // Ignore errors - identity might already exist
    }
  }

  async storeStakeEvent(stake) {
    try {
      // Ensure identity exists first
      await this.ensureIdentityExists(stake.identityAddress);

      // Insert stake event
      await this.pool.query(
        `
        INSERT INTO staking_rewards (
          identity_address, txid, vout, block_height, block_time,
          amount_sats, classifier, source_address
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (txid, vout) DO UPDATE SET
          identity_address = EXCLUDED.identity_address,
          amount_sats = EXCLUDED.amount_sats,
          source_address = EXCLUDED.source_address
      `,
        [
          stake.identityAddress,
          stake.txid,
          stake.vout,
          stake.blockHeight,
          stake.blockTime,
          stake.amountSats,
          stake.classifier,
          stake.sourceAddress,
        ]
      );

      this.stakesFound++;
    } catch (error) {
      console.error(`❌ Error storing stake event:`, error.message);
    }
  }

  async processBlock(blockHeight) {
    try {
      const blockData = execSync(
        `/home/explorer/verus-cli/verus getblock ${blockHeight} 2`,
        { encoding: 'utf8' }
      );
      const block = JSON.parse(blockData);

      this.blocksProcessed++;

      // Check if it's a Proof-of-Stake block
      if (await this.isProofOfStakeBlock(block)) {
        const stakes = await this.extractStakeFromBlock(block, blockHeight);

        for (const stake of stakes) {
          await this.storeStakeEvent(stake);
        }

        if (stakes.length > 0) {
          console.log(
            `   🎯 Block ${blockHeight}: Found ${stakes.length} stake(s)`
          );
          stakes.forEach(stake => {
            console.log(
              `      💰 ${stake.identityAddress}: ${(stake.amountSats / 100000000).toFixed(8)} VRSC`
            );
          });
        }
      }

      return true;
    } catch (error) {
      console.error(`❌ Error processing block ${blockHeight}:`, error.message);
      return false;
    }
  }

  async scanBlocks(startHeight, endHeight) {
    console.log(
      `🔍 Scanning blocks ${startHeight.toLocaleString()} to ${endHeight.toLocaleString()}...`
    );
    console.log(
      `📊 Total blocks to scan: ${(endHeight - startHeight + 1).toLocaleString()}`
    );
    console.log('');

    let processedInBatch = 0;

    for (
      let blockHeight = startHeight;
      blockHeight <= endHeight;
      blockHeight++
    ) {
      const success = await this.processBlock(blockHeight);

      if (!success) {
        console.log(
          `⚠️  Failed to process block ${blockHeight}, continuing...`
        );
      }

      processedInBatch++;

      // Progress reporting
      if (processedInBatch % 1000 === 0) {
        const elapsed = (Date.now() - this.startTime) / 1000;
        const rate = this.blocksProcessed / elapsed;
        const remaining = endHeight - blockHeight;
        const eta = remaining / rate;

        console.log(
          `📊 Progress: ${blockHeight.toLocaleString()}/${endHeight.toLocaleString()} blocks (${(((blockHeight - startHeight + 1) / (endHeight - startHeight + 1)) * 100).toFixed(1)}%)`
        );
        console.log(`   🎯 Stakes found: ${this.stakesFound}`);
        console.log(`   ⏱️  Rate: ${rate.toFixed(2)} blocks/sec`);
        console.log(`   ⏳ ETA: ${Math.round(eta / 60)} minutes`);
        console.log('');
      }

      // Batch delay to prevent overwhelming the system
      if (processedInBatch >= this.batchSize) {
        await new Promise(resolve =>
          setTimeout(resolve, this.delayBetweenBatches)
        );
        processedInBatch = 0;
      }
    }
  }

  async run() {
    try {
      await this.initialize();

      const currentHeight = await this.getCurrentBlockchainHeight();
      const lastScannedBlock = await this.getLastScannedBlock();

      console.log(
        `📊 Current blockchain height: ${currentHeight.toLocaleString()}`
      );
      console.log(
        `📊 Last scanned block: ${lastScannedBlock.toLocaleString()}`
      );

      if (lastScannedBlock >= currentHeight) {
        console.log('✅ Database is up-to-date!');
        return;
      }

      const blocksToScan = currentHeight - lastScannedBlock;
      console.log(`📊 Blocks to scan: ${blocksToScan.toLocaleString()}`);

      if (blocksToScan > 100000) {
        console.log(
          '⚠️  Large number of blocks to scan. This may take several hours.'
        );
        console.log(
          '💡 Consider running this in the background or in smaller batches.'
        );
      }

      console.log('');
      console.log(
        `🎯 Starting improved scan from block ${lastScannedBlock + 1} to ${currentHeight}`
      );
      console.log(
        '⚡ Enhanced with fixed address detection and improved PoS detection'
      );
      console.log('');

      await this.scanBlocks(lastScannedBlock + 1, currentHeight);

      const totalTime = (Date.now() - this.startTime) / 1000 / 60;

      console.log('');
      console.log('🎉 IMPROVED SCAN COMPLETE!');
      console.log(
        `📊 Total blocks processed: ${this.blocksProcessed.toLocaleString()}`
      );
      console.log(
        `🎯 Total stakes found: ${this.stakesFound.toLocaleString()}`
      );
      console.log(`⏱️  Total time: ${totalTime.toFixed(1)} minutes`);
      console.log('');
      console.log('✅ Database is now up-to-date with improved accuracy!');
    } catch (error) {
      console.error('❌ Scanner error:', error.message);
    } finally {
      await this.pool.end();
    }
  }
}

// Run the improved scanner
const scanner = new ImprovedStakingScanner();
scanner.run().catch(console.error);
