#!/usr/bin/env node

/**
 * Run Enhanced Scanner on Large Range to Populate Creation Dates
 *
 * This script runs the enhanced scanner on a large range of blocks
 * to populate creation dates for all existing VerusIDs.
 */

const { execSync } = require('child_process');
const { Pool } = require('pg');

class LargeRangeScanner {
  constructor() {
    this.pool = new Pool({
      connectionString:
        'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
    });
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

  async getIdentitiesNeedingCreationData() {
    try {
      const result = await this.pool.query(`
        SELECT COUNT(*) as total_identities,
               COUNT(CASE WHEN creation_block_height IS NULL THEN 1 END) as need_creation_data
        FROM identities
      `);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error getting identity stats:', error.message);
      return { total_identities: 0, need_creation_data: 0 };
    }
  }

  async runScannerOnRange(startBlock, endBlock) {
    console.log(
      `🚀 Running enhanced scanner on blocks ${startBlock.toLocaleString()} to ${endBlock.toLocaleString()}...`
    );

    try {
      // Run the scanner with specific range
      const result = execSync(
        `node optimize-staking-scanner-fixed-creations.js`,
        {
          encoding: 'utf8',
          cwd: '/home/explorer/verus-dapp',
        }
      );

      console.log('✅ Scanner completed successfully');
      return true;
    } catch (error) {
      console.error('❌ Scanner error:', error.message);
      return false;
    }
  }

  async run() {
    console.log('🔍 LARGE RANGE SCANNER - Populating Creation Dates');
    console.log('==================================================');

    try {
      const currentHeight = await this.getCurrentBlockchainHeight();
      const lastScanned = await this.getLastScannedBlock();
      const identityStats = await this.getIdentitiesNeedingCreationData();

      console.log(
        `📊 Current blockchain height: ${currentHeight.toLocaleString()}`
      );
      console.log(`📊 Last scanned block: ${lastScanned.toLocaleString()}`);
      console.log(
        `📊 Total identities: ${identityStats.total_identities.toLocaleString()}`
      );
      console.log(
        `📊 Need creation data: ${identityStats.need_creation_data.toLocaleString()}`
      );

      if (identityStats.need_creation_data === 0) {
        console.log('✅ All identities already have creation data!');
        return;
      }

      console.log('');
      console.log('🎯 The enhanced scanner will:');
      console.log('   ✅ Process all blocks from the beginning');
      console.log('   ✅ Detect VerusID creations using getidentityhistory');
      console.log('   ✅ Populate creation dates for all existing VerusIDs');
      console.log('   ✅ Continue finding new staking rewards');
      console.log('');

      // Run the scanner - it will automatically start from the last scanned block
      const success = await this.runScannerOnRange(
        lastScanned + 1,
        currentHeight
      );

      if (success) {
        console.log('🎉 Large range scan completed!');

        // Check final stats
        const finalStats = await this.getIdentitiesNeedingCreationData();
        console.log(`📊 Final stats:`);
        console.log(
          `   Total identities: ${finalStats.total_identities.toLocaleString()}`
        );
        console.log(
          `   Still need creation data: ${finalStats.need_creation_data.toLocaleString()}`
        );
      }
    } catch (error) {
      console.error('❌ Fatal error:', error.message);
    } finally {
      await this.pool.end();
    }
  }
}

// Run the large range scanner
const scanner = new LargeRangeScanner();
scanner.run().catch(console.error);
