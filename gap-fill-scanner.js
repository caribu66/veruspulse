#!/usr/bin/env node

const { Pool } = require('pg');
const { execSync } = require('child_process');

class GapFillScanner {
  constructor(startBlock, endBlock) {
    this.pool = new Pool({
      connectionString:
        'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
      max: 5,
    });

    this.startBlock = startBlock;
    this.endBlock = endBlock;
    this.stakesFound = 0;
    this.creationsFound = 0;
    this.blocksProcessed = 0;
    this.startTime = Date.now();
    this.batchSize = 50;
    this.delayBetweenBatches = 1000;
  }

  async initialize() {
    console.log('🔧 GAP FILL SCANNER - Filling Missing VerusID Stakes');
    console.log('==================================================');
    console.log(`📅 Scanning blocks ${this.startBlock} to ${this.endBlock}`);
    console.log(
      `📊 Total blocks to scan: ${this.endBlock - this.startBlock + 1}`
    );
    console.log('');
  }

  async isProofOfStakeBlock(block) {
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

  async extractStakingRewards(block, blockHeight) {
    try {
      if (!this.isProofOfStakeBlock(block)) {
        return [];
      }

      const stakes = [];

      if (block.tx && block.tx.length > 0) {
        const coinstakeTxid = block.tx[0];

        // Get the full transaction data
        const coinstakeTx = await this.getTransaction(coinstakeTxid);
        if (!coinstakeTx) return [];

        if (coinstakeTx.vout && coinstakeTx.vout.length > 0) {
          for (const vout of coinstakeTx.vout) {
            if (
              vout.scriptPubKey?.addresses &&
              vout.scriptPubKey.addresses.length > 0
            ) {
              for (const address of vout.scriptPubKey.addresses) {
                if (address && address.startsWith('i') && address.length > 20) {
                  stakes.push({
                    identityAddress: address,
                    amount: vout.value || 0,
                    blockHeight: blockHeight,
                    blockTime: block.time,
                    txid: coinstakeTxid,
                    vout: vout.n || 0,
                  });
                }
              }
            }
          }
        }
      }

      return stakes;
    } catch (error) {
      console.error(
        `❌ Error extracting stakes from block ${blockHeight}:`,
        error.message
      );
      return [];
    }
  }

  async saveStakingRewards(stakes) {
    if (stakes.length === 0) return;

    try {
      const values = stakes
        .map(
          stake =>
            `('${stake.identityAddress}', ${stake.amount * 100000000}, ${stake.blockHeight}, to_timestamp(${stake.blockTime}), '${stake.txid}', ${stake.vout}, 'staking_reward', '${stake.identityAddress}')`
        )
        .join(',');

      const query = `
        INSERT INTO staking_rewards (identity_address, amount_sats, block_height, block_time, txid, vout, classifier, source_address)
        VALUES ${values}
        ON CONFLICT (txid, vout) DO NOTHING
      `;

      await this.pool.query(query);
      this.stakesFound += stakes.length;
    } catch (error) {
      console.error('❌ Error saving stakes:', error.message);
    }
  }

  async getBlock(blockHeight) {
    try {
      const blockHash = execSync(
        `/home/explorer/verus-cli/verus getblockhash ${blockHeight}`,
        { encoding: 'utf8' }
      ).trim();
      const blockData = execSync(
        `/home/explorer/verus-cli/verus getblock ${blockHash}`,
        { encoding: 'utf8' }
      );
      return JSON.parse(blockData);
    } catch (error) {
      console.error(`❌ Error getting block ${blockHeight}:`, error.message);
      return null;
    }
  }

  async getTransaction(txid) {
    try {
      const txData = execSync(
        `/home/explorer/verus-cli/verus getrawtransaction ${txid} 1`,
        { encoding: 'utf8' }
      );
      return JSON.parse(txData);
    } catch (error) {
      console.error(`❌ Error getting transaction ${txid}:`, error.message);
      return null;
    }
  }

  async scanBlocks() {
    console.log(`🔍 Scanning blocks ${this.startBlock} to ${this.endBlock}...`);

    for (
      let blockHeight = this.startBlock;
      blockHeight <= this.endBlock;
      blockHeight += this.batchSize
    ) {
      const batchEnd = Math.min(
        blockHeight + this.batchSize - 1,
        this.endBlock
      );

      console.log(`📊 Processing blocks ${blockHeight} to ${batchEnd}...`);

      for (
        let currentBlock = blockHeight;
        currentBlock <= batchEnd;
        currentBlock++
      ) {
        try {
          const block = await this.getBlock(currentBlock);
          if (block) {
            const stakes = await this.extractStakingRewards(
              block,
              currentBlock
            );
            if (stakes.length > 0) {
              console.log(
                `   🎯 Block ${currentBlock}: Found ${stakes.length} stake(s)`
              );
              for (const stake of stakes) {
                console.log(
                  `      💰 ${stake.identityAddress}: ${stake.amount} VRSC`
                );
              }
              await this.saveStakingRewards(stakes);
            }
          }
          this.blocksProcessed++;
        } catch (error) {
          console.error(
            `❌ Error processing block ${currentBlock}:`,
            error.message
          );
        }
      }

      // Progress update
      const progress = (
        ((blockHeight - this.startBlock + this.batchSize) /
          (this.endBlock - this.startBlock + 1)) *
        100
      ).toFixed(1);
      const elapsed = (Date.now() - this.startTime) / 1000 / 60;
      const speed = this.blocksProcessed / elapsed;
      const remaining = (this.endBlock - blockHeight) / speed;

      console.log(
        `📊 Progress: ${blockHeight}/${this.endBlock} blocks (${progress}%)`
      );
      console.log(`   🎯 Stakes found: ${this.stakesFound}`);
      console.log(`   ⚡ Speed: ${speed.toFixed(2)} blocks/sec`);
      console.log(`   ⏱️  ETA: ${remaining.toFixed(1)} minutes`);
      console.log('');

      // Delay between batches
      if (blockHeight + this.batchSize <= this.endBlock) {
        await new Promise(resolve =>
          setTimeout(resolve, this.delayBetweenBatches)
        );
      }
    }
  }

  async run() {
    try {
      await this.initialize();
      await this.scanBlocks();

      const totalTime = (Date.now() - this.startTime) / 1000 / 60;

      console.log('');
      console.log('╔═══════════════════════════════════════════════╗');
      console.log('║              GAP FILL COMPLETE!              ║');
      console.log('╚═══════════════════════════════════════════════╝');
      console.log(`📊 Blocks processed: ${this.blocksProcessed}`);
      console.log(`🎯 Stakes found: ${this.stakesFound}`);
      console.log(`⏱️  Total time: ${totalTime.toFixed(1)} minutes`);
      console.log(
        `🚀 Speed: ${(this.blocksProcessed / totalTime).toFixed(2)} blocks/sec`
      );
    } catch (error) {
      console.error('❌ Scanner error:', error);
    } finally {
      await this.pool.end();
    }
  }
}

// Get command line arguments
const args = process.argv.slice(2);
const startBlock = parseInt(args[0]) || 1300000;
const endBlock = parseInt(args[1]) || 1431007;

console.log(`🚀 Starting gap fill from block ${startBlock} to ${endBlock}`);

const scanner = new GapFillScanner(startBlock, endBlock);
scanner.run().catch(console.error);
