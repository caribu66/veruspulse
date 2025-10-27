const { Pool } = require('pg');

const pool = new Pool({
  connectionString:
    'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
});

async function checkAllVerusIDs() {
  console.log('🔍 CHECKING COMPLETE VERUSID STAKING COVERAGE');
  console.log(
    '═══════════════════════════════════════════════════════════════'
  );
  console.log('');

  // Get overall stats
  const stats = await pool.query(`
    SELECT 
      COUNT(*) as total_stakes,
      COUNT(DISTINCT identity_address) as unique_verusids,
      MIN(block_height) as earliest_block,
      MAX(block_height) as latest_block,
      MIN(block_time) as earliest_date,
      MAX(block_time) as latest_date
    FROM staking_rewards 
    WHERE identity_address LIKE 'i%'
  `);

  const s = stats.rows[0];
  console.log('📊 DATABASE COVERAGE');
  console.log('──────────────────────────────────────────────────────────────');
  console.log(
    `Total VerusID stakes:     ${parseInt(s.total_stakes).toLocaleString()}`
  );
  console.log(
    `Unique VerusIDs:           ${parseInt(s.unique_verusids).toLocaleString()}`
  );
  console.log(
    `Block range:               ${parseInt(s.earliest_block).toLocaleString()} to ${parseInt(s.latest_block).toLocaleString()}`
  );
  console.log(
    `Date range:                ${s.earliest_date.toISOString().split('T')[0]} to ${s.latest_date.toISOString().split('T')[0]}`
  );
  console.log('');

  // Check for gaps in block coverage
  const gaps = await pool.query(`
    WITH block_gaps AS (
      SELECT 
        block_height,
        LAG(block_height) OVER (ORDER BY block_height) as prev_height,
        block_height - LAG(block_height) OVER (ORDER BY block_height) as gap_size
      FROM staking_rewards 
      WHERE identity_address LIKE 'i%'
      ORDER BY block_height
    )
    SELECT 
      COUNT(*) as total_gaps,
      MAX(gap_size) as largest_gap,
      AVG(gap_size) as avg_gap
    FROM block_gaps 
    WHERE gap_size > 1
  `);

  console.log('🔍 BLOCK COVERAGE ANALYSIS');
  console.log('──────────────────────────────────────────────────────────────');
  console.log(`Total gaps > 1 block:     ${gaps.rows[0].total_gaps || 0}`);
  console.log(
    `Largest gap:              ${gaps.rows[0].largest_gap || 'N/A'} blocks`
  );
  console.log(
    `Average gap:              ${gaps.rows[0].avg_gap ? Math.round(gaps.rows[0].avg_gap) : 'N/A'} blocks`
  );
  console.log('');

  // Check top stakers coverage
  const topStakers = await pool.query(`
    SELECT 
      identity_address,
      COUNT(*) as stake_count,
      MIN(block_height) as first_stake,
      MAX(block_height) as last_stake,
      MIN(block_time) as first_date,
      MAX(block_time) as last_date
    FROM staking_rewards 
    WHERE identity_address LIKE 'i%'
    GROUP BY identity_address
    ORDER BY stake_count DESC
    LIMIT 10
  `);

  console.log('🏆 TOP 10 STAKERS COVERAGE');
  console.log('──────────────────────────────────────────────────────────────');
  topStakers.rows.forEach((row, i) => {
    const duration = new Date(row.last_date) - new Date(row.first_date);
    const days = Math.floor(duration / (1000 * 60 * 60 * 24));
    console.log(
      `${String(i + 1).padStart(2)}. ${row.identity_address}: ${parseInt(row.stake_count).toLocaleString()} stakes (${days} days)`
    );
  });
  console.log('');

  // Check if we have stakes from the very beginning
  const earlyStakes = await pool.query(`
    SELECT COUNT(*) as count
    FROM staking_rewards 
    WHERE identity_address LIKE 'i%' 
    AND block_height < 1000000
  `);

  console.log('📅 HISTORICAL COVERAGE');
  console.log('──────────────────────────────────────────────────────────────');
  console.log(
    `Stakes before block 1M:   ${parseInt(earlyStakes.rows[0].count).toLocaleString()}`
  );
  console.log(
    `Coverage from Dec 2020:   ${s.earliest_date.toISOString().split('T')[0] === '2020-12-20' ? '✅ Yes' : '❌ No'}`
  );
  console.log(
    `Coverage to current tip:   ${parseInt(s.latest_block) >= 3780000 ? '✅ Yes' : '❌ No'}`
  );
  console.log('');

  // Check for any VerusIDs with very few stakes (potential missing data)
  const lowStakers = await pool.query(`
    SELECT 
      identity_address,
      COUNT(*) as stake_count,
      MIN(block_time) as first_date,
      MAX(block_time) as last_date
    FROM staking_rewards 
    WHERE identity_address LIKE 'i%'
    GROUP BY identity_address
    HAVING COUNT(*) < 10
    ORDER BY stake_count ASC
    LIMIT 20
  `);

  console.log('⚠️  VERUSIDS WITH FEW STAKES (< 10)');
  console.log('──────────────────────────────────────────────────────────────');
  if (lowStakers.rows.length > 0) {
    lowStakers.rows.forEach((row, i) => {
      console.log(
        `${String(i + 1).padStart(2)}. ${row.identity_address}: ${row.stake_count} stakes`
      );
    });
  } else {
    console.log('All VerusIDs have 10+ stakes - good coverage!');
  }
  console.log('');

  // Summary
  console.log('✅ SUMMARY');
  console.log('──────────────────────────────────────────────────────────────');
  console.log(
    `Database contains ${parseInt(s.total_stakes).toLocaleString()} stakes from ${parseInt(s.unique_verusids).toLocaleString()} VerusIDs`
  );
  console.log(
    `Coverage: ${s.earliest_date.toISOString().split('T')[0]} to ${s.latest_date.toISOString().split('T')[0]}`
  );
  console.log(
    `Block range: ${parseInt(s.earliest_block).toLocaleString()} to ${parseInt(s.latest_block).toLocaleString()}`
  );

  await pool.end();
}

checkAllVerusIDs().catch(console.error);
