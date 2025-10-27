#!/usr/bin/env node

/**
 * Historical Gap Scanner - Uses the existing working scanner logic
 * Scans from December 2020 (block 1,299,328) to first existing block (1,059,996)
 * Uses the same PoS detection logic as optimize-staking-scanner.js
 */

const { Pool } = require('pg');
const { execSync } = require('child_process');

class HistoricalGapScanner {
  constructor() {
    this.pool = new Pool({
      connectionString:
        'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
      max: 5,
    });

    this.stakesFound = 0;
    this.creationsFound = 0;
    this.blocksProcessed = 0;
    this.startTime = Date.now();
    this.batchSize = 10; // Smaller batches
    this.delayBetweenBatches = 5000; // 5 second delay

    // Historical range: From December 2020 to current tip
    this.startBlock = 1299328; // December 2020
    this.endBlock = null; // Will be set to current tip
  }

  async initialize() {
    // Get current blockchain tip
    this.endBlock = await this.getCurrentBlockchainHeight();

    console.log('🚀 DECEMBER 2020 SCANNER - December 2020 to Current Tip');
    console.log('======================================================');
    console.log('');
    console.log('🎯 Scanning from December 2020 onwards:');
    console.log(`   Start: Block ${this.startBlock} (December 2020)`);
    console.log(`   End: Block ${this.endBlock} (current tip)`);
    console.log(`   Total blocks: ${this.endBlock - this.startBlock + 1}`);
    console.log('');
    console.log(
      '🔧 Using proven PoS detection logic from optimize-staking-scanner.js'
    );
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

  async isProofOfStakeBlock(block) {
    // Same logic as optimize-staking-scanner.js
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
    if (rewards.length === 0) return;

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
        ON CONFLICT (block_height, identity_address) DO NOTHING
      `;

      await this.pool.query(query);
      this.stakesFound += rewards.length;
    } catch (error) {
      console.error('❌ Error saving staking rewards:', error.message);
    }
  }

  async processBlock(blockHeight) {
    try {
      console.log(`🔍 Processing block ${blockHeight}...`);
      const blockHash = execSync(
        `/home/explorer/verus-cli/verus getblockhash ${blockHeight}`,
        { encoding: 'utf8' }
      ).trim();
      console.log(`✅ Got block hash: ${blockHash}`);
      const blockData = JSON.parse(
        execSync(`/home/explorer/verus-cli/verus getblock ${blockHash} 2`, {
          encoding: 'utf8',
        })
      );
      console.log(`✅ Got block data for block ${blockHeight}`);

      if (!this.isProofOfStakeBlock(blockData)) {
        return;
      }

      const rewards = await this.extractStakingRewards(blockData);

      if (rewards.length > 0) {
        await this.saveStakingRewards(rewards);
        console.log(
          `   🎯 Block ${blockHeight}: Found ${rewards.length} stake(s)`
        );
        rewards.forEach(reward => {
          const amount = (reward.amount_sats / 100000000).toFixed(8);
          console.log(`      💰 ${reward.identity_address}: ${amount} VRSC`);
        });
      }
    } catch (error) {
      console.error(`❌ Error processing block ${blockHeight}:`, error.message);
    }
  }

  async run() {
    await this.initialize();

    const totalBlocks = this.endBlock - this.startBlock + 1;
    let currentBlock = this.startBlock;

    console.log('🔄 Starting historical gap scan...\n');

    while (currentBlock <= this.endBlock) {
      const batch = [];

      // Process batch
      for (
        let i = 0;
        i < this.batchSize && currentBlock <= this.endBlock;
        i++
      ) {
        await this.processBlock(currentBlock);
        this.blocksProcessed++;
        currentBlock++;
      }

      // Progress update
      if (this.blocksProcessed % 1000 === 0 || currentBlock > this.endBlock) {
        const elapsed = (Date.now() - this.startTime) / 1000;
        const rate = this.blocksProcessed / elapsed;
        const remaining = this.endBlock - currentBlock + 1;
        const eta = remaining / rate;
        const progress = ((this.blocksProcessed / totalBlocks) * 100).toFixed(
          2
        );

        console.log(
          `📊 Progress: ${this.blocksProcessed}/${totalBlocks} blocks (${progress}%)`
        );
        console.log(`🎯 Stakes found: ${this.stakesFound}`);
        console.log(`⚡ Speed: ${rate.toFixed(2)} blocks/sec`);
        console.log(`⏱️  ETA: ${Math.round(eta)} seconds\n`);
      }

      // Delay between batches
      if (currentBlock <= this.endBlock) {
        await new Promise(resolve =>
          setTimeout(resolve, this.delayBetweenBatches)
        );
      }
    }

    console.log('\n🎉 Historical gap scan completed!');
    console.log(`📊 Total blocks processed: ${this.blocksProcessed}`);
    console.log(`🎯 Total stakes found: ${this.stakesFound}`);
    console.log(
      `⏱️  Total time: ${Math.round((Date.now() - this.startTime) / 1000)} seconds`
    );

    await this.pool.end();
  }
}

// Run the scanner
const scanner = new HistoricalGapScanner();
scanner.run().catch(error => {
  console.error('❌ Scanner failed:', error);
  process.exit(1);
});
