import { type NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { verusAPI } from '@/lib/rpc-client-robust';
import { addSecurityHeaders } from '@/lib/middleware/security';
import { logger } from '@/lib/utils/logger';

let dbPool: Pool | null = null;

function getDbPool() {
  if (!dbPool && process.env.DATABASE_URL) {
    dbPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }
  return dbPool;
}

export async function GET(request: NextRequest) {
  try {
    // Check if UTXO database is enabled
    const dbEnabled = process.env.UTXO_DATABASE_ENABLED === 'true';
    if (!dbEnabled || !process.env.DATABASE_URL) {
      return NextResponse.json(
        {
          success: false,
          error: 'UTXO database not enabled',
        },
        { status: 503 }
      );
    }

    const db = getDbPool();
    if (!db) {
      return NextResponse.json(
        {
          success: false,
          error: 'Database connection failed',
        },
        { status: 500 }
      );
    }

    logger.info('🔍 Fetching all VerusIDs with comprehensive data...');

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500); // Max 500 for initial load
    const includeRPC =
      searchParams.get('includeRPC') === 'true' ||
      searchParams.get('includeRPC') === '1';

    // Main query: Get identities with comprehensive statistics
    const query = `
      SELECT
        i.identity_address,
        i.base_name,
        i.friendly_name,
        i.first_seen_block,
        i.last_scanned_block,
        i.last_refreshed_at,
        s.total_stakes,
        s.total_rewards_satoshis,
        s.first_stake_time,
        s.last_stake_time,
        s.apy_all_time,
        s.apy_yearly,
        s.apy_90d,
        s.apy_30d,
        s.apy_7d,
        s.roi_all_time,
        s.staking_efficiency,
        s.avg_stake_age,
        s.network_rank,
        s.network_percentile,
        s.eligible_utxos,
        s.current_utxos,
        s.cooldown_utxos,
        s.total_value_satoshis,
        s.eligible_value_satoshis,
        s.largest_utxo_satoshis,
        s.smallest_eligible_satoshis,
        s.highest_reward_satoshis,
        s.lowest_reward_satoshis,
        s.last_calculated,
        s.data_completeness
      FROM identities i
      LEFT JOIN verusid_statistics s ON i.identity_address = s.address
      ORDER BY i.base_name ASC NULLS LAST
      LIMIT $1
    `;

    const result = await db.query(query, [limit]);
    logger.info(`✅ Found ${result.rows.length} identities from database`);

    // Get total count for metadata
    const countResult = await db.query(
      'SELECT COUNT(*) as total FROM identities'
    );
    const totalCount = parseInt(countResult.rows[0]?.total) || 0;

    // Format the results
    const identities = result.rows.map(row => {
      const lastStakeTime = row.last_stake_time;
      const now = new Date();
      const lastStake = lastStakeTime ? new Date(lastStakeTime) : null;
      const daysSinceLastStake = lastStake
        ? Math.floor(
            (now.getTime() - lastStake.getTime()) / (1000 * 60 * 60 * 24)
          )
        : null;

      // Determine activity status
      let activityStatus: 'active' | 'inactive' = 'inactive';
      if (lastStake && daysSinceLastStake !== null) {
        if (daysSinceLastStake <= 7) {
          activityStatus = 'active';
        } else if (daysSinceLastStake <= 30) {
          activityStatus = 'active';
        }
      }

      return {
        address: row.identity_address,
        baseName: row.base_name || 'unknown',
        friendlyName:
          row.friendly_name || `${row.base_name || 'unknown'}.VRSC@`,
        displayName: row.friendly_name || row.base_name || row.identity_address,
        firstSeenBlock: row.first_seen_block,
        lastScannedBlock: row.last_scanned_block,
        lastRefreshed: row.last_refreshed_at,
        totalStakes: row.total_stakes || 0,
        totalRewardsVRSC: row.total_rewards_satoshis
          ? parseFloat(row.total_rewards_satoshis) / 100000000
          : 0,
        firstStakeTime: row.first_stake_time,
        lastStakeTime: row.last_stake_time,
        apyAllTime: row.apy_all_time ? parseFloat(row.apy_all_time) : null,
        apyYearly: row.apy_yearly ? parseFloat(row.apy_yearly) : null,
        apy90d: row.apy_90d ? parseFloat(row.apy_90d) : null,
        apy30d: row.apy_30d ? parseFloat(row.apy_30d) : null,
        apy7d: row.apy_7d ? parseFloat(row.apy_7d) : null,
        roiAllTime: row.roi_all_time ? parseFloat(row.roi_all_time) : null,
        stakingEfficiency: row.staking_efficiency
          ? parseFloat(row.staking_efficiency)
          : null,
        avgStakeAge: row.avg_stake_age || null,
        networkRank: row.network_rank,
        networkPercentile: row.network_percentile
          ? parseFloat(row.network_percentile)
          : null,
        eligibleUtxos: row.eligible_utxos || 0,
        currentUtxos: row.current_utxos || 0,
        cooldownUtxos: row.cooldown_utxos || 0,
        totalValueVRSC: row.total_value_satoshis
          ? parseFloat(row.total_value_satoshis) / 100000000
          : 0,
        eligibleValueVRSC: row.eligible_value_satoshis
          ? parseFloat(row.eligible_value_satoshis) / 100000000
          : 0,
        largestUtxoVRSC: row.largest_utxo_satoshis
          ? parseFloat(row.largest_utxo_satoshis) / 100000000
          : 0,
        smallestEligibleVRSC: row.smallest_eligible_satoshis
          ? parseFloat(row.smallest_eligible_satoshis) / 100000000
          : 0,
        highestRewardVRSC: row.highest_reward_satoshis
          ? parseFloat(row.highest_reward_satoshis) / 100000000
          : 0,
        lowestRewardVRSC: row.lowest_reward_satoshis
          ? parseFloat(row.lowest_reward_satoshis) / 100000000
          : 0,
        lastCalculated: row.last_calculated,
        dataCompleteness: row.data_completeness
          ? parseFloat(row.data_completeness)
          : 100,
        activityStatus,
        daysSinceLastStake,
      };
    });

    // Optionally fetch RPC data to supplement
    let rpcIdentities: any[] = [];
    if (includeRPC) {
      try {
        logger.info('🌐 Fetching additional identities from RPC...');
        const rpcResult = await verusAPI.listIdentities();
        if (rpcResult && Array.isArray(rpcResult)) {
          rpcIdentities = rpcResult.map((id: any) => ({
            address: id.identityaddress,
            baseName: id.identity?.name || '',
            friendlyName: id.friendlyname || '',
            displayName:
              id.friendlyname || id.identity?.name || id.identityaddress,
            // RPC data doesn't include staking stats
            totalStakes: 0,
            totalRewardsVRSC: 0,
            activityStatus: 'unknown' as const,
          }));
          logger.info(
            `✅ Found ${rpcIdentities.length} additional identities from RPC`
          );
        }
      } catch (error) {
        logger.warn('⚠️ Failed to fetch RPC identities:', error);
      }
    }

    // Merge RPC identities with database identities
    let allIdentities = identities;
    if (includeRPC && rpcIdentities.length > 0) {
      // Create a map of existing identities by address to avoid duplicates
      const existingAddresses = new Set(identities.map(id => id.address));

      // Add RPC identities that aren't already in the database
      const newRpcIdentities = rpcIdentities.filter(
        rpcId => rpcId.address && !existingAddresses.has(rpcId.address)
      );

      allIdentities = [...identities, ...newRpcIdentities];
      logger.info(
        `✅ Merged ${newRpcIdentities.length} new RPC identities with ${identities.length} database identities`
      );
    }

    const response = NextResponse.json({
      success: true,
      data: {
        identities: allIdentities,
        rpcIdentities,
        metadata: {
          totalCount,
          loadedCount: allIdentities.length,
          rpcCount: rpcIdentities.length,
          limit,
          includeRPC,
          dataFreshness: new Date().toISOString(),
        },
      },
      timestamp: new Date().toISOString(),
    });

    return addSecurityHeaders(response);
  } catch (error: any) {
    logger.error('❌ Failed to fetch all VerusIDs:', error);

    const response = NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch VerusIDs',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );

    return addSecurityHeaders(response);
  }
}
