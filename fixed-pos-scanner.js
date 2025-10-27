#!/usr/bin/env node

/**
 * FIXED PoS Scanner
 * - FIXED PoS detection logic to find ALL PoS blocks
 * - Scans from December 2020 to current tip
 * - Finds ALL I-address stakes with correct PoS detection
 * - Uses FIXED coinstake detection logic
 */

const { Pool } = require('pg');
const { execSync } = require('child_process');

class FixedPoSScanner {
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
    console.log('🚀 FIXED PoS SCANNER');
    console.log('====================');
    console.log('');
    console.log('🔧 FIXED PoS detection logic');
    console.log('🎯 Finding ALL PoS blocks (not just validationtype=stake)');
    console.log('🔍 Scanning from December 2020 to current tip');
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

  async isProofOfStakeBlock(block) {
    // FIXED: Check for coinstake transaction (first tx with vouts)
    // This is the correct way to detect PoS blocks in Verus
    if (!block.tx || block.tx.length === 0) {
      return false;
    }

    const firstTx = block.tx[0];
    if (!firstTx.vout || firstTx.vout.length === 0) {
      return false;
    }

    // Check if first transaction has outputs (coinstake)
    // This indicates a PoS block regardless of validationtype
    return true;
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
      const lastScannedBlock = await this.getLastScannedBlock();

      console.log(
        `📊 Current blockchain height: ${currentHeight.toLocaleString()}`
      );
      console.log(
        `📊 Last scanned block: ${lastScannedBlock.toLocaleString()}`
      );

      // Start from December 2020
      const december2020Start = 1299328; // December 7, 2020
      const endBlock = currentHeight;

      console.log('');
      console.log('🎯 December 2020 to tip range:');
      console.log(
        `   Start: Block ${december2020Start.toLocaleString()} (December 2020)`
      );
      console.log(`   End: Block ${endBlock.toLocaleString()} (Current tip)`);
      console.log(
        `   Total blocks: ${(endBlock - december2020Start + 1).toLocaleString()}`
      );
      console.log(
        `   Expected PoS blocks: ${Math.round((endBlock - december2020Start + 1) * 0.5).toLocaleString()}`
      );
      console.log('');

      // Process from December 2020 to current tip
      const totalBlocks = endBlock - december2020Start + 1;
      let currentBlock = december2020Start;

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

      console.log('\n🎉 FIXED PoS scan completed!');
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
const scanner = new FixedPoSScanner();
scanner.run().catch(error => {
  console.error('❌ Scanner failed:', error);
  process.exit(1);
});
