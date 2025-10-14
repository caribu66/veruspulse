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
      return NextResponse.json({
        success: false,
        error: 'UTXO database not enabled',
      }, { status: 503 });
    }

    const db = getDbPool();
    if (!db) {
      return NextResponse.json({
        success: false,
        error: 'Database connection failed',
      }, { status: 500 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sort') || 'name'; // name, activity, stakes, recent
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100); // Max 100
    const offset = (page - 1) * limit;

    // Build search condition
    let searchCondition = '';
    let searchParams2: any[] = [limit, offset];
    
    if (search) {
      searchCondition = `WHERE (
        i.base_name ILIKE $3 
        OR i.friendly_name ILIKE $3 
        OR i.identity_address ILIKE $3
      )`;
      searchParams2.push(`%${search}%`);
    }

    // Build order by clause
    let orderByClause = 'ORDER BY i.base_name ASC NULLS LAST';
    switch (sortBy) {
      case 'activity':
        orderByClause = 'ORDER BY i.last_refreshed_at DESC NULLS LAST';
        break;
      case 'stakes':
        orderByClause = 'ORDER BY COALESCE(s.total_stakes, 0) DESC, i.base_name ASC';
        break;
      case 'recent':
        orderByClause = 'ORDER BY i.first_seen_block DESC NULLS LAST';
        break;
      case 'rewards':
        orderByClause = 'ORDER BY COALESCE(s.total_rewards_satoshis, 0) DESC, i.base_name ASC';
        break;
    }

    // Main query with left join to staking stats
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
        s.last_stake_time,
        s.apy_all_time,
        s.network_rank
      FROM identities i
      LEFT JOIN verusid_statistics s ON i.identity_address = s.address
      ${searchCondition}
      ${orderByClause}
      LIMIT $1 OFFSET $2
    `;

    const result = await db.query(query, searchParams2);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM identities i
      ${searchCondition}
    `;
    const countParams = search ? [`%${search}%`] : [];
    const countResult = await db.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0]?.total) || 0;

    // Format results
    const identities = result.rows.map((row) => ({
      address: row.identity_address,
      name: row.base_name || 'unknown',
      friendlyName: row.friendly_name || `${row.base_name || 'unknown'}.VRSC@`,
      displayName: row.friendly_name || row.base_name || row.identity_address,
      firstSeenBlock: row.first_seen_block,
      lastScannedBlock: row.last_scanned_block,
      lastRefreshed: row.last_refreshed_at,
      totalStakes: row.total_stakes || 0,
      totalRewardsVRSC: row.total_rewards_satoshis ? parseFloat(row.total_rewards_satoshis) / 100000000 : 0,
      lastStake: row.last_stake_time,
      apyAllTime: row.apy_all_time ? parseFloat(row.apy_all_time) : null,
      networkRank: row.network_rank,
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

