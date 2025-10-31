#!/usr/bin/env node

/**
 * Database Schema Fix Script
 * Creates missing tables and fixes permissions
 */

require('dotenv').config();
const { Pool } = require('pg');

async function main() {
  console.log('\n╔═══════════════════════════════════════════╗');
  console.log('║   DATABASE SCHEMA FIX                     ║');
  console.log('╚═══════════════════════════════════════════╝\n');

  // Try to connect as superuser if available
  const dbUrl = process.env.DATABASE_URL;
  
  if (!dbUrl) {
    console.error('❌ DATABASE_URL not set in environment');
    process.exit(1);
  }

  // Extract connection details
  const match = dbUrl.match(/postgres:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
  if (!match) {
    console.error('❌ Invalid DATABASE_URL format');
    process.exit(1);
  }

  const [, user, password, host, port, database] = match;

  console.log(`📊 Connecting to database: ${database}`);
  console.log(`👤 User: ${user}\n`);

  const pool = new Pool({ connectionString: dbUrl });

  try {
    // Check current permissions
    console.log('🔍 Checking current permissions...\n');
    
    const permCheck = await pool.query(`
      SELECT has_schema_privilege('${user}', 'public', 'CREATE') as can_create,
             has_schema_privilege('${user}', 'public', 'USAGE') as can_use
    `);
    
    console.log(`   CREATE permission: ${permCheck.rows[0].can_create ? '✅' : '❌'}`);
    console.log(`   USAGE permission: ${permCheck.rows[0].can_use ? '✅' : '❌'}`);
    
    if (!permCheck.rows[0].can_create) {
      console.log('\n⚠️  Missing CREATE permission. You need to run as postgres superuser:');
      console.log('\n   sudo -u postgres psql verus_utxo_db << EOF');
      console.log('   GRANT CREATE ON SCHEMA public TO verus;');
      console.log('   GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO verus;');
      console.log('   GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO verus;');
      console.log('   ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO verus;');
      console.log('   ALTER MATERIALIZED VIEW staking_daily OWNER TO verus;');
      console.log('   EOF\n');
      console.log('📝 Or run: ./scripts/apply-complete-fix.sh\n');
    }

    // Check for missing tables
    console.log('\n🔍 Checking for missing tables...\n');
    
    const tables = ['identity_sync_state'];
    const missingTables = [];
    
    for (const table of tables) {
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `, [table]);
      
      if (!result.rows[0].exists) {
        console.log(`   ❌ Table '${table}' is missing`);
        missingTables.push(table);
      } else {
        console.log(`   ✅ Table '${table}' exists`);
      }
    }

    // Check materialized view
    const mvResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM pg_matviews 
        WHERE schemaname = 'public' 
        AND matviewname = 'staking_daily'
      )
    `);
    
    if (!mvResult.rows[0].exists) {
      console.log('   ❌ Materialized view \'staking_daily\' is missing');
    } else {
      console.log('   ✅ Materialized view \'staking_daily\' exists');
    }

    // Try to create missing tables
    if (missingTables.length > 0) {
      console.log('\n🔧 Attempting to create missing tables...\n');
      
      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS identity_sync_state (
            identity_address text PRIMARY KEY REFERENCES identities(identity_address) ON DELETE CASCADE,
            backfill_completed boolean DEFAULT false,
            last_confirmed_height int,
            updated_at timestamptz DEFAULT now()
          )
        `);
        console.log('   ✅ Created identity_sync_state table');
      } catch (error) {
        console.log(`   ❌ Failed to create tables: ${error.message}`);
        console.log('   💡 Run the permission fix script first');
      }
    }

    // Final verification
    console.log('\n📊 Running final verification...\n');
    
    const finalCheck = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM information_schema.tables 
         WHERE table_schema = 'public' AND table_name = 'identities') as has_identities,
        (SELECT COUNT(*) FROM information_schema.tables 
         WHERE table_schema = 'public' AND table_name = 'staking_rewards') as has_rewards,
        (SELECT COUNT(*) FROM information_schema.tables 
         WHERE table_schema = 'public' AND table_name = 'identity_sync_state') as has_sync_state,
        (SELECT COUNT(*) FROM pg_matviews 
         WHERE schemaname = 'public' AND matviewname = 'staking_daily') as has_daily_view
    `);
    
    const status = finalCheck.rows[0];
    const allGood = status.has_identities > 0 && 
                    status.has_rewards > 0 && 
                    status.has_sync_state > 0 && 
                    status.has_daily_view > 0;

    if (allGood) {
      console.log('✅ All required tables and views exist!\n');
      console.log('🎉 Database schema is complete.\n');
      console.log('🔄 You can now restart your application: npm run dev\n');
    } else {
      console.log('⚠️  Some tables/views are still missing.\n');
      console.log('📝 Run the permission fix script to resolve:\n');
      console.log('   ./scripts/apply-complete-fix.sh\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);

