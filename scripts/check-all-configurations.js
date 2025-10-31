#!/usr/bin/env node

/**
 * Comprehensive Configuration Check
 * Verifies all system configurations are working correctly
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const CHECKS = {
  passed: [],
  failed: [],
  warnings: []
};

function log(symbol, message, details = '') {
  console.log(`${symbol} ${message}`);
  if (details) console.log(`   ${details}`);
}

function pass(message, details) {
  CHECKS.passed.push(message);
  log('✅', message, details);
}

function fail(message, details) {
  CHECKS.failed.push(message);
  log('❌', message, details);
}

function warn(message, details) {
  CHECKS.warnings.push(message);
  log('⚠️ ', message, details);
}

async function checkEnvironmentVariables() {
  console.log('\n═══════════════════════════════════════════');
  console.log('1️⃣  ENVIRONMENT VARIABLES CHECK');
  console.log('═══════════════════════════════════════════\n');

  const required = [
    'DATABASE_URL',
    'VERUS_RPC_HOST',
    'VERUS_RPC_USER',
    'VERUS_RPC_PASSWORD'
  ];

  const optional = [
    'UTXO_DATABASE_ENABLED',
    'ENABLE_ZMQ',
    'VERUS_ZMQ_ADDRESS',
    'REDIS_HOST',
    'NODE_ENV'
  ];

  // Check required
  for (const key of required) {
    if (process.env[key]) {
      pass(`${key} is set`);
    } else {
      fail(`${key} is MISSING`, 'This is required for the app to work');
    }
  }

  // Check optional
  for (const key of optional) {
    if (process.env[key]) {
      pass(`${key} is set`, `Value: ${key === 'DATABASE_URL' ? '[REDACTED]' : process.env[key]}`);
    } else {
      warn(`${key} is not set`, 'This is optional but recommended');
    }
  }
}

async function checkDatabaseConnection() {
  console.log('\n═══════════════════════════════════════════');
  console.log('2️⃣  DATABASE CONNECTION CHECK');
  console.log('═══════════════════════════════════════════\n');

  if (!process.env.DATABASE_URL) {
    fail('Cannot check database - DATABASE_URL not set');
    return null;
  }

  let pool;
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 5000
    });

    // Test connection
    const result = await pool.query('SELECT NOW() as current_time, current_database() as db_name, current_user as db_user');
    pass('Database connection successful');
    log('ℹ️ ', 'Connection details:', '');
    console.log(`   Database: ${result.rows[0].db_name}`);
    console.log(`   User: ${result.rows[0].db_user}`);
    console.log(`   Time: ${result.rows[0].current_time}`);

    return pool;
  } catch (error) {
    fail('Database connection failed', error.message);
    return null;
  }
}

async function checkDatabaseSchema(pool) {
  console.log('\n═══════════════════════════════════════════');
  console.log('3️⃣  DATABASE SCHEMA CHECK');
  console.log('═══════════════════════════════════════════\n');

  if (!pool) {
    fail('Cannot check schema - no database connection');
    return;
  }

  const criticalTables = [
    'identities',
    'staking_rewards',
    'verusid_statistics',
    'staking_daily',
    'identity_sync_state'
  ];

  const optionalTables = [
    'utxos',
    'block_analytics',
    'stake_events',
    'utxo_analytics',
    'staking_timeline'
  ];

  // Check critical tables
  for (const table of criticalTables) {
    try {
      const result = await pool.query(
        `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`,
        [table]
      );
      
      if (result.rows[0].count > 0) {
        // Check permissions
        try {
          const rowCount = await pool.query(`SELECT COUNT(*) FROM ${table}`);
          pass(`Table '${table}' exists and accessible`, `${rowCount.rows[0].count} rows`);
        } catch (permError) {
          fail(`Table '${table}' exists but NO PERMISSION`, permError.message);
        }
      } else {
        fail(`Table '${table}' MISSING`, 'Run migrations to create this table');
      }
    } catch (error) {
      fail(`Error checking table '${table}'`, error.message);
    }
  }

  // Check optional tables
  for (const table of optionalTables) {
    try {
      const result = await pool.query(
        `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`,
        [table]
      );
      
      if (result.rows[0].count > 0) {
        try {
          const rowCount = await pool.query(`SELECT COUNT(*) FROM ${table}`);
          pass(`Table '${table}' exists`, `${rowCount.rows[0].count} rows`);
        } catch (permError) {
          warn(`Table '${table}' exists but no permission`, permError.message);
        }
      } else {
        warn(`Table '${table}' not found`, 'Optional - only needed for advanced features');
      }
    } catch (error) {
      warn(`Could not check table '${table}'`, error.message);
    }
  }
}

async function checkVerusRPC() {
  console.log('\n═══════════════════════════════════════════');
  console.log('4️⃣  VERUS RPC CONNECTION CHECK');
  console.log('═══════════════════════════════════════════\n');

  if (!process.env.VERUS_RPC_HOST || !process.env.VERUS_RPC_USER || !process.env.VERUS_RPC_PASSWORD) {
    fail('Verus RPC credentials not configured');
    return;
  }

  try {
    const auth = Buffer.from(`${process.env.VERUS_RPC_USER}:${process.env.VERUS_RPC_PASSWORD}`).toString('base64');
    const response = await fetch(process.env.VERUS_RPC_HOST, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`
      },
      body: JSON.stringify({
        jsonrpc: '1.0',
        id: 'config-check',
        method: 'getinfo',
        params: []
      })
    });

    if (response.ok) {
      const data = await response.json();
      if (data.error) {
        fail('Verus RPC error', data.error.message);
      } else {
        pass('Verus RPC connection successful');
        log('ℹ️ ', 'Blockchain info:', '');
        console.log(`   Version: ${data.result.version}`);
        console.log(`   Blocks: ${data.result.blocks}`);
        console.log(`   Connections: ${data.result.connections}`);
      }
    } else {
      fail('Verus RPC connection failed', `HTTP ${response.status}: ${response.statusText}`);
    }
  } catch (error) {
    fail('Verus RPC connection failed', error.message);
  }
}

async function checkApplicationFiles() {
  console.log('\n═══════════════════════════════════════════');
  console.log('5️⃣  APPLICATION FILES CHECK');
  console.log('═══════════════════════════════════════════\n');

  const requiredFiles = [
    'package.json',
    'next.config.js',
    'app/layout.tsx',
    'app/api/verusids/browse/route.ts'
  ];

  const requiredDirs = [
    'app',
    'lib',
    'scripts',
    'components'
  ];

  for (const file of requiredFiles) {
    if (fs.existsSync(file)) {
      pass(`File '${file}' exists`);
    } else {
      fail(`File '${file}' MISSING`);
    }
  }

  for (const dir of requiredDirs) {
    if (fs.existsSync(dir)) {
      pass(`Directory '${dir}' exists`);
    } else {
      fail(`Directory '${dir}' MISSING`);
    }
  }
}

async function checkNodeModules() {
  console.log('\n═══════════════════════════════════════════');
  console.log('6️⃣  DEPENDENCIES CHECK');
  console.log('═══════════════════════════════════════════\n');

  if (!fs.existsSync('node_modules')) {
    fail('node_modules not found', 'Run: npm install');
    return;
  }

  pass('node_modules exists');

  const criticalPackages = ['next', 'react', 'pg', 'dotenv'];
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  for (const pkg of criticalPackages) {
    if (packageJson.dependencies?.[pkg] || packageJson.devDependencies?.[pkg]) {
      pass(`Package '${pkg}' in package.json`);
    } else {
      warn(`Package '${pkg}' not in package.json`);
    }
  }
}

async function generateFixScript(pool) {
  console.log('\n═══════════════════════════════════════════');
  console.log('🔧  GENERATING FIX SCRIPT');
  console.log('═══════════════════════════════════════════\n');

  if (CHECKS.failed.length === 0 && CHECKS.warnings.length === 0) {
    pass('No fixes needed - all configurations are correct!');
    return;
  }

  let fixScript = '#!/bin/bash\n\n';
  fixScript += '# Auto-generated fix script\n';
  fixScript += '# Run this script to fix configuration issues\n\n';
  fixScript += 'set -e\n\n';

  // Check if we have permission issues
  const hasPermissionIssues = CHECKS.failed.some(f => f.includes('NO PERMISSION'));
  
  if (hasPermissionIssues) {
    fixScript += 'echo "Fixing database permissions..."\n';
    fixScript += 'sudo -u postgres psql -d verus_utxo_db << EOF\n';
    fixScript += 'GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO verus;\n';
    fixScript += 'GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO verus;\n';
    fixScript += 'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO verus;\n';
    fixScript += 'EOF\n\n';
  }

  // Check if we need to run migrations
  const hasMissingTables = CHECKS.failed.some(f => f.includes('MISSING'));
  
  if (hasMissingTables) {
    fixScript += 'echo "Running database migrations..."\n';
    fixScript += 'npm run run:migrate\n\n';
  }

  // Check if we need npm install
  if (!fs.existsSync('node_modules')) {
    fixScript += 'echo "Installing dependencies..."\n';
    fixScript += 'npm install\n\n';
  }

  fixScript += 'echo ""\n';
  fixScript += 'echo "✅ Fixes applied! Restart your application with: npm run dev"\n';

  fs.writeFileSync('fix-configurations.sh', fixScript);
  fs.chmodSync('fix-configurations.sh', '0755');
  
  log('📝', 'Created fix-configurations.sh', 'Run this script to fix issues automatically');
}

async function printSummary() {
  console.log('\n');
  console.log('═══════════════════════════════════════════');
  console.log('📊  CONFIGURATION CHECK SUMMARY');
  console.log('═══════════════════════════════════════════\n');

  console.log(`✅ Passed: ${CHECKS.passed.length}`);
  console.log(`❌ Failed: ${CHECKS.failed.length}`);
  console.log(`⚠️  Warnings: ${CHECKS.warnings.length}`);

  if (CHECKS.failed.length > 0) {
    console.log('\n❌ CRITICAL ISSUES:');
    CHECKS.failed.forEach((f, i) => console.log(`   ${i + 1}. ${f}`));
    console.log('\n🔧 Run: ./fix-configurations.sh to fix automatically');
  }

  if (CHECKS.warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:');
    CHECKS.warnings.forEach((w, i) => console.log(`   ${i + 1}. ${w}`));
  }

  if (CHECKS.failed.length === 0 && CHECKS.warnings.length === 0) {
    console.log('\n🎉 ALL CONFIGURATIONS ARE CORRECT!');
    console.log('   Your application is ready to run.');
    console.log('   Start with: npm run dev');
  }

  console.log('\n═══════════════════════════════════════════\n');
}

async function main() {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════╗');
  console.log('║   VERUS DAPP CONFIGURATION CHECK          ║');
  console.log('╚═══════════════════════════════════════════╝');

  await checkEnvironmentVariables();
  const pool = await checkDatabaseConnection();
  await checkDatabaseSchema(pool);
  await checkVerusRPC();
  await checkApplicationFiles();
  await checkNodeModules();
  await generateFixScript(pool);
  await printSummary();

  if (pool) {
    await pool.end();
  }

  process.exit(CHECKS.failed.length > 0 ? 1 : 0);
}

main().catch(console.error);

