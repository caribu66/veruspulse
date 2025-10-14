// Direct statistics calculation script
// This bypasses the sync service and directly calculates stats for addresses with existing stake data

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('❌ ERROR: DATABASE_URL environment variable is not set');
  console.error('Please set DATABASE_URL in your .env.local file');
  process.exit(1);
}

async function calculateStatsForAddress(address, db) {
  // Use shared connection pool passed as parameter
  
  try {
    console.log(`\n📊 Calculating statistics for ${address}...`);
    
    // Get stake events summary
    const stakesSummary = await db.query(`
      SELECT 
        COUNT(*) as total_stakes,
        SUM(reward_amount) as total_rewards,
        MIN(block_time) as first_stake,
        MAX(block_time) as last_stake,
        AVG(stake_age) as avg_stake_age,
        AVG(reward_amount) as avg_reward_amount
      FROM stake_events
      WHERE address = $1
    `, [address]);
    
    const stats = stakesSummary.rows[0];
    console.log(`   Found ${stats.total_stakes} stakes`);
    console.log(`   Total rewards: ${(parseFloat(stats.total_rewards) / 100000000).toFixed(2)} VRSC`);
    
    // Calculate APY (simplified)
    const daysSinceFirst = stats.first_stake 
      ? (Date.now() - new Date(stats.first_stake).getTime()) / (1000 * 60 * 60 * 24)
      : 0;
    
    // Simple APY calculation (this is approximate)
    const apy = daysSinceFirst > 0 
      ? ((parseFloat(stats.total_rewards) / 100000000) / daysSinceFirst * 365 / 10000) * 100
      : 0;
    
    // Insert/update statistics
    await db.query(`
      INSERT INTO verusid_statistics (
        address, total_stakes, total_rewards_satoshis, first_stake_time, last_stake_time,
        apy_all_time, avg_stake_age, avg_reward_amount_satoshis,
        last_calculated, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()
      )
      ON CONFLICT (address) DO UPDATE SET
        total_stakes = EXCLUDED.total_stakes,
        total_rewards_satoshis = EXCLUDED.total_rewards_satoshis,
        first_stake_time = EXCLUDED.first_stake_time,
        last_stake_time = EXCLUDED.last_stake_time,
        apy_all_time = EXCLUDED.apy_all_time,
        avg_stake_age = EXCLUDED.avg_stake_age,
        avg_reward_amount_satoshis = EXCLUDED.avg_reward_amount_satoshis,
        last_calculated = NOW(),
        updated_at = NOW()
    `, [
      address,
      stats.total_stakes,
      stats.total_rewards,
      stats.first_stake,
      stats.last_stake,
      apy,
      Math.round(parseFloat(stats.avg_stake_age) || 0),
      Math.round(parseFloat(stats.avg_reward_amount) || 0)
    ]);
    
    console.log(`   ✅ Statistics saved! APY: ${apy.toFixed(2)}%`);
    
  } catch (error) {
    console.error(`   ❌ Error:`, error.message);
  }
  // Don't end the connection here - let main() handle it
}

async function main() {
  const db = new Pool({ 
    connectionString: dbUrl, 
    max: 5,
    connectionTimeoutMillis: 2000,
    idleTimeoutMillis: 30000
  });
  
  try {
    console.log('🚀 Finding addresses with stake data...\n');
    
    // Get all addresses with stake events
    const result = await db.query(`
      SELECT address, COUNT(*) as stake_count
      FROM stake_events
      GROUP BY address
      ORDER BY stake_count DESC
    `);
    
    console.log(`Found ${result.rows.length} addresses with stake data:\n`);
    
    for (const row of result.rows) {
      console.log(`   ${row.address}: ${row.stake_count} stakes`);
    }
    
    // Calculate stats for each
    for (const row of result.rows) {
      await calculateStatsForAddress(row.address, db);
    }
    
    console.log('\n\n🎉 Done! Check your statistics:\n');
    console.log('You can view the results by querying the verusid_statistics table in your database.');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.end();
  }
}

main();

