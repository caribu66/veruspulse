#!/usr/bin/env node

/**
 * Check database structure and test stake event insertion
 */

const { Pool } = require('pg');

async function checkDatabaseStructure() {
  console.log('🔍 Checking database structure...\n');

  const db = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // Check if stake_events table exists
    console.log('📊 Checking stake_events table...');
    const tableCheck = await db.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'stake_events'
        `);

    if (tableCheck.rows.length > 0) {
      console.log('   ✅ stake_events table exists');

      // Get table structure
      const structure = await db.query(`
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_name = 'stake_events'
                ORDER BY ordinal_position
            `);

      console.log('   📋 Table structure:');
      structure.rows.forEach(row => {
        console.log(
          `      ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`
        );
      });

      // Check current record count
      const count = await db.query(
        'SELECT COUNT(*) as count FROM stake_events'
      );
      console.log(`   📊 Current records: ${count.rows[0].count}`);

      // Test insertion
      console.log('\n🧪 Testing stake event insertion...');
      const testEvent = {
        address: 'R9RFQvWiRwcLe9b6MGV',
        txid: 'test_txid_' + Date.now(),
        blockHeight: 999999,
        blockTime: new Date(),
        rewardAmount: 600000000,
        stakeAmount: 0,
        stakeAge: 0,
      };

      const insertQuery = `
                INSERT INTO stake_events (
                    address, txid, block_height, block_time,
                    reward_amount, stake_amount, stake_age, staking_probability
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                ON CONFLICT (txid) DO NOTHING
                RETURNING *
            `;

      const result = await db.query(insertQuery, [
        testEvent.address,
        testEvent.txid,
        testEvent.blockHeight,
        testEvent.blockTime,
        testEvent.rewardAmount,
        testEvent.stakeAmount,
        testEvent.stakeAge,
        0,
      ]);

      if (result.rows.length > 0) {
        console.log('   ✅ Test insertion successful');
        console.log('   📊 Inserted record:', result.rows[0]);

        // Clean up test record
        await db.query('DELETE FROM stake_events WHERE txid = $1', [
          testEvent.txid,
        ]);
        console.log('   🧹 Test record cleaned up');
      } else {
        console.log(
          '   ⚠️  Test insertion returned no rows (conflict or error)'
        );
      }
    } else {
      console.log('   ❌ stake_events table does not exist');

      // Check what tables do exist
      const allTables = await db.query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
                ORDER BY table_name
            `);

      console.log('   📋 Available tables:');
      allTables.rows.forEach(row => {
        console.log(`      ${row.table_name}`);
      });
    }
  } catch (error) {
    console.error('❌ Database error:', error.message);
  } finally {
    await db.end();
  }

  console.log('\n🎯 Database structure check complete!');
}

checkDatabaseStructure().catch(console.error);
