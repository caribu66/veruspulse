#!/usr/bin/env node

const { Pool } = require('pg');
const { execSync } = require('child_process');

class StakingCoverageChecker {
  constructor() {
    this.pool = new Pool({
      connectionString:
        'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
    });

    this.december2020Block = 1299328; // December 7, 2020
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

  async getTotalStakes() {
    try {
      const result = await this.pool.query(
        'SELECT COUNT(*) as count FROM staking_rewards'
      );
      return parseInt(result.rows[0].count);
    } catch (error) {
      console.error('❌ Error getting total stakes:', error.message);
      return 0;
    }
  }

  async checkCoverageInRange(startBlock, endBlock) {
    try {
      const result = await this.pool.query(
        `
        SELECT COUNT(*) as count, 
               MIN(block_height) as min_block, 
               MAX(block_height) as max_block
        FROM staking_rewards 
        WHERE block_height >= $1 AND block_height <= $2
      `,
        [startBlock, endBlock]
      );

      return {
        count: parseInt(result.rows[0].count),
        minBlock: result.rows[0].min_block,
        maxBlock: result.rows[0].max_block,
        coverage: result.rows[0].count > 0 ? 'YES' : 'NO',
      };
    } catch (error) {
      console.error('❌ Error checking coverage:', error.message);
      return null;
    }
  }

  async checkCoverageGaps(startBlock, endBlock, windowSize = 10000) {
    try {
      const gaps = [];
      let currentBlock = startBlock;

      while (currentBlock < endBlock) {
        const windowEnd = Math.min(currentBlock + windowSize - 1, endBlock);

        const result = await this.pool.query(
          `
          SELECT COUNT(*) as count
          FROM staking_rewards 
          WHERE block_height >= $1 AND block_height <= $2
        `,
          [currentBlock, windowEnd]
        );

        const hasData = parseInt(result.rows[0].count) > 0;

        if (!hasData) {
          gaps.push({
            start: currentBlock,
            end: windowEnd,
            size: windowEnd - currentBlock + 1,
          });
        }

        currentBlock = windowEnd + 1;
      }

      return gaps;
    } catch (error) {
      console.error('❌ Error checking coverage gaps:', error.message);
      return [];
    }
  }

  async run() {
    try {
      console.log(
        '╔═══════════════════════════════════════════════════════════════╗'
      );
      console.log(
        '║     STAKING COVERAGE CHECK: December 2020 to Current Tip     ║'
      );
      console.log(
        '╚═══════════════════════════════════════════════════════════════╝'
      );
      console.log('');

      // Get current blockchain height
      const currentHeight = await this.getCurrentBlockchainHeight();
      console.log(
        `📊 Current blockchain height: ${currentHeight.toLocaleString()}`
      );
      console.log(
        `📊 December 2020 block: ${this.december2020Block.toLocaleString()}`
      );
      console.log(
        `📊 Expected coverage range: ${this.december2020Block.toLocaleString()} to ${currentHeight.toLocaleString()}`
      );
      console.log(
        `📊 Expected blocks to cover: ${(currentHeight - this.december2020Block + 1).toLocaleString()}`
      );
      console.log('');

      // Get database coverage
      const firstScannedBlock = await this.getFirstScannedBlock();
      const lastScannedBlock = await this.getLastScannedBlock();
      const totalStakes = await this.getTotalStakes();

      console.log('📊 DATABASE STATISTICS:');
      console.log(
        `   First scanned block: ${firstScannedBlock.toLocaleString()}`
      );
      console.log(
        `   Last scanned block: ${lastScannedBlock.toLocaleString()}`
      );
      console.log(
        `   Total stakes in database: ${totalStakes.toLocaleString()}`
      );
      console.log('');

      // Check if we have December 2020 coverage
      if (firstScannedBlock > this.december2020Block) {
        console.log('❌ COVERAGE GAP DETECTED:');
        console.log(
          `   Database starts at block ${firstScannedBlock.toLocaleString()}`
        );
        console.log(
          `   December 2020 starts at block ${this.december2020Block.toLocaleString()}`
        );
        console.log(
          `   Missing blocks: ${(firstScannedBlock - this.december2020Block).toLocaleString()}`
        );
        console.log('');
        console.log('🔧 ACTION REQUIRED:');
        console.log(
          `   Need to scan blocks ${this.december2020Block.toLocaleString()} to ${(firstScannedBlock - 1).toLocaleString()}`
        );
      } else if (
        firstScannedBlock <= this.december2020Block &&
        lastScannedBlock >= currentHeight
      ) {
        console.log('✅ COMPLETE COVERAGE:');
        console.log(
          `   ✅ December 2020 covered: YES (starts at ${firstScannedBlock.toLocaleString()})`
        );
        console.log(
          `   ✅ Current tip covered: YES (ends at ${lastScannedBlock.toLocaleString()})`
        );
      } else if (lastScannedBlock < currentHeight) {
        console.log('⚠️  PARTIAL COVERAGE:');
        if (firstScannedBlock <= this.december2020Block) {
          console.log(
            `   ✅ December 2020 covered: YES (starts at ${firstScannedBlock.toLocaleString()})`
          );
        } else {
          console.log(
            `   ❌ December 2020 covered: NO (starts at ${firstScannedBlock.toLocaleString()})`
          );
        }
        console.log(
          `   ⚠️  Current tip covered: NO (ends at ${lastScannedBlock.toLocaleString()}, need to reach ${currentHeight.toLocaleString()})`
        );
        console.log(
          `   Missing blocks: ${(currentHeight - lastScannedBlock).toLocaleString()}`
        );
      }

      console.log('');

      // Check specific December 2020 range
      const decemberCoverage = await this.checkCoverageInRange(
        this.december2020Block,
        this.december2020Block + 10000
      );
      console.log('📅 DECEMBER 2020 SPECIFIC CHECK (first 10,000 blocks):');
      console.log(
        `   Stakes found: ${decemberCoverage.count.toLocaleString()}`
      );
      console.log(`   Coverage: ${decemberCoverage.coverage}`);
      if (decemberCoverage.minBlock) {
        console.log(
          `   Blocks covered: ${decemberCoverage.minBlock.toLocaleString()} to ${decemberCoverage.maxBlock.toLocaleString()}`
        );
      }

      console.log('');

      // Check for gaps in coverage
      console.log('🔍 CHECKING FOR COVERAGE GAPS...');
      const gaps = await this.checkCoverageGaps(
        firstScannedBlock,
        lastScannedBlock,
        10000
      );

      if (gaps.length === 0) {
        console.log('✅ No significant gaps detected in scanned range');
      } else {
        console.log(`⚠️  Found ${gaps.length} potential gaps:`);
        gaps.forEach((gap, idx) => {
          console.log(
            `   Gap ${idx + 1}: Blocks ${gap.start.toLocaleString()} to ${gap.end.toLocaleString()} (${gap.size.toLocaleString()} blocks)`
          );
        });
      }

      console.log('');

      // Summary
      console.log(
        '╔═══════════════════════════════════════════════════════════════╗'
      );
      console.log(
        '║                         SUMMARY                               ║'
      );
      console.log(
        '╚═══════════════════════════════════════════════════════════════╝'
      );

      const hasDecemberCoverage = firstScannedBlock <= this.december2020Block;
      const hasCurrentCoverage = lastScannedBlock >= currentHeight;

      if (hasDecemberCoverage && hasCurrentCoverage) {
        console.log('✅ Status: COMPLETE COVERAGE');
        console.log('   ✅ December 2020 to current tip fully covered');
      } else if (!hasDecemberCoverage && !hasCurrentCoverage) {
        console.log('❌ Status: INCOMPLETE COVERAGE');
        console.log('   ❌ Missing December 2020 coverage');
        console.log('   ❌ Missing recent block coverage');
      } else if (!hasDecemberCoverage) {
        console.log('⚠️  Status: PARTIAL COVERAGE');
        console.log('   ❌ Missing December 2020 coverage');
        console.log('   ✅ Current tip covered');
      } else {
        console.log('⚠️  Status: PARTIAL COVERAGE');
        console.log('   ✅ December 2020 covered');
        console.log('   ❌ Missing recent block coverage');
      }
    } catch (error) {
      console.error('\n❌ Fatal error:', error.message);
      process.exit(1);
    } finally {
      await this.pool.end();
    }
  }
}

// Run the coverage checker
const checker = new StakingCoverageChecker();
checker.run().catch(console.error);
