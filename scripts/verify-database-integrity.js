#!/usr/bin/env node
/**
 * Database Integrity Verification Script
 * Validates data consistency and foreign key relationships
 */

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

async function verifyIntegrity() {
  console.log(`${colors.cyan}${colors.bold}
╔═══════════════════════════════════════════════════════╗
║      DATABASE INTEGRITY CHECK - Verus Explorer        ║
╚═══════════════════════════════════════════════════════╝${colors.reset}\n`);

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const issues = [];

  try {
    // 1. Check Foreign Key Integrity
    console.log(
      `${colors.bold}1. Checking Foreign Key Integrity...${colors.reset}`
    );

    // Check staking_rewards -> identities
    const orphanedRewardsQuery = `
      SELECT COUNT(*) as count 
      FROM staking_rewards sr
      WHERE NOT EXISTS (
        SELECT 1 FROM identities i WHERE i.identity_address = sr.identity_address
      )
    `;
    const orphanedRewards = await pool.query(orphanedRewardsQuery);
    const orphanCount = parseInt(orphanedRewards.rows[0].count);

    if (orphanCount === 0) {
      console.log(
        `${colors.green}   ✓ All staking rewards reference valid identities${colors.reset}`
      );
    } else {
      console.log(
        `${colors.yellow}   ⚠️  ${orphanCount} orphaned staking rewards${colors.reset}`
      );
      issues.push(`${orphanCount} orphaned staking rewards`);
    }

    // Check verusid_achievements -> identities
    const orphanedAchievements = await pool.query(`
      SELECT COUNT(*) as count 
      FROM verusid_achievements va
      WHERE NOT EXISTS (
        SELECT 1 FROM identities i WHERE i.identity_address = va.identity_address
      )
    `);
    const orphanAchCount = parseInt(orphanedAchievements.rows[0].count);

    if (orphanAchCount === 0) {
      console.log(
        `${colors.green}   ✓ All achievements reference valid identities${colors.reset}`
      );
    } else {
      console.log(
        `${colors.yellow}   ⚠️  ${orphanAchCount} orphaned achievements${colors.reset}`
      );
      issues.push(`${orphanAchCount} orphaned achievements`);
    }

    // 2. Check Data Consistency
    console.log(
      `\n${colors.bold}2. Checking Data Consistency...${colors.reset}`
    );

    // Check for duplicate identities
    const duplicatesQuery = `
      SELECT identity_address, COUNT(*) as count
      FROM identities
      GROUP BY identity_address
      HAVING COUNT(*) > 1
    `;
    const duplicates = await pool.query(duplicatesQuery);

    if (duplicates.rows.length === 0) {
      console.log(`${colors.green}   ✓ No duplicate identities${colors.reset}`);
    } else {
      console.log(
        `${colors.red}   ✗ ${duplicates.rows.length} duplicate identities found${colors.reset}`
      );
      issues.push(`${duplicates.rows.length} duplicate identities`);
    }

    // Check for negative reward amounts
    const negativeRewardsQuery = `
      SELECT COUNT(*) as count 
      FROM staking_rewards 
      WHERE amount_sats < 0
    `;
    const negativeRewards = await pool.query(negativeRewardsQuery);
    const negCount = parseInt(negativeRewards.rows[0].count);

    if (negCount === 0) {
      console.log(
        `${colors.green}   ✓ No negative reward amounts${colors.reset}`
      );
    } else {
      console.log(
        `${colors.red}   ✗ ${negCount} negative reward amounts${colors.reset}`
      );
      issues.push(`${negCount} negative rewards`);
    }

    // Check for null timestamps
    const nullTimestampsQuery = `
      SELECT COUNT(*) as count 
      FROM staking_rewards 
      WHERE block_time IS NULL
    `;
    const nullTimestamps = await pool.query(nullTimestampsQuery);
    const nullCount = parseInt(nullTimestamps.rows[0].count);

    if (nullCount === 0) {
      console.log(
        `${colors.green}   ✓ No null timestamps in staking data${colors.reset}`
      );
    } else {
      console.log(
        `${colors.yellow}   ⚠️  ${nullCount} rows with null timestamps${colors.reset}`
      );
      issues.push(`${nullCount} null timestamps`);
    }

    // 3. Check Index Usage
    console.log(
      `\n${colors.bold}3. Checking Index Efficiency...${colors.reset}`
    );
    const unusedIndexesQuery = `
      SELECT schemaname, relname as tablename, indexrelname as indexname
      FROM pg_stat_user_indexes
      WHERE idx_scan = 0 AND schemaname = 'public'
      ORDER BY pg_relation_size(indexrelid) DESC
      LIMIT 5
    `;
    const unusedIndexes = await pool.query(unusedIndexesQuery);

    if (unusedIndexes.rows.length === 0) {
      console.log(
        `${colors.green}   ✓ All indexes are being used${colors.reset}`
      );
    } else {
      console.log(
        `${colors.yellow}   ⚠️  ${unusedIndexes.rows.length} unused indexes found (may be ok for new database)${colors.reset}`
      );
      unusedIndexes.rows.forEach(idx => {
        console.log(
          `${colors.yellow}      • ${idx.tablename}.${idx.indexname}${colors.reset}`
        );
      });
    }

    // 4. Check Table Bloat
    console.log(
      `\n${colors.bold}4. Checking Table Statistics...${colors.reset}`
    );
    const tableStatsQuery = `
      SELECT 
        schemaname,
        relname as tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||relname)) AS size,
        n_live_tup as live_rows,
        n_dead_tup as dead_rows
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(schemaname||'.'||relname) DESC
      LIMIT 5
    `;
    const tableStats = await pool.query(tableStatsQuery);

    console.log(`${colors.cyan}   Top 5 Largest Tables:${colors.reset}`);
    tableStats.rows.forEach(table => {
      const deadRatio =
        table.live_rows > 0
          ? ((table.dead_rows / table.live_rows) * 100).toFixed(1)
          : 0;
      console.log(
        `${colors.cyan}   • ${table.tablename}: ${table.size} (${parseInt(table.live_rows).toLocaleString()} rows, ${deadRatio}% dead)${colors.reset}`
      );

      if (deadRatio > 20) {
        console.log(
          `${colors.yellow}      ⚠️  Consider running VACUUM ANALYZE${colors.reset}`
        );
      }
    });

    // 5. Check Recent Activity
    console.log(
      `\n${colors.bold}5. Checking Recent Activity...${colors.reset}`
    );
    const recentActivityQuery = `
      SELECT 
        DATE(block_time) as stake_date,
        COUNT(*) as stakes,
        SUM(amount_sats) / 100000000.0 as total_vrsc
      FROM staking_rewards
      WHERE block_time > NOW() - INTERVAL '7 days'
      GROUP BY DATE(block_time)
      ORDER BY stake_date DESC
    `;
    const recentActivity = await pool.query(recentActivityQuery);

    if (recentActivity.rows.length > 0) {
      console.log(
        `${colors.cyan}   Recent Staking Activity (Last 7 Days):${colors.reset}`
      );
      recentActivity.rows.forEach(day => {
        console.log(
          `${colors.green}   • ${day.stake_date.toISOString().split('T')[0]}: ${day.stakes} stakes (${parseFloat(day.total_vrsc).toFixed(2)} VRSC)${colors.reset}`
        );
      });
    } else {
      console.log(
        `${colors.yellow}   ℹ️  No recent staking activity in the last 7 days${colors.reset}`
      );
    }

    // Summary
    console.log(
      `\n${colors.bold}═══════════════════════════════════════════════════════${colors.reset}`
    );
    if (issues.length === 0) {
      console.log(`${colors.green}${colors.bold}
✓ DATABASE INTEGRITY: PERFECT
  All checks passed successfully!${colors.reset}\n`);
    } else {
      console.log(`${colors.yellow}${colors.bold}
⚠️  DATABASE INTEGRITY: NEEDS ATTENTION
  Found ${issues.length} issue(s):${colors.reset}`);
      issues.forEach(issue =>
        console.log(`${colors.yellow}  • ${issue}${colors.reset}`)
      );
      console.log();
    }

    await pool.end();
    process.exit(issues.length > 0 ? 1 : 0);
  } catch (error) {
    console.error(
      `\n${colors.red}${colors.bold}Error running integrity checks:${colors.reset}`
    );
    console.error(`${colors.red}${error.message}${colors.reset}\n`);
    await pool.end();
    process.exit(1);
  }
}

verifyIntegrity();
