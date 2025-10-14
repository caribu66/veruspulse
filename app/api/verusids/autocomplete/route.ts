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
    const query = searchParams.get('q') || '';
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50); // Max 50 for autocomplete

    // Return empty array if query is too short
    if (query.length < 2) {
      return NextResponse.json({
        success: true,
        data: {
          suggestions: [],
          query,
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Search for matching VerusIDs
    // Prioritize: exact match on name > starts with > contains
    const sqlQuery = `
      WITH ranked_results AS (
        SELECT 
          i.identity_address,
          i.base_name,
          i.friendly_name,
          s.total_stakes,
          s.network_rank,
          CASE
            WHEN LOWER(i.base_name) = LOWER($1) THEN 1
            WHEN LOWER(i.friendly_name) = LOWER($1) THEN 1
            WHEN LOWER(i.base_name) LIKE LOWER($1) || '%' THEN 2
            WHEN LOWER(i.friendly_name) LIKE LOWER($1) || '%' THEN 2
            WHEN LOWER(i.base_name) LIKE '%' || LOWER($1) || '%' THEN 3
            WHEN LOWER(i.friendly_name) LIKE '%' || LOWER($1) || '%' THEN 3
            WHEN i.identity_address LIKE $1 || '%' THEN 4
            ELSE 5
          END as rank
        FROM identities i
        LEFT JOIN verusid_statistics s ON i.identity_address = s.address
        WHERE 
          i.base_name ILIKE $2
          OR i.friendly_name ILIKE $2
          OR i.identity_address LIKE $1 || '%'
      )
      SELECT 
        identity_address,
        base_name,
        friendly_name,
        total_stakes,
        network_rank
      FROM ranked_results
      ORDER BY rank ASC, COALESCE(total_stakes, 0) DESC, base_name ASC
      LIMIT $3
    `;

    const result = await db.query(sqlQuery, [query, `%${query}%`, limit]);

    // Format suggestions
    const suggestions = result.rows.map((row) => ({
      address: row.identity_address,
      name: row.base_name || 'unknown',
      friendlyName: row.friendly_name || `${row.base_name || 'unknown'}.VRSC@`,
      displayName: row.friendly_name || row.base_name || row.identity_address,
      totalStakes: row.total_stakes || 0,
      networkRank: row.network_rank,
      // Highlight matching portion for UI
      matchType: row.base_name?.toLowerCase().startsWith(query.toLowerCase()) 
        ? 'starts' 
        : row.identity_address?.toLowerCase().startsWith(query.toLowerCase())
        ? 'address'
        : 'contains',
    }));

    return NextResponse.json({
      success: true,
      data: {
        suggestions,
        query,
        count: suggestions.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error in autocomplete:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch autocomplete suggestions',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

