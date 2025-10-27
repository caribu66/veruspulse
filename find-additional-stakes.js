#!/usr/bin/env node

const { Pool } = require('pg');
const { execSync } = require('child_process');

class FindAdditionalStakes {
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
    console.log(
      '🚀 FIND ADDITIONAL STAKES - Look for Missing VerusID Addresses'
    );
    console.log('============================================================');
    console.log('');
    console.log(
      '🎯 MISSION: Find additional VerusID stakes in blocks that already have stakes'
    );
    console.log(
      '🔍 METHOD: Check ALL addresses in transaction outputs, not just first one'
    );
    console.log('⚡ FOCUS: December 2020 to current tip');
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
    return (
      block.validationtype === 'stake' ||
      block.posrewarddest !== undefined ||
      block.proofofstake !== undefined ||
      block.blocktype === 'minted'
    );
  }

  async getBlock(blockHeight) {
    try {
      const hash = execSync(
        `/home/explorer/verus-cli/verus getblockhash ${blockHeight}`,
        {
          encoding: 'utf8',
          timeout: 2000,
        }
      ).trim();

      const blockData = execSync(
        `/home/explorer/verus-cli/verus getblock ${hash} 2`,
        {
          encoding: 'utf8',
          timeout: 3000,
        }
      );

      return JSON.parse(blockData);
    } catch (error) {
      return null;
    }
  }

  async extractAllStakesFromBlock(block, blockHeight) {
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

    // Check each output for VerusID addresses
    for (let i = 0; i < coinstake.vout.length; i++) {
      const output = coinstake.vout[i];
      if (!output.scriptPubKey || !output.scriptPubKey.addresses) {
        continue;
      }

      // Check ALL addresses in the output (this is the key fix!)
      for (let j = 0; j < output.scriptPubKey.addresses.length; j++) {
        const address = output.scriptPubKey.addresses[j];

        if (address && address.startsWith('i') && address.length > 20) {
          const exists = await this.verusIDExists(address);
          if (exists) {
            // Check if this specific stake already exists
            const alreadyExists = await this.stakeExists(coinstake.txid, i);
            if (!alreadyExists) {
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

  async stakeExists(txid, vout) {
    try {
      const result = await this.pool.query(
        'SELECT 1 FROM staking_rewards WHERE txid = $1 AND vout = $2 LIMIT 1',
        [txid, vout]
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

        const stakes = await this.extractAllStakesFromBlock(block, blockHeight);
        batchStakes.push(...stakes);

        this.blocksProcessed++;
        processed++;

        // Process in batches
        if (batchStakes.length >= this.batchSize) {
          await this.saveStakes(batchStakes);
          this.stakesFound += batchStakes.length;
          batchStakes = [];
        }

        // Progress update every 10 seconds
        const now = Date.now();
        if (now - lastProgressTime > 10000) {
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
      const startBlock = 1299328; // December 7, 2020

      console.log(
        `📊 Current blockchain height: ${currentHeight.toLocaleString()}`
      );
      console.log(`📊 Start block (Dec 2020): ${startBlock.toLocaleString()}`);
      console.log('');

      // Scan from December 2020 to current tip
      const totalBlocks = currentHeight - startBlock + 1;
      console.log(
        `🎯 SCANNING FOR ADDITIONAL STAKES: ${totalBlocks.toLocaleString()} blocks from ${startBlock.toLocaleString()} to ${currentHeight.toLocaleString()}`
      );
      console.log('');

      await this.scanRange(
        startBlock,
        currentHeight,
        `Additional stakes scan (${totalBlocks.toLocaleString()} blocks)`
      );

      // Final summary
      const totalTime = (Date.now() - this.startTime) / 1000 / 60;
      console.log('╔═══════════════════════════════════════════════╗');
      console.log('║              ADDITIONAL STAKES COMPLETE!    ║');
      console.log('╚═══════════════════════════════════════════════╝');
      console.log(
        `📊 Blocks processed: ${this.blocksProcessed.toLocaleString()}`
      );
      console.log(
        `🎯 Additional stakes found: ${this.stakesFound.toLocaleString()}`
      );
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
const scanner = new FindAdditionalStakes();
scanner.run().catch(console.error);
