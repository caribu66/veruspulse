#!/usr/bin/env node

const { execSync } = require('child_process');
const { Pool } = require('pg');

class RobustEarly2022Scanner {
  constructor() {
    this.pool = new Pool({
      connectionString:
        'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
    });
    this.stakesFound = 0;
    this.blocksProcessed = 0;
    this.posBlocksFound = 0;
    this.startTime = Date.now();
    this.rpcDelay = 50; // Increased delay to prevent ENOBUFS
    this.batchSize = 100; // Smaller batches for stability
    this.batchDelay = 500; // Longer delay between batches
    this.retryDelay = 1000; // Longer retry delay
    this.maxRetries = 5; // Limit retries to prevent infinite loops
  }

  async initialize() {
    console.log('🎯 ROBUST EARLY 2022 GAP SCANNER');
    console.log('==================================');
    console.log('📍 Target: 2.3M to 2.4M (Early 2022)');
    console.log('🎯 Goal: Find missing VerusID PoS stakes');
    console.log('🛡️  Stable Settings (No Data Loss):');
    console.log(`   RPC delay: ${this.rpcDelay}ms`);
    console.log(`   Batch size: ${this.batchSize} blocks`);
    console.log(`   Batch delay: ${this.batchDelay}ms`);
    console.log(`   Retry delay: ${this.retryDelay}ms`);
    console.log(`   Max retries: ${this.maxRetries}`);
    console.log(`   Target speed: ~15 blocks/sec (stable, no ENOBUFS)`);
    console.log('');

    // Test database connection
    try {
      await this.pool.query('SELECT 1');
      console.log('✅ Database connection established');
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      process.exit(1);
    }

    // Test RPC connection
    try {
      const info = execSync(
        '/home/explorer/verus-dapp/verus-cli/verus getblockchaininfo',
        { encoding: 'utf8' }
      );
      const blockchainInfo = JSON.parse(info);
      console.log(
        `✅ RPC connection established (height: ${blockchainInfo.blocks})`
      );
    } catch (error) {
      console.error('❌ RPC connection failed:', error.message);
      process.exit(1);
    }
  }

  async isProofOfStakeBlock(block) {
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
              classifier: 'PoS',
              source_address: block.posrewarddest || 'unknown',
            });
          }
        }
      }
    }
    return rewards;
  }

  async saveStakingRewards(rewards) {
    if (rewards.length === 0) {
      return true;
    }
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

  async processBlock(blockHeight, retryCount = 0) {
    try {
      // Add delay to prevent ENOBUFS
      await new Promise(resolve => setTimeout(resolve, this.rpcDelay));

      const blockHash = execSync(
        `/home/explorer/verus-dapp/verus-cli/verus getblockhash ${blockHeight}`,
        { encoding: 'utf8' }
      ).trim();
      const blockData = execSync(
        `/home/explorer/verus-dapp/verus-cli/verus getblock "${blockHash}" 2`,
        { encoding: 'utf8' }
      );
      const block = JSON.parse(blockData);

      this.blocksProcessed++;

      // Check if it's a PoS block using Oink70's method
      if (await this.isProofOfStakeBlock(block)) {
        this.posBlocksFound++;

        // Extract staking rewards
        const rewards = await this.extractStakingRewards(block);

        if (rewards.length > 0) {
          console.log(
            `💰 Block ${blockHeight}: Found ${rewards.length} I-address stakes [PoS #${this.posBlocksFound}]`
          );
          await this.saveStakingRewards(rewards);
        } else {
          console.log(
            `🔍 Block ${blockHeight}: PoS block but no I-address stakes [PoS #${this.posBlocksFound}]`
          );
        }
      }

      return true;
    } catch (error) {
      if (error.message.includes('ENOBUFS') && retryCount < this.maxRetries) {
        console.log(
          `⚠️  ENOBUFS error at block ${blockHeight}, retry ${retryCount + 1}/${this.maxRetries} in ${this.retryDelay}ms...`
        );
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        return await this.processBlock(blockHeight, retryCount + 1); // Retry with count
      } else if (error.message.includes('ENOBUFS')) {
        console.log(
          `❌ Max retries exceeded for block ${blockHeight}, skipping...`
        );
        return false;
      }
      console.error(`❌ Error processing block ${blockHeight}:`, error.message);
      return false;
    }
  }

  async getLastProcessedBlock() {
    try {
      // Check database for the highest block in our range
      const result = await this.pool.query(`
        SELECT MAX(block_height) as last_block
        FROM staking_rewards 
        WHERE block_height BETWEEN 2300000 AND 2400000
      `);

      const lastBlock = result.rows[0].last_block;
      if (lastBlock) {
        console.log(`📍 Resuming from block ${lastBlock.toLocaleString()}`);
        return lastBlock + 1; // Start from next block
      }
      return 2300000; // Start from beginning
    } catch (error) {
      console.log(
        '⚠️  Could not determine last processed block, starting from beginning'
      );
      return 2300000;
    }
  }

  async scanBlocks(startBlock, endBlock) {
    console.log(
      `🚀 Starting scan from block ${startBlock.toLocaleString()} to ${endBlock.toLocaleString()}`
    );
    console.log(
      `📊 Total blocks to scan: ${(endBlock - startBlock + 1).toLocaleString()}`
    );
    console.log('');

    for (
      let currentBlock = startBlock;
      currentBlock <= endBlock;
      currentBlock += this.batchSize
    ) {
      const batchEnd = Math.min(currentBlock + this.batchSize - 1, endBlock);
      const batchStart = currentBlock;

      console.log(
        `📦 Processing batch: ${batchStart.toLocaleString()} - ${batchEnd.toLocaleString()}`
      );

      // Process batch
      for (
        let blockHeight = batchStart;
        blockHeight <= batchEnd;
        blockHeight++
      ) {
        await this.processBlock(blockHeight);
      }

      // Progress update
      const progress = (
        ((currentBlock - startBlock) / (endBlock - startBlock + 1)) *
        100
      ).toFixed(2);
      const elapsed = (Date.now() - this.startTime) / 1000;
      const speed = this.blocksProcessed / elapsed;
      const remaining = endBlock - currentBlock;
      const eta = remaining / speed;

      console.log(
        `📈 Progress: ${progress}% | Speed: ${speed.toFixed(2)} blocks/sec | ETA: ${Math.round(eta / 60)} minutes`
      );
      console.log(`💰 I-address stakes found: ${this.stakesFound}`);
      console.log('');

      // Batch delay
      if (this.batchDelay > 0 && currentBlock + this.batchSize <= endBlock) {
        await new Promise(resolve => setTimeout(resolve, this.batchDelay));
      }
    }
  }

  async run() {
    try {
      await this.initialize();

      const startBlock = await this.getLastProcessedBlock();
      const endBlock = 2400000; // End of Early 2022

      if (startBlock > endBlock) {
        console.log('✅ Early 2022 range already completed!');
        return;
      }

      await this.scanBlocks(startBlock, endBlock);

      const totalTime = (Date.now() - this.startTime) / 1000;
      console.log('');
      console.log('🎉 Robust Early 2022 gap scan completed!');
      console.log(
        `📊 Total blocks processed: ${this.blocksProcessed.toLocaleString()}`
      );
      console.log(
        `🎯 Total PoS blocks found: ${this.posBlocksFound.toLocaleString()}`
      );
      console.log(
        `💰 Total I-address stakes found: ${this.stakesFound.toLocaleString()}`
      );
      console.log(`⏱️  Total time: ${totalTime.toFixed(0)} seconds`);
    } catch (error) {
      console.error('❌ Scanner failed:', error.message);
    } finally {
      await this.pool.end();
    }
  }
}

// Run the scanner
const scanner = new RobustEarly2022Scanner();
scanner.run().catch(console.error);
