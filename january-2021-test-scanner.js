#!/usr/bin/env node

/**
 * January 2021 Test Scanner
 * - Tests if we can find new PoS rewards in January 2021
 * - Uses Oink70's proven PoS detection method
 * - Scans from January 1, 2021 to current tip
 * - Uses improved conflict resolution
 */

const { Pool } = require('pg');
const { execSync } = require('child_process');

class January2021TestScanner {
  constructor() {
    this.pool = new Pool({
      connectionString:
        'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
      max: 3,
    });

    this.stakesFound = 0;
    this.blocksProcessed = 0;
    this.posBlocksFound = 0;
    this.startTime = Date.now();
    this.rpcDelay = 0; // No delay for maximum speed
    this.batchSize = 2000; // Large batches
    this.batchDelay = 25; // Minimal delay
  }

  async initialize() {
    console.log('🚀 JANUARY 2021 TEST SCANNER');
    console.log('============================');
    console.log('');
    console.log("🔧 Using Oink70's proven PoS detection method");
    console.log('🎯 Testing if we can find NEW PoS rewards in January 2021');
    console.log('📅 Scanning from January 1, 2021 to current tip');
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

  async isProofOfStakeBlock(block) {
    // OINK70'S PROVEN METHOD: Only validationtype="stake" is PoS
    return block.validationtype === 'stake';
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

    // Check ALL vouts for addresses
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
        ON CONFLICT (txid, vout) DO NOTHING
      `;

      const result = await this.pool.query(query);
      this.stakesFound += rewards.length;
      console.log(`💾 Processed ${rewards.length} stakes (new or existing)`);
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

        this.posBlocksFound++;

        const rewards = await this.extractStakingRewards(blockData);

        if (rewards.length > 0) {
          const saved = await this.saveStakingRewards(rewards);
          if (saved) {
            console.log(
              `   🎯 Block ${blockHeight}: Found ${rewards.length} stake(s) [PoS #${this.posBlocksFound}]`
            );
            rewards.forEach(reward => {
              const amount = (reward.amount_sats / 100000000).toFixed(8);
              console.log(
                `      💰 ${reward.identity_address}: ${amount} VRSC`
              );
            });
          }
        } else {
          console.log(
            `   🔍 Block ${blockHeight}: PoS block but no I-address stakes [PoS #${this.posBlocksFound}]`
          );
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

      console.log(
        `📊 Current blockchain height: ${currentHeight.toLocaleString()}`
      );

      // Start from January 1, 2021 (approximately block 1,800,000+)
      const january2021Start = 1800000; // January 1, 2021 (approximate)
      const endBlock = currentHeight;

      console.log('');
      console.log('🎯 January 2021 to tip range:');
      console.log(
        `   Start: Block ${january2021Start.toLocaleString()} (January 1, 2021)`
      );
      console.log(`   End: Block ${endBlock.toLocaleString()} (Current tip)`);
      console.log(
        `   Total blocks: ${(endBlock - january2021Start + 1).toLocaleString()}`
      );
      console.log(
        `   Expected PoS blocks: ${Math.round((endBlock - january2021Start + 1) * 0.5).toLocaleString()}`
      );
      console.log('');

      // Process from January 2021 to current tip
      const totalBlocks = endBlock - january2021Start + 1;
      let currentBlock = january2021Start;

      while (currentBlock <= endBlock) {
        const batchEnd = Math.min(currentBlock + this.batchSize - 1, endBlock);

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
        const remaining = endBlock - currentBlock;
        const eta = remaining / rate;

        console.log(
          `📊 Progress: ${this.blocksProcessed}/${totalBlocks} blocks (${progress}%)`
        );
        console.log(`🎯 PoS blocks found: ${this.posBlocksFound}`);
        console.log(`💰 I-address stakes found: ${this.stakesFound}`);
        console.log(`⚡ Speed: ${rate.toFixed(2)} blocks/sec`);
        console.log(`⏱️  ETA: ${Math.round(eta)} seconds`);
        console.log('');

        currentBlock = batchEnd + 1;

        // Delay between batches
        if (currentBlock <= endBlock) {
          console.log(`⏳ Waiting ${this.batchDelay}ms before next batch...`);
          await new Promise(resolve => setTimeout(resolve, this.batchDelay));
        }
      }

      console.log('\n🎉 January 2021 test scan completed!');
      console.log(`📊 Total blocks processed: ${this.blocksProcessed}`);
      console.log(`🎯 Total PoS blocks found: ${this.posBlocksFound}`);
      console.log(`💰 Total I-address stakes found: ${this.stakesFound}`);
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
const scanner = new January2021TestScanner();
scanner.run().catch(error => {
  console.error('❌ Scanner failed:', error);
  process.exit(1);
});
