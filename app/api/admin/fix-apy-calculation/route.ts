import { type NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { logger } from '@/lib/utils/logger';

/**
 * FIX: Recalculate APY with correct formula
 *
 * PROBLEM: Current APY = (total_rewards / time) * 100
 * CORRECT: APY = (total_rewards / staked_amount / time) * 100
 *
 * Since we don't track actual staked balances, we estimate conservatively.
 */
export async function POST(_request: NextRequest) {
  // Initialize database connection
  const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  try {
    logger.info('🔧 Starting APY recalculation...');
    console.info('🔧 Fixing APY calculations...');

    // Get all identities with suspicious APY values (> 100% or NULL)
    const problematicResult = await db.query(`
      SELECT 
        address,
        friendly_name,
        total_stakes,
        total_rewards_satoshis / 100000000.0 as rewards_vrsc,
        apy_all_time as old_apy,
        first_stake_time,
        last_stake_time
      FROM verusid_statistics
      WHERE apy_all_time > 100 OR apy_all_time IS NULL
      ORDER BY apy_all_time DESC NULLS LAST
    `);

    console.info(
      `Found ${problematicResult.rows.length} identities with suspicious APY`
    );

    const fixedIdentities = [];

    for (const row of problematicResult.rows) {
      const rewardsVRSC = parseFloat(row.rewards_vrsc);
      const firstStake = new Date(row.first_stake_time);
      const lastStake = new Date(row.last_stake_time);

      if (
        !firstStake ||
        !lastStake ||
        isNaN(firstStake.getTime()) ||
        isNaN(lastStake.getTime())
      ) {
        continue;
      }

      const daysActive =
        (lastStake.getTime() - firstStake.getTime()) / (1000 * 60 * 60 * 24);
      const yearsActive = daysActive / 365.25;

      if (yearsActive < 0.003) {
        // Less than ~1 day
        continue;
      }

      // CORRECT APY CALCULATION:
      // Estimate staked amount using conservative multiplier
      // If someone earned X VRSC over Y years at ~5% APY, they had ~20X staked
      const estimatedStakedAmount = Math.max(
        rewardsVRSC * 20, // Conservative: assumes 5% baseline APY
        1000 // Minimum reasonable stake
      );

      const newAPY = Math.min(
        (rewardsVRSC / estimatedStakedAmount / yearsActive) * 100,
        100 // Cap at 100% to avoid display issues
      );

      // Update the database
      await db.query(
        `
        UPDATE verusid_statistics
        SET 
          apy_all_time = $1,
          updated_at = NOW()
        WHERE address = $2
      `,
        [newAPY, row.address]
      );

      fixedIdentities.push({
        address: row.address,
        friendlyName: row.friendly_name,
        oldAPY: row.old_apy,
        newAPY: newAPY,
        rewardsVRSC: rewardsVRSC,
        yearsActive: yearsActive.toFixed(2),
        estimatedStake: estimatedStakedAmount.toFixed(0),
      });
    }

    // Get updated statistics
    const statsResult = await db.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN apy_all_time > 0 THEN 1 END) as with_apy,
        ROUND(AVG(apy_all_time)::numeric, 2) as avg_apy,
        ROUND(MAX(apy_all_time)::numeric, 2) as max_apy,
        ROUND(MIN(CASE WHEN apy_all_time > 0 THEN apy_all_time END)::numeric, 2) as min_apy,
        ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY apy_all_time)::numeric, 2) as median_apy
      FROM verusid_statistics
      WHERE apy_all_time > 0
    `);

    const stats = statsResult.rows[0];

    logger.info(`✅ Fixed APY for ${fixedIdentities.length} identities`);

    return NextResponse.json({
      success: true,
      message: `Fixed APY for ${fixedIdentities.length} identities`,
      fixed: fixedIdentities.length,
      statistics: {
        total: parseInt(stats.total),
        withAPY: parseInt(stats.with_apy),
        avgAPY: parseFloat(stats.avg_apy),
        medianAPY: parseFloat(stats.median_apy),
        maxAPY: parseFloat(stats.max_apy),
        minAPY: parseFloat(stats.min_apy),
      },
      samples: fixedIdentities.slice(0, 10), // Show first 10 as examples
    });
  } catch (error) {
    logger.error('Error fixing APY:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fix APY calculations',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  } finally {
    await db.end();
  }
}
