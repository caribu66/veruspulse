#!/usr/bin/env node

const { Pool } = require('pg');
const { execSync } = require('child_process');

class FixedStakeScanner {
  constructor() {
    this.pool = new Pool({
      connectionString:
        'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
      max: 3,
    });

    this.stakesFound = 0;
    this.blocksProcessed = 0;
    this.startTime = Date.now();
    this.batchSize = 50;
    this.delayBetweenBlocks = 25;
    this.delayBetweenBatches = 500;
  }

  async initialize() {
    console.log('🚀 FIXED STAKE SCANNER - Debugging Detection Logic');
    console.log('=================================================');
    console.log('');
    console.log('🔧 FIXES:');
    console.log('   ✅ Better PoS block detection');
    console.log('   ✅ Improved address extraction');
    console.log('   ✅ Debug logging for troubleshooting');
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
    // Multiple detection methods
    const isStake = block.validationtype === 'stake';
    const hasPosReward = block.posrewarddest !== undefined;
    const hasProofOfStake = block.proofofstake !== undefined;
    const isMinted = block.blocktype === 'minted';

    const result = isStake || hasPosReward || hasProofOfStake || isMinted;

    // Debug logging for first few blocks
    if (this.blocksProcessed < 10) {
      console.log(
        `🔍 Block ${block.height}: validationtype=${block.validationtype}, posrewarddest=${block.posrewarddest}, proofofstake=${block.proofofstake}, blocktype=${block.blocktype} -> PoS: ${result}`
      );
    }

    return result;
  }

  async getBlock(blockHeight) {
    try {
      const hash = execSync(
        `/home/explorer/verus-cli/verus getblockhash ${blockHeight}`,
        {
          encoding: 'utf8',
          timeout: 3000,
        }
      ).trim();

      const blockData = execSync(
        `/home/explorer/verus-cli/verus getblock ${hash} 2`,
        {
          encoding: 'utf8',
          timeout: 5000,
        }
      );

      return JSON.parse(blockData);
    } catch (error) {
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

    const coinstake = block.tx[0];
    if (!coinstake || !coinstake.vout || coinstake.vout.length === 0) {
      return stakes;
    }

    // Debug logging for first few PoS blocks
    const isDebugBlock = this.blocksProcessed < 10;
    if (isDebugBlock) {
      console.log(
        `🎯 PoS Block ${blockHeight}: Found ${coinstake.vout.length} outputs`
      );
    }

    // Check each output for VerusID addresses
    for (let i = 0; i < coinstake.vout.length; i++) {
      const output = coinstake.vout[i];
      if (!output.scriptPubKey || !output.scriptPubKey.addresses) {
        continue;
      }

      if (isDebugBlock) {
        console.log(
          `   Output ${i}: ${output.scriptPubKey.addresses.length} addresses: ${output.scriptPubKey.addresses.join(', ')}`
        );
      }

      // Check ALL addresses in the output
      for (let j = 0; j < output.scriptPubKey.addresses.length; j++) {
        const address = output.scriptPubKey.addresses[j];

        if (address && address.startsWith('i') && address.length > 20) {
          const exists = await this.verusIDExists(address);
          if (exists) {
            const stake = {
              identityAddress: address,
              txid: coinstake.txid,
              vout: i,
              blockHeight: blockHeight,
              blockHash: block.hash,
              blockTime: new Date(block.time * 1000),
              amountSats: Math.round((output.value || 0) * 100000000),
              classifier: 'stake',
              sourceAddress: address,
            };

            stakes.push(stake);

            if (isDebugBlock) {
              console.log(
                `   ✅ FOUND STAKE: ${address} - ${(output.value || 0).toFixed(8)} VRSC`
              );
            }
          } else if (isDebugBlock) {
            console.log(`   ❌ VerusID not in database: ${address}`);
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

  async scanRange(startBlock, endBlock, description) {
    console.log(`🚀 Starting: ${description}`);
    console.log(
      `🔍 Scanning blocks ${startBlock.toLocaleString()} to ${endBlock.toLocaleString()}`
    );
    console.log(
      `📊 Total blocks: ${(endBlock - startBlock + 1).toLocaleString()}`
    );
    console.log('');

    const totalBlocks = endBlock - startBlock + 1;
    let processed = 0;
    let batchStakes = [];
    let lastProgressTime = Date.now();

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
        }

        // Progress update every 5 seconds
        const now = Date.now();
        if (now - lastProgressTime > 5000) {
          const progress = ((processed / totalBlocks) * 100).toFixed(2);
          const elapsed = (now - this.startTime) / 1000;
          const rate = processed / elapsed;
          const eta = Math.round((totalBlocks - processed) / rate / 60);

          console.log(
            `📊 Progress: ${progress}% | Blocks: ${processed.toLocaleString()}/${totalBlocks.toLocaleString()} | Stakes: ${this.stakesFound.toLocaleString()} | Rate: ${rate.toFixed(1)}/s | ETA: ${eta}m`
          );
          lastProgressTime = now;
        }

        // Minimal rate limiting
        await new Promise(resolve =>
          setTimeout(resolve, this.delayBetweenBlocks)
        );

        if (processed % this.batchSize === 0) {
          await new Promise(resolve =>
            setTimeout(resolve, this.delayBetweenBatches)
          );
        }
      } catch (error) {
        continue;
      }
    }

    // Save remaining stakes
    if (batchStakes.length > 0) {
      await this.saveStakes(batchStakes);
      this.stakesFound += batchStakes.length;
    }

    console.log(`✅ Completed: ${description}`);
    console.log(`📊 Found ${this.stakesFound.toLocaleString()} stakes so far`);
    console.log('');
  }

  async run() {
    try {
      await this.initialize();

      const currentHeight = await this.getCurrentBlockchainHeight();
      const existingRange = await this.getExistingStakeRange();
      const startBlock = 1000000;

      console.log(
        `📊 Current blockchain height: ${currentHeight.toLocaleString()}`
      );
      console.log(
        `📊 Start block (requirement): ${startBlock.toLocaleString()}`
      );
      console.log(
        `📊 Existing stakes range: ${existingRange.earliest.toLocaleString()} - ${existingRange.latest.toLocaleString()}`
      );
      console.log('');

      // Start with a small test range first
      const testEndBlock = Math.min(startBlock + 1000, currentHeight);
      console.log(
        `🧪 TESTING: Scanning first 1000 blocks to debug detection logic`
      );
      console.log('');

      await this.scanRange(
        startBlock,
        testEndBlock,
        `Test scan from ${startBlock.toLocaleString()} to ${testEndBlock.toLocaleString()}`
      );

      // If we found stakes in the test, continue with full scan
      if (this.stakesFound > 0) {
        console.log(
          `✅ Test successful! Found ${this.stakesFound} stakes. Continuing with full scan...`
        );
        console.log('');

        await this.scanRange(
          testEndBlock + 1,
          currentHeight,
          `Full scan from ${testEndBlock + 1} to ${currentHeight}`
        );
      } else {
        console.log(
          `❌ Test failed! No stakes found. Need to debug detection logic further.`
        );
      }

      // Final summary
      const totalTime = (Date.now() - this.startTime) / 1000 / 60;
      console.log('╔═══════════════════════════════════════════════╗');
      console.log('║              FIXED SCAN COMPLETE!            ║');
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
const scanner = new FixedStakeScanner();
scanner.run().catch(console.error);
