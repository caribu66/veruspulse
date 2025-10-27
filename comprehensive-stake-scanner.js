#!/usr/bin/env node

const { Pool } = require('pg');
const { execSync } = require('child_process');

class ComprehensiveStakeScanner {
  constructor() {
    this.pool = new Pool({
      connectionString:
        'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
      max: 5,
    });

    this.stakesFound = 0;
    this.blocksProcessed = 0;
    this.startTime = Date.now();
    this.batchSize = 100; // Larger batches for comprehensive scan
    this.delayBetweenBatches = 500; // Shorter delay for faster scanning
  }

  async initialize() {
    console.log('🚀 COMPREHENSIVE STAKE SCANNER - Filling Historical Gaps');
    console.log('=======================================================');
    console.log('');
    console.log(
      '🎯 GOAL: Scan from VerusID creation (block 800,208) to current tip'
    );
    console.log('📊 FOCUS: Find ALL missing stakes for 36,615+ VerusIDs');
    console.log('⚡ METHOD: Comprehensive block-by-block analysis');
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

  async getEarliestVerusIDBlock() {
    try {
      const result = await this.pool.query(
        'SELECT MIN(first_seen_block) as earliest FROM identities WHERE first_seen_block IS NOT NULL'
      );
      return result.rows[0].earliest || 800208; // Fallback to known earliest
    } catch (error) {
      console.error('❌ Error getting earliest VerusID block:', error.message);
      return 800208;
    }
  }

  async getExistingStakeRange() {
    try {
      const result = await this.pool.query(
        'SELECT MIN(block_height) as earliest, MAX(block_height) as latest FROM staking_rewards'
      );
      return {
        earliest: result.rows[0].earliest || 0,
        latest: result.rows[0].latest || 0,
      };
    } catch (error) {
      console.error('❌ Error getting existing stake range:', error.message);
      return { earliest: 0, latest: 0 };
    }
  }

  async isProofOfStakeBlock(block) {
    // Multiple methods to detect PoS blocks - using the working detection logic
    const methods = [
      block.validationtype === 'stake',
      block.posrewarddest !== undefined,
      block.proofofstake !== undefined,
    ];

    return methods.some(method => method === true);
  }

  async getBlock(blockHeight) {
    try {
      const hash = execSync(
        `/home/explorer/verus-cli/verus getblockhash ${blockHeight}`,
        { encoding: 'utf8' }
      ).trim();
      const blockData = execSync(
        `/home/explorer/verus-cli/verus getblock ${hash} 2`,
        { encoding: 'utf8' }
      );
      return JSON.parse(blockData);
    } catch (error) {
      console.error(`❌ Error getting block ${blockHeight}:`, error.message);
      return null;
    }
  }

  async extractStakesFromBlock(block, blockHeight) {
    const stakes = [];

    if (!this.isProofOfStakeBlock(block)) {
      return stakes;
    }

    if (!block.tx || block.tx.length === 0) {
      return stakes;
    }

    const coinstake = block.tx[0]; // First transaction is the coinstake
    if (!coinstake || !coinstake.vout || coinstake.vout.length === 0) {
      return stakes;
    }

    // Calculate total reward from all outputs
    const totalReward = coinstake.vout.reduce((sum, output) => {
      return sum + (output.value || 0);
    }, 0);

    // Check each output for VerusID addresses
    for (let i = 0; i < coinstake.vout.length; i++) {
      const output = coinstake.vout[i];
      if (!output.scriptPubKey || !output.scriptPubKey.addresses) {
        continue;
      }

      // Check ALL addresses in the output (this was the critical bug fix)
      for (let j = 0; j < output.scriptPubKey.addresses.length; j++) {
        const address = output.scriptPubKey.addresses[j];

        // Check if this is a VerusID (I-address)
        if (address && address.startsWith('i') && address.length > 20) {
          // Verify this VerusID exists in our database
          const exists = await this.verusIDExists(address);
          if (exists) {
            stakes.push({
              identityAddress: address,
              txid: coinstake.txid,
              vout: i,
              blockHeight: blockHeight,
              blockHash: block.hash,
              blockTime: new Date(block.time * 1000),
              amountSats: Math.round((output.value || 0) * 100000000),
              classifier: 'stake',
              sourceAddress: address,
            });
          }
        }
      }
    }

    return stakes;
  }

  async verusIDExists(identityAddress) {
    try {
      const result = await this.pool.query(
        'SELECT 1 FROM identities WHERE identity_address = $1 LIMIT 1',
        [identityAddress]
      );
      return result.rows.length > 0;
    } catch (error) {
      return false;
    }
  }

  async saveStakes(stakes) {
    if (stakes.length === 0) return;

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      for (const stake of stakes) {
        await client.query(
          `
          INSERT INTO staking_rewards 
            (identity_address, txid, vout, block_height, block_hash, block_time, amount_sats, classifier, source_address)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (txid, vout) DO NOTHING
        `,
          [
            stake.identityAddress,
            stake.txid,
            stake.vout,
            stake.blockHeight,
            stake.blockHash,
            stake.blockTime,
            stake.amountSats,
            stake.classifier,
            stake.sourceAddress,
          ]
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async scanRange(startBlock, endBlock) {
    console.log(
      `🔍 Scanning blocks ${startBlock.toLocaleString()} to ${endBlock.toLocaleString()}`
    );
    console.log(
      `📊 Total blocks to scan: ${(endBlock - startBlock + 1).toLocaleString()}`
    );
    console.log('');

    const totalBlocks = endBlock - startBlock + 1;
    let processed = 0;
    let batchStakes = [];

    for (let blockHeight = startBlock; blockHeight <= endBlock; blockHeight++) {
      try {
        const block = await this.getBlock(blockHeight);
        if (!block) {
          continue;
        }

        const stakes = await this.extractStakesFromBlock(block, blockHeight);
        batchStakes.push(...stakes);

        this.blocksProcessed++;
        processed++;

        // Process in batches
        if (batchStakes.length >= this.batchSize) {
          await this.saveStakes(batchStakes);
          this.stakesFound += batchStakes.length;
          batchStakes = [];

          // Progress update
          const progress = ((processed / totalBlocks) * 100).toFixed(2);
          const elapsed = (Date.now() - this.startTime) / 1000;
          const rate = processed / elapsed;
          const eta = Math.round((totalBlocks - processed) / rate / 60);

          console.log(
            `📊 Progress: ${progress}% | Blocks: ${processed.toLocaleString()}/${totalBlocks.toLocaleString()} | Stakes: ${this.stakesFound.toLocaleString()} | Rate: ${rate.toFixed(1)}/s | ETA: ${eta}m`
          );
        }

        // Small delay to prevent overwhelming the RPC
        if (processed % 10 === 0) {
          await new Promise(resolve =>
            setTimeout(resolve, this.delayBetweenBatches)
          );
        }
      } catch (error) {
        console.error(
          `❌ Error processing block ${blockHeight}:`,
          error.message
        );
        continue;
      }
    }

    // Save remaining stakes
    if (batchStakes.length > 0) {
      await this.saveStakes(batchStakes);
      this.stakesFound += batchStakes.length;
    }
  }

  async run() {
    try {
      await this.initialize();

      const currentHeight = await this.getCurrentBlockchainHeight();
      const earliestVerusID = await this.getEarliestVerusIDBlock();
      const existingRange = await this.getExistingStakeRange();

      console.log(
        `📊 Current blockchain height: ${currentHeight.toLocaleString()}`
      );
      console.log(
        `📊 Earliest VerusID creation: ${earliestVerusID.toLocaleString()}`
      );
      console.log(
        `📊 Existing stakes range: ${existingRange.earliest.toLocaleString()} - ${existingRange.latest.toLocaleString()}`
      );
      console.log('');

      // Determine scan ranges
      const scanRanges = [];

      // Gap before existing data
      if (existingRange.earliest > earliestVerusID) {
        scanRanges.push({
          start: earliestVerusID,
          end: existingRange.earliest - 1,
          description: 'Historical gap before existing data',
        });
      }

      // Gap after existing data
      if (existingRange.latest < currentHeight) {
        scanRanges.push({
          start: existingRange.latest + 1,
          end: currentHeight,
          description: 'Recent blocks after existing data',
        });
      }

      if (scanRanges.length === 0) {
        console.log('✅ No gaps found! Database is up to date.');
        return;
      }

      console.log(`🎯 Found ${scanRanges.length} gap(s) to fill:`);
      scanRanges.forEach((range, i) => {
        console.log(
          `   ${i + 1}. ${range.description}: blocks ${range.start.toLocaleString()} - ${range.end.toLocaleString()}`
        );
      });
      console.log('');

      // Scan each range
      for (const range of scanRanges) {
        console.log(`🚀 Starting scan: ${range.description}`);
        await this.scanRange(range.start, range.end);
        console.log(`✅ Completed: ${range.description}`);
        console.log('');
      }

      // Final summary
      const totalTime = (Date.now() - this.startTime) / 1000 / 60;
      console.log('╔═══════════════════════════════════════════════╗');
      console.log('║           COMPREHENSIVE SCAN COMPLETE!       ║');
      console.log('╚═══════════════════════════════════════════════╝');
      console.log(
        `📊 Blocks processed: ${this.blocksProcessed.toLocaleString()}`
      );
      console.log(`🎯 Stakes found: ${this.stakesFound.toLocaleString()}`);
      console.log(`⏱️  Total time: ${totalTime.toFixed(1)} minutes`);
      console.log(
        `🚀 Average speed: ${(this.blocksProcessed / (totalTime * 60)).toFixed(1)} blocks/sec`
      );
    } catch (error) {
      console.error('❌ Scanner error:', error);
    } finally {
      await this.pool.end();
    }
  }
}

// Run the scanner
const scanner = new ComprehensiveStakeScanner();
scanner.run().catch(console.error);
