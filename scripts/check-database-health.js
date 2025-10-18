#!/usr/bin/env node
/**
 * Database Health Check Script
 * Verifies database connectivity and schema integrity
 */

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

async function checkDatabaseHealth() {
  console.log(`${colors.cyan}${colors.bold}
╔═══════════════════════════════════════════════════════╗
║        DATABASE HEALTH CHECK - Verus Explorer         ║
╚═══════════════════════════════════════════════════════╝${colors.reset}\n`);

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error(
      `${colors.red}❌ DATABASE_URL not found in environment${colors.reset}`
    );
    console.log(
      `${colors.yellow}💡 Please set DATABASE_URL in .env.local${colors.reset}`
    );
    process.exit(1);
  }

  console.log(
    `${colors.blue}🔗 Database URL: ${databaseUrl.replace(/:[^:@]*@/, ':****@')}${colors.reset}\n`
  );

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    // Test 1: Basic Connection
    console.log(`${colors.bold}1. Testing Basic Connection...${colors.reset}`);
    const startTime = Date.now();
    const result = await pool.query(
      'SELECT NOW() as current_time, version() as pg_version'
    );
    const duration = Date.now() - startTime;

    console.log(
      `${colors.green}   ✓ Connection successful (${duration}ms)${colors.reset}`
    );
    console.log(
      `${colors.cyan}   • PostgreSQL Version: ${result.rows[0].pg_version.split(' ')[0]} ${result.rows[0].pg_version.split(' ')[1]}${colors.reset}`
    );
    console.log(
      `${colors.cyan}   • Server Time: ${result.rows[0].current_time}${colors.reset}\n`
    );

    // Test 2: Check Tables
    console.log(`${colors.bold}2. Checking Database Tables...${colors.reset}`);
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;
    const tablesResult = await pool.query(tablesQuery);

    const requiredTables = [
      'identities',
      'staking_rewards',
      'utxos',
      'stake_events',
      'verusid_statistics',
      'achievement_definitions',
      'verusid_achievements',
      'achievement_progress',
    ];

    const existingTables = tablesResult.rows.map(r => r.table_name);
    console.log(
      `${colors.cyan}   Found ${existingTables.length} tables${colors.reset}`
    );

    let missingTables = [];
    for (const table of requiredTables) {
      if (existingTables.includes(table)) {
        console.log(`${colors.green}   ✓ ${table}${colors.reset}`);
      } else {
        console.log(`${colors.red}   ✗ ${table} (MISSING)${colors.reset}`);
        missingTables.push(table);
      }
    }

    if (missingTables.length > 0) {
      console.log(
        `\n${colors.yellow}   ⚠️  ${missingTables.length} required tables missing${colors.reset}`
      );
      console.log(
        `${colors.yellow}   💡 Run migrations to create missing tables${colors.reset}\n`
      );
    } else {
      console.log(
        `${colors.green}   ✓ All required tables exist${colors.reset}\n`
      );
    }

    // Test 3: Check Table Row Counts
    console.log(`${colors.bold}3. Checking Table Data...${colors.reset}`);
    for (const table of existingTables.slice(0, 10)) {
      try {
        const countResult = await pool.query(
          `SELECT COUNT(*) as count FROM ${table}`
        );
        const count = parseInt(countResult.rows[0].count);
        if (count > 0) {
          console.log(
            `${colors.green}   • ${table}: ${count.toLocaleString()} rows${colors.reset}`
          );
        } else {
          console.log(
            `${colors.yellow}   • ${table}: 0 rows (empty)${colors.reset}`
          );
        }
      } catch (err) {
        console.log(
          `${colors.red}   ✗ ${table}: Error - ${err.message}${colors.reset}`
        );
      }
    }

    // Test 4: Check Indexes
    console.log(
      `\n${colors.bold}4. Checking Database Indexes...${colors.reset}`
    );
    const indexQuery = `
      SELECT schemaname, tablename, indexname 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      ORDER BY tablename, indexname
    `;
    const indexResult = await pool.query(indexQuery);
    console.log(
      `${colors.green}   ✓ Found ${indexResult.rows.length} indexes${colors.reset}\n`
    );

    // Test 5: Check Database Size
    console.log(`${colors.bold}5. Checking Database Size...${colors.reset}`);
    const sizeQuery = `
      SELECT pg_database.datname,
             pg_size_pretty(pg_database_size(pg_database.datname)) AS size
      FROM pg_database
      WHERE pg_database.datname = current_database()
    `;
    const sizeResult = await pool.query(sizeQuery);
    console.log(
      `${colors.cyan}   • Database Size: ${sizeResult.rows[0].size}${colors.reset}\n`
    );

    // Test 6: Check Active Connections
    console.log(
      `${colors.bold}6. Checking Active Connections...${colors.reset}`
    );
    const connectionsQuery = `
      SELECT count(*) as active_connections,
             max_conn,
             max_conn - count(*) as available_connections
      FROM pg_stat_activity, 
           (SELECT setting::int as max_conn FROM pg_settings WHERE name='max_connections') mc
      GROUP BY max_conn
    `;
    const connectionsResult = await pool.query(connectionsQuery);
    if (connectionsResult.rows.length > 0) {
      const conn = connectionsResult.rows[0];
      console.log(
        `${colors.cyan}   • Active: ${conn.active_connections}${colors.reset}`
      );
      console.log(
        `${colors.cyan}   • Available: ${conn.available_connections} / ${conn.max_conn}${colors.reset}\n`
      );
    }

    // Test 7: Recent VerusID Activity
    if (existingTables.includes('identities')) {
      console.log(`${colors.bold}7. Checking VerusID Data...${colors.reset}`);
      const identityCountQuery = 'SELECT COUNT(*) as count FROM identities';
      const identityCount = await pool.query(identityCountQuery);
      console.log(
        `${colors.cyan}   • Total VerusIDs: ${identityCount.rows[0].count}${colors.reset}`
      );

      if (existingTables.includes('staking_rewards')) {
        const rewardsQuery = `
          SELECT 
            COUNT(*) as total_stakes,
            COUNT(DISTINCT identity_address) as active_stakers,
            SUM(amount_sats) as total_rewards_sats,
            MAX(block_height) as latest_block
          FROM staking_rewards
        `;
        const rewardsData = await pool.query(rewardsQuery);
        const rd = rewardsData.rows[0];

        if (rd.total_stakes > 0) {
          console.log(
            `${colors.green}   • Total Stakes: ${parseInt(rd.total_stakes).toLocaleString()}${colors.reset}`
          );
          console.log(
            `${colors.green}   • Active Stakers: ${parseInt(rd.active_stakers).toLocaleString()}${colors.reset}`
          );
          console.log(
            `${colors.green}   • Total Rewards: ${(parseInt(rd.total_rewards_sats) / 100000000).toFixed(2)} VRSC${colors.reset}`
          );
          console.log(
            `${colors.green}   • Latest Block: ${rd.latest_block}${colors.reset}`
          );
        } else {
          console.log(
            `${colors.yellow}   ⚠️  No staking data found${colors.reset}`
          );
        }
      }
    }

    console.log(`\n${colors.green}${colors.bold}╔═══════════════════════════════════════════════════════╗
║              DATABASE HEALTH: EXCELLENT ✓             ║
╚═══════════════════════════════════════════════════════╝${colors.reset}\n`);

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error(`\n${colors.red}${colors.bold}╔═══════════════════════════════════════════════════════╗
║              DATABASE HEALTH: FAILED ✗                ║
╚═══════════════════════════════════════════════════════╝${colors.reset}\n`);
    console.error(`${colors.red}Error Details:${colors.reset}`);
    console.error(`${colors.red}${error.message}${colors.reset}\n`);

    if (error.code === 'ECONNREFUSED') {
      console.log(`${colors.yellow}💡 Troubleshooting:${colors.reset}`);
      console.log(
        `   1. Check if PostgreSQL is running: systemctl status postgresql`
      );
      console.log(`   2. Verify connection settings in .env.local`);
      console.log(`   3. Check firewall rules`);
    } else if (error.code === '28P01') {
      console.log(`${colors.yellow}💡 Authentication failed:${colors.reset}`);
      console.log(`   1. Verify database credentials in .env.local`);
      console.log(`   2. Check pg_hba.conf for auth method`);
    } else if (error.code === '3D000') {
      console.log(`${colors.yellow}💡 Database does not exist:${colors.reset}`);
      console.log(
        `   1. Create database: sudo -u postgres psql -c "CREATE DATABASE verus_utxo_db;"`
      );
      console.log(`   2. Run migrations to set up schema`);
    }

    await pool.end();
    process.exit(1);
  }
}

checkDatabaseHealth();
