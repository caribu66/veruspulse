#!/usr/bin/env node

/**
 * Database Accuracy Verification Script
 * Verifies if all previous scans are actually correct in the database
 */

const { Pool } = require('pg');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const VERUS_CLI_PATH = '/home/explorer/verus-cli/verus';

const pool = new Pool({
  connectionString:
    'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
});

class DatabaseVerifier {
  constructor() {
    this.verificationResults = {
      totalChecks: 0,
      passedChecks: 0,
      failedChecks: 0,
      errors: [],
    };
  }

  async log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : '✅';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async verifyStakeDataIntegrity() {
    await this.log('🔍 VERIFYING STAKE DATA INTEGRITY...', 'info');

    try {
      // Check 1: Verify stake amounts are reasonable
      await this.log(
        '📊 Check 1: Verifying stake amounts are reasonable...',
        'info'
      );
      const stakeAmountResult = await pool.query(`
        SELECT 
          MIN(amount_sats) as min_amount,
          MAX(amount_sats) as max_amount,
          AVG(amount_sats) as avg_amount,
          COUNT(*) as total_stakes
        FROM staking_rewards
      `);

      const { min_amount, max_amount, avg_amount, total_stakes } =
        stakeAmountResult.rows[0];
      const minVRSC = (min_amount / 100000000).toFixed(8);
      const maxVRSC = (max_amount / 100000000).toFixed(8);
      const avgVRSC = (avg_amount / 100000000).toFixed(8);

      await this.log(`   Min stake: ${minVRSC} VRSC`, 'info');
      await this.log(`   Max stake: ${maxVRSC} VRSC`, 'info');
      await this.log(`   Avg stake: ${avgVRSC} VRSC`, 'info');
      await this.log(
        `   Total stakes: ${total_stakes.toLocaleString()}`,
        'info'
      );

      // Check if amounts are reasonable (between 0.1 and 1000 VRSC typically)
      if (min_amount < 10000000 || max_amount > 100000000000) {
        await this.log(`   ⚠️ WARNING: Stake amounts seem unusual`, 'warning');
      } else {
        await this.log(`   ✅ Stake amounts look reasonable`, 'info');
      }
    } catch (error) {
      await this.log(
        `   ❌ Error checking stake amounts: ${error.message}`,
        'error'
      );
    }
  }

  async verifyBlockHeightConsistency() {
    await this.log('🔍 VERIFYING BLOCK HEIGHT CONSISTENCY...', 'info');

    try {
      // Check 2: Verify block heights are sequential and reasonable
      const blockHeightResult = await pool.query(`
        SELECT 
          MIN(block_height) as min_height,
          MAX(block_height) as max_height,
          COUNT(DISTINCT block_height) as unique_heights,
          COUNT(*) as total_records
        FROM staking_rewards
      `);

      const { min_height, max_height, unique_heights, total_records } =
        blockHeightResult.rows[0];

      await this.log(
        `   Min block height: ${min_height.toLocaleString()}`,
        'info'
      );
      await this.log(
        `   Max block height: ${max_height.toLocaleString()}`,
        'info'
      );
      await this.log(
        `   Unique heights: ${unique_heights.toLocaleString()}`,
        'info'
      );
      await this.log(
        `   Total records: ${total_records.toLocaleString()}`,
        'info'
      );

      // Check for gaps in block heights
      const gapsResult = await pool.query(`
        WITH height_analysis AS (
          SELECT 
            block_height,
            LAG(block_height) OVER (ORDER BY block_height) as prev_height
          FROM (
            SELECT DISTINCT block_height 
            FROM staking_rewards 
            ORDER BY block_height
          ) heights
        )
        SELECT COUNT(*) as gap_count
        FROM height_analysis 
        WHERE prev_height IS NOT NULL AND block_height - prev_height > 1
      `);

      const gapCount = gapsResult.rows[0].gap_count;
      if (gapCount > 0) {
        await this.log(
          `   ⚠️ WARNING: Found ${gapCount} gaps in block heights`,
          'warning'
        );
      } else {
        await this.log(`   ✅ Block heights are consistent`, 'info');
      }
    } catch (error) {
      await this.log(
        `   ❌ Error checking block heights: ${error.message}`,
        'error'
      );
    }
  }

  async verifyTimestampConsistency() {
    await this.log('🔍 VERIFYING TIMESTAMP CONSISTENCY...', 'info');

    try {
      // Check 3: Verify timestamps are reasonable and sequential
      const timestampResult = await pool.query(`
        SELECT 
          MIN(block_time) as earliest_time,
          MAX(block_time) as latest_time,
          COUNT(*) as total_records
        FROM staking_rewards
      `);

      const { earliest_time, latest_time, total_records } =
        timestampResult.rows[0];

      await this.log(`   Earliest stake: ${earliest_time}`, 'info');
      await this.log(`   Latest stake: ${latest_time}`, 'info');
      await this.log(
        `   Total records: ${total_records.toLocaleString()}`,
        'info'
      );

      // Check for future timestamps
      const futureTimestampResult = await pool.query(`
        SELECT COUNT(*) as future_count
        FROM staking_rewards 
        WHERE block_time > NOW()
      `);

      const futureCount = futureTimestampResult.rows[0].future_count;
      if (futureCount > 0) {
        await this.log(
          `   ⚠️ WARNING: Found ${futureCount} records with future timestamps`,
          'warning'
        );
      } else {
        await this.log(`   ✅ All timestamps are in the past`, 'info');
      }
    } catch (error) {
      await this.log(
        `   ❌ Error checking timestamps: ${error.message}`,
        'error'
      );
    }
  }

  async verifyIdentityConsistency() {
    await this.log('🔍 VERIFYING IDENTITY CONSISTENCY...', 'info');

    try {
      // Check 4: Verify all identity_addresses exist in identities table
      const orphanedStakesResult = await pool.query(`
        SELECT COUNT(*) as orphaned_count
        FROM staking_rewards sr
        LEFT JOIN identities i ON sr.identity_address = i.identity_address
        WHERE i.identity_address IS NULL
      `);

      const orphanedCount = orphanedStakesResult.rows[0].orphaned_count;
      if (orphanedCount > 0) {
        await this.log(
          `   ⚠️ WARNING: Found ${orphanedCount} stakes with missing identities`,
          'warning'
        );
      } else {
        await this.log(`   ✅ All stakes have valid identities`, 'info');
      }

      // Check identity count vs stake count
      const identityCountResult = await pool.query(`
        SELECT COUNT(DISTINCT identity_address) as unique_identities
        FROM staking_rewards
      `);

      const uniqueIdentities = identityCountResult.rows[0].unique_identities;
      await this.log(
        `   Unique identities in stakes: ${uniqueIdentities.toLocaleString()}`,
        'info'
      );
    } catch (error) {
      await this.log(
        `   ❌ Error checking identities: ${error.message}`,
        'error'
      );
    }
  }

  async verifyTransactionIntegrity() {
    await this.log('🔍 VERIFYING TRANSACTION INTEGRITY...', 'info');

    try {
      // Check 5: Verify transaction IDs are valid format
      const invalidTxidResult = await pool.query(`
        SELECT COUNT(*) as invalid_count
        FROM staking_rewards 
        WHERE txid !~ '^[a-fA-F0-9]{64}$'
      `);

      const invalidCount = invalidTxidResult.rows[0].invalid_count;
      if (invalidCount > 0) {
        await this.log(
          `   ⚠️ WARNING: Found ${invalidCount} invalid transaction IDs`,
          'warning'
        );
      } else {
        await this.log(`   ✅ All transaction IDs are valid format`, 'info');
      }

      // Check for duplicate transactions
      const duplicateTxResult = await pool.query(`
        SELECT COUNT(*) as duplicate_count
        FROM (
          SELECT txid, COUNT(*) as count
          FROM staking_rewards
          GROUP BY txid
          HAVING COUNT(*) > 1
        ) duplicates
      `);

      const duplicateCount = duplicateTxResult.rows[0].duplicate_count;
      if (duplicateCount > 0) {
        await this.log(
          `   ⚠️ WARNING: Found ${duplicateCount} duplicate transactions`,
          'warning'
        );
      } else {
        await this.log(`   ✅ No duplicate transactions found`, 'info');
      }
    } catch (error) {
      await this.log(
        `   ❌ Error checking transactions: ${error.message}`,
        'error'
      );
    }
  }

  async verifyAgainstBlockchain() {
    await this.log('🔍 VERIFYING AGAINST BLOCKCHAIN...', 'info');

    try {
      // Get current blockchain height
      const { stdout } = await execPromise(
        `${VERUS_CLI_PATH} getblockchaininfo`
      );
      const blockchainInfo = JSON.parse(stdout);
      const currentHeight = blockchainInfo.blocks;

      await this.log(
        `   Current blockchain height: ${currentHeight.toLocaleString()}`,
        'info'
      );

      // Check database coverage
      const dbCoverageResult = await pool.query(`
        SELECT MAX(block_height) as max_db_height
        FROM staking_rewards
      `);

      const maxDbHeight = dbCoverageResult.rows[0].max_db_height;
      const coveragePercent = (maxDbHeight / currentHeight) * 100;

      await this.log(
        `   Database max height: ${maxDbHeight.toLocaleString()}`,
        'info'
      );
      await this.log(`   Coverage: ${coveragePercent.toFixed(1)}%`, 'info');

      if (coveragePercent > 90) {
        await this.log(`   ✅ Excellent coverage!`, 'info');
      } else if (coveragePercent > 75) {
        await this.log(`   ⚠️ Good coverage, but could be better`, 'warning');
      } else {
        await this.log(
          `   ⚠️ Low coverage - scan may be incomplete`,
          'warning'
        );
      }
    } catch (error) {
      await this.log(
        `   ❌ Error checking against blockchain: ${error.message}`,
        'error'
      );
    }
  }

  async runVerification() {
    console.log('🔍 VERUS DATABASE ACCURACY VERIFICATION');
    console.log('========================================\n');

    await this.verifyStakeDataIntegrity();
    console.log('');

    await this.verifyBlockHeightConsistency();
    console.log('');

    await this.verifyTimestampConsistency();
    console.log('');

    await this.verifyIdentityConsistency();
    console.log('');

    await this.verifyTransactionIntegrity();
    console.log('');

    await this.verifyAgainstBlockchain();
    console.log('');

    await this.log('🎉 VERIFICATION COMPLETE!', 'info');

    await pool.end();
  }
}

const verifier = new DatabaseVerifier();
verifier.runVerification();
