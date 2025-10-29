import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

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

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sort') || 'name'; // name, activity, stakes, recent
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100); // Max 100
    const offset = (page - 1) * limit;

    // Build search condition with TRENDING RULES: Only direct I-address stakers, active in last 30 days
    let searchCondition = '';
    let queryParams: any[] = [limit, offset];
    let paramIndex = 3;

    // CRITICAL FILTER: Only show VerusIDs with direct I-address stakes (not delegated)
    // AND recently active (last 30 days)
    const trendingFilter = `
      WHERE EXISTS (
        SELECT 1 FROM staking_rewards sr
        WHERE sr.identity_address = i.identity_address
        AND sr.source_address = sr.identity_address
        AND sr.block_time >= NOW() - INTERVAL '30 days'
      )
    `;

    if (search) {
      searchCondition = `${trendingFilter} AND (
        i.base_name ILIKE $${paramIndex}
        OR i.friendly_name ILIKE $${paramIndex}
        OR i.identity_address ILIKE $${paramIndex}
      )`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    } else {
      searchCondition = trendingFilter;
    }

    // Build order by clause - ALWAYS sort by stakes to show active stakers first
    let orderByClause =
      'ORDER BY COALESCE(s.total_stakes, 0) DESC, i.base_name ASC';

    // Main query with left join to staking stats and earliest block fallback
    // ONLY shows VerusIDs with direct I-address stakes in last 30 days
    // Get last_stake_time directly from staking_rewards for real-time data
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
        COALESCE(sr_recent.last_stake_time, s.last_stake_time) as last_stake_time,
        s.apy_all_time,
        s.network_rank,
        COALESCE(i.first_seen_block, sr.earliest_block) as effective_first_seen_block
      FROM identities i
      LEFT JOIN verusid_statistics s ON i.identity_address = s.address
      LEFT JOIN (
        SELECT identity_address, MIN(block_height) as earliest_block
        FROM staking_rewards
        WHERE source_address = identity_address
        GROUP BY identity_address
      ) sr ON i.identity_address = sr.identity_address
      LEFT JOIN (
        SELECT 
          identity_address, 
          MAX(block_time) as last_stake_time
        FROM staking_rewards
        WHERE source_address = identity_address
        GROUP BY identity_address
      ) sr_recent ON i.identity_address = sr_recent.identity_address
      ${searchCondition}
      ${orderByClause}
      LIMIT $1 OFFSET $2
    `;

    const result = await db.query(query, queryParams);

    // Get total count for pagination with SAME trending filter
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM identities i
      ${searchCondition}
    `;
    const countParams = search ? [`%${search}%`] : [];
    const countResult = await db.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0]?.total) || 0;

    // Format results - USE THE DATABASE DATA DIRECTLY!
    const identities = result.rows.map(row => ({
      address: row.identity_address,
      name: row.base_name || 'unknown',
      friendlyName: row.friendly_name || `${row.base_name || 'unknown'}.VRSC@`,
      displayName: row.friendly_name || row.base_name || row.identity_address,
      firstSeenBlock: row.effective_first_seen_block, // Use the fallback value
      lastScannedBlock: row.last_scanned_block,
      lastRefreshed: row.last_refreshed_at,
      totalStakes: row.total_stakes || 0,
      totalRewardsVRSC: row.total_rewards_satoshis
        ? parseFloat(row.total_rewards_satoshis) / 100000000
        : 0,
      lastStake: row.last_stake_time,
      apyAllTime: row.apy_all_time ? parseFloat(row.apy_all_time) : null,
      networkRank: row.network_rank,
      totalValueVRSC: 0, // We'll get balance data separately if needed
    }));

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return NextResponse.json({
      success: true,
      data: {
        identities,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage,
          hasPrevPage,
        },
        metadata: {
          sortBy,
          search: search || null,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error browsing VerusIDs:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to browse VerusIDs',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
