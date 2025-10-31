import { type NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { logger } from '@/lib/utils/logger';

export async function POST(_request: NextRequest) {
  try {
    logger.info('🔄 Starting simple recalculation of VerusID statistics...');

    // Initialize database connection
    const db = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Clear existing statistics
    logger.info('🧹 Clearing existing statistics...');
    await db.query('TRUNCATE TABLE verusid_statistics');

    // Get all unique identities from staking_rewards
    const identitiesQuery = `
      SELECT DISTINCT
        sr.identity_address,
        COALESCE(i.friendly_name, i.base_name || '.VRSC@') as friendly_name
      FROM staking_rewards sr
      LEFT JOIN identities i ON sr.identity_address = i.identity_address
      WHERE sr.source_address = sr.identity_address  -- CRITICAL: Only count direct I-address stakes
      ORDER BY sr.identity_address
    `;

    const identitiesResult = await db.query(identitiesQuery);
    const identities = identitiesResult.rows;

    logger.info(`📊 Processing ${identities.length} identities...`);

    let processedCount = 0;
    let errorCount = 0;

    for (const identity of identities) {
      try {
        // Get stats for this identity
        // CRITICAL: Only count stakes where source_address = identity_address (direct I-address stakes)
        const statsQuery = `
          SELECT
            COUNT(*) as total_stakes,
            SUM(amount_sats) as total_rewards_satoshis,
            MIN(block_time) as first_stake_time,
            MAX(block_time) as last_stake_time
          FROM staking_rewards
          WHERE identity_address = $1
          AND source_address = identity_address
        `;

        const statsResult = await db.query(statsQuery, [
          identity.identity_address,
        ]);
        const stats = statsResult.rows[0];

        const totalStakes = parseInt(stats.total_stakes);
        const totalRewardsSatoshis = stats.total_rewards_satoshis;
        const firstStakeTime = stats.first_stake_time;
        const lastStakeTime = stats.last_stake_time;

        // Calculate APY (simplified)
        let apyAllTime = 0;
        if (firstStakeTime && lastStakeTime) {
          const timeDiff =
            new Date(lastStakeTime).getTime() -
            new Date(firstStakeTime).getTime();
          const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
          if (daysDiff > 0) {
            const totalRewardsVRSC =
              parseFloat(totalRewardsSatoshis) / 100000000;
            // Assume average stake of 10K VRSC for APY calculation
            const assumedStake = 10000;
            apyAllTime =
              (totalRewardsVRSC / assumedStake) * (365 / daysDiff) * 100;
          }
        }

        // Insert into verusid_statistics
        const insertQuery = `
          INSERT INTO verusid_statistics (
            address,
            friendly_name,
            total_stakes,
            total_rewards_satoshis,
            first_stake_time,
            last_stake_time,
            apy_all_time,
            staking_efficiency,
            network_rank,
            created_at,
            updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        `;

        await db.query(insertQuery, [
          identity.identity_address,
          identity.friendly_name,
          totalStakes,
          totalRewardsSatoshis,
          firstStakeTime,
          lastStakeTime,
          apyAllTime,
          0, // staking_efficiency
          0, // network_rank (will be calculated later)
        ]);

        processedCount++;

        if (processedCount % 100 === 0) {
          logger.info(
            `📊 Processed ${processedCount}/${identities.length} identities...`
          );
        }
      } catch (error) {
        logger.error(
          `❌ Error processing identity ${identity.identity_address}:`,
          error
        );
        errorCount++;
      }
    }

    // Calculate network rankings
    logger.info('🏆 Calculating network rankings...');
    const rankingQuery = `
      UPDATE verusid_statistics
      SET network_rank = subquery.rank
      FROM (
        SELECT
          address,
          ROW_NUMBER() OVER (ORDER BY total_rewards_satoshis DESC) as rank
        FROM verusid_statistics
        WHERE total_stakes > 0
      ) subquery
      WHERE verusid_statistics.address = subquery.address
    `;

    await db.query(rankingQuery);

    // Get final stats
    const finalStatsQuery = `
      SELECT
        COUNT(*) as total_identities,
        SUM(total_rewards_satoshis) as total_rewards_satoshis,
        (SUM(total_rewards_satoshis) / 100000000.0) as total_rewards_vrsc,
        MAX(total_rewards_satoshis) as max_rewards_satoshis,
        (MAX(total_rewards_satoshis) / 100000000.0) as max_rewards_vrsc
      FROM verusid_statistics
      WHERE total_stakes > 0
    `;

    const finalStatsResult = await db.query(finalStatsQuery);
    const finalStats = finalStatsResult.rows[0];

    logger.info('📊 Final statistics:', {
      totalIdentities: parseInt(finalStats.total_identities),
      totalRewardsVRSC: parseFloat(finalStats.total_rewards_vrsc).toFixed(2),
      maxRewardsVRSC: parseFloat(finalStats.max_rewards_vrsc).toFixed(2),
      processedCount,
      errorCount,
    });

    await db.end();

    logger.info('🎉 Simple recalculation completed successfully!');

    return NextResponse.json({
      success: true,
      message: 'Simple recalculation completed successfully!',
      stats: {
        totalIdentities: parseInt(finalStats.total_identities),
        totalRewardsVRSC: parseFloat(finalStats.total_rewards_vrsc).toFixed(2),
        maxRewardsVRSC: parseFloat(finalStats.max_rewards_vrsc).toFixed(2),
        processedCount,
        errorCount,
      },
    });
  } catch (error: any) {
    logger.error('❌ Error during simple recalculation:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to recalculate statistics',
      },
      { status: 500 }
    );
  }
}
