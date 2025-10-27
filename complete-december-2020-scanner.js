#!/usr/bin/env node

/**
 * Complete December 2020 Scanner
 * - Scans the ENTIRE December 2020 month (500,000+ blocks)
 * - Finds ALL I-address stakes including caribu66@
 * - Uses proven PoS detection logic
 * - Optimized for speed
 */

const { Pool } = require('pg');
const { execSync } = require('child_process');

class CompleteDecember2020Scanner {
  constructor() {
    this.pool = new Pool({
      connectionString:
        'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
      max: 3,
    });

    this.stakesFound = 0;
    this.blocksProcessed = 0;
    this.startTime = Date.now();
    this.rpcDelay = 0; // No delay for maximum speed
    this.batchSize = 2000; // Large batches
    this.batchDelay = 25; // Minimal delay
  }

  async initialize() {
    console.log('🚀 COMPLETE DECEMBER 2020 SCANNER');
    console.log('=================================');
    console.log('');
    console.log('🎯 Scanning the ENTIRE December 2020 month');
    console.log('🔍 Finding ALL I-address stakes including caribu66@');
    console.log('⚡ Optimized for maximum speed');
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

  async getFirstScannedBlock() {
    try {
      const result = await this.pool.query(
        'SELECT MIN(block_height) as first_height FROM staking_rewards'
      );
      return result.rows[0].first_height || 0;
    } catch (error) {
      console.error('❌ Error getting first scanned block:', error.message);
      return 0;
    }
  }

  async isProofOfStakeBlock(block) {
    // Same proven logic as working scanner
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

  async extractStakingRewards(block) {
    const rewards = [];

    if (!block.tx || block.tx.length === 0) {
      return rewards;
    }

    // Check first transaction (coinstake)
    const coinstakeTx = block.tx[0];
    if (!coinstakeTx.vout || coinstakeTx.vout.length === 0) {
      return rewards;
    }

    // Check ALL vouts for addresses (same logic as working scanner)
    for (let i = 0; i < coinstakeTx.vout.length; i++) {
      const vout = coinstakeTx.vout[i];

      if (vout.scriptPubKey && vout.scriptPubKey.addresses) {
        for (const address of vout.scriptPubKey.addresses) {
          if (address && address.startsWith('i')) {
            rewards.push({
              identity_address: address,
              txid: coinstakeTx.txid,
              vout: i,
              block_height: block.height,
              block_hash: block.hash,
              block_time: new Date(block.time * 1000),
              amount_sats: Math.round(vout.value * 100000000),
              classifier: 'staking_reward',
              source_address: address,
            });
          }
        }
      }
    }

    return rewards;
  }

  async saveStakingRewards(rewards) {
    if (rewards.length === 0) return true;

    try {
      const values = rewards
        .map(
          reward =>
            `('${reward.identity_address}', '${reward.txid}', ${reward.vout}, ${reward.block_height}, '${reward.block_hash}', '${reward.block_time.toISOString()}', ${reward.amount_sats}, '${reward.classifier}', '${reward.source_address}')`
        )
        .join(',');

      const query = `
        INSERT INTO staking_rewards (identity_address, txid, vout, block_height, block_hash, block_time, amount_sats, classifier, source_address)
        VALUES ${values}
        ON CONFLICT DO NOTHING
      `;

      await this.pool.query(query);
      this.stakesFound += rewards.length;
      console.log(`💾 Saved ${rewards.length} stakes to database`);
      return true;
    } catch (error) {
      console.error('❌ Error saving staking rewards:', error.message);
      return false;
    }
  }

  async processBlock(blockHeight) {
    let retries = 3;

    while (retries > 0) {
      try {
        // Add small delay before RPC call
        await new Promise(resolve => setTimeout(resolve, this.rpcDelay));

        const blockHash = execSync(
          `/home/explorer/verus-cli/verus getblockhash ${blockHeight}`,
          { encoding: 'utf8' }
        ).trim();

        // Add small delay before next RPC call
        await new Promise(resolve => setTimeout(resolve, this.rpcDelay));

        const blockData = JSON.parse(
          execSync(`/home/explorer/verus-cli/verus getblock ${blockHash} 2`, {
            encoding: 'utf8',
          })
        );

        if (!this.isProofOfStakeBlock(blockData)) {
          return true; // Not a PoS block, but processed successfully
        }

        const rewards = await this.extractStakingRewards(blockData);

        if (rewards.length > 0) {
          const saved = await this.saveStakingRewards(rewards);
          if (saved) {
            console.log(
              `   🎯 Block ${blockHeight}: Found ${rewards.length} stake(s)`
            );
            rewards.forEach(reward => {
              const amount = (reward.amount_sats / 100000000).toFixed(8);
              console.log(
                `      💰 ${reward.identity_address}: ${amount} VRSC`
              );
            });
          }
        }

        return true;
      } catch (error) {
        retries--;
        console.error(
          `❌ Error processing block ${blockHeight} (${retries} retries left):`,
          error.message
        );

        if (retries > 0) {
          console.log(`⏳ Retrying block ${blockHeight} in 50ms...`);
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
    }

    return false; // Failed after all retries
  }

  async run() {
    try {
      await this.initialize();

      const currentHeight = await this.getCurrentBlockchainHeight();
      const lastScannedBlock = await this.getLastScannedBlock();
      const firstScannedBlock = await this.getFirstScannedBlock();

      console.log(
        `📊 Current blockchain height: ${currentHeight.toLocaleString()}`
      );
      console.log(
        `📊 First scanned block: ${firstScannedBlock.toLocaleString()}`
      );
      console.log(
        `📊 Last scanned block: ${lastScannedBlock.toLocaleString()}`
      );

      // December 2020 range: From December 7 to December 28, 2020
      const december2020Start = 1299328; // December 7, 2020
      const december2020End = 1800000; // December 28, 2020 (approximate)

      console.log('');
      console.log('🎯 December 2020 range:');
      console.log(
        `   Start: Block ${december2020Start.toLocaleString()} (December 7, 2020)`
      );
      console.log(
        `   End: Block ${december2020End.toLocaleString()} (December 28, 2020)`
      );
      console.log(
        `   Total blocks: ${(december2020End - december2020Start + 1).toLocaleString()}`
      );
      console.log('');

      // Process the entire December 2020 range
      const totalBlocks = december2020End - december2020Start + 1;
      let currentBlock = december2020Start;

      while (currentBlock <= december2020End) {
        const batchEnd = Math.min(
          currentBlock + this.batchSize - 1,
          december2020End
        );

        console.log(
          `🔍 Processing batch: blocks ${currentBlock.toLocaleString()} to ${batchEnd.toLocaleString()}`
        );

        for (
          let blockHeight = currentBlock;
          blockHeight <= batchEnd;
          blockHeight++
        ) {
          const success = await this.processBlock(blockHeight);
          this.blocksProcessed++;

          if (!success) {
            console.log(
              `⚠️  Failed to process block ${blockHeight}, continuing...`
            );
          }
        }

        // Progress update
        const progress = ((this.blocksProcessed / totalBlocks) * 100).toFixed(
          2
        );
        const elapsed = (Date.now() - this.startTime) / 1000;
        const rate = this.blocksProcessed / elapsed;
        const remaining = december2020End - currentBlock;
        const eta = remaining / rate;

        console.log(
          `📊 Progress: ${this.blocksProcessed}/${totalBlocks} blocks (${progress}%)`
        );
        console.log(`🎯 Stakes found: ${this.stakesFound}`);
        console.log(`⚡ Speed: ${rate.toFixed(2)} blocks/sec`);
        console.log(`⏱️  ETA: ${Math.round(eta)} seconds`);
        console.log('');

        currentBlock = batchEnd + 1;

        // Delay between batches
        if (currentBlock <= december2020End) {
          console.log(`⏳ Waiting ${this.batchDelay}ms before next batch...`);
          await new Promise(resolve => setTimeout(resolve, this.batchDelay));
        }
      }

      console.log('\n🎉 December 2020 scan completed!');
      console.log(`📊 Total blocks processed: ${this.blocksProcessed}`);
      console.log(`🎯 Total stakes found: ${this.stakesFound}`);
      console.log(
        `⏱️  Total time: ${Math.round((Date.now() - this.startTime) / 1000)} seconds`
      );
    } catch (error) {
      console.error('❌ Scanner failed:', error);
    } finally {
      await this.pool.end();
    }
  }
}

// Run the scanner
const scanner = new CompleteDecember2020Scanner();
scanner.run().catch(error => {
  console.error('❌ Scanner failed:', error);
  process.exit(1);
});
