#!/usr/bin/env node

/**
 * Fix PoW Stakes Script
 * Removes PoW block rewards that were incorrectly marked as staking rewards
 */

const { Pool } = require('pg');
const { execSync } = require('child_process');

const DB_CONN =
  process.env.DATABASE_URL ||
  'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db';

const pool = new Pool({
  connectionString: DB_CONN,
  max: 1,
});

async function getBlockType(blockHeight) {
  try {
    const hash = execSync(
      `/home/explorer/verus-cli/verus getblockhash ${blockHeight}`,
      { encoding: 'utf8' }
    ).trim();
    const blockStr = execSync(
      `/home/explorer/verus-cli/verus getblock ${hash} 2`,
      { encoding: 'utf8' }
    );
    const block = JSON.parse(blockStr);
    return {
      blocktype: block.blocktype,
      validationtype: block.validationtype,
      isPos: block.validationtype === 'stake',
    };
  } catch (error) {
    console.error(`Error checking block ${blockHeight}:`, error.message);
    return null;
  }
}

async function fixPowStakes() {
  try {
    console.log('🔍 Finding all staking rewards in the database...');

    const result = await pool.query(`
      SELECT DISTINCT block_height
      FROM staking_rewards
      ORDER BY block_height
    `);

    const blocks = result.rows;
    console.log(`Found ${blocks.length} unique blocks with staking rewards\n`);

    let powBlocksFound = 0;
    let deletedRewards = 0;
    let checked = 0;

    for (const row of blocks) {
      const blockHeight = row.block_height;

      // Check every 100th block
      if (checked % 100 === 0) {
        console.log(
          `Checking block ${blockHeight} (${checked}/${blocks.length})...`
        );
      }
      checked++;

      const blockInfo = await getBlockType(blockHeight);

      if (!blockInfo) {
        continue;
      }

      if (!blockInfo.isPos) {
        // This is a PoW block, not PoS!
        powBlocksFound++;

        // Get rewards from this block
        const rewards = await pool.query(
          'SELECT id, identity_address, amount_sats, block_height FROM staking_rewards WHERE block_height = $1',
          [blockHeight]
        );

        if (rewards.rows.length > 0) {
          console.log(
            `\n❌ Block ${blockHeight} is PoW (${blockInfo.blocktype}), but has ${rewards.rows.length} "staking" rewards`
          );
          console.log(`   Deleting these rewards...`);

          // Delete them
          const deleteResult = await pool.query(
            'DELETE FROM staking_rewards WHERE block_height = $1',
            [blockHeight]
          );

          deletedRewards += deleteResult.rowCount;
          console.log(
            `   ✅ Deleted ${deleteResult.rowCount} rewards from block ${blockHeight}\n`
          );
        }
      }
    }

    console.log(
      '\n╔═══════════════════════════════════════════════════════════╗'
    );
    console.log(
      '║              FIX SUMMARY                                  ║'
    );
    console.log(
      '╚═══════════════════════════════════════════════════════════╝'
    );
    console.log(`Total blocks checked: ${checked}`);
    console.log(`PoW blocks found: ${powBlocksFound}`);
    console.log(`Rewards deleted: ${deletedRewards}`);
    console.log('');

    // Update stats
    console.log('🔄 Updating statistics...');
    const statsResult = await pool.query(`
      DELETE FROM verusid_statistics;
      
      INSERT INTO verusid_statistics (address, total_stakes, total_rewards_satoshis, last_stake_time)
      SELECT 
        identity_address,
        COUNT(*) as total_stakes,
        SUM(amount_sats) as total_rewards_satoshis,
        MAX(block_time) as last_stake_time
      FROM staking_rewards
      GROUP BY identity_address;
    `);

    console.log('✅ Statistics updated!');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

fixPowStakes().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
