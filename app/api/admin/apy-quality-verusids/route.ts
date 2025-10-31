import { type NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(_request: NextRequest) {
  try {
    const { searchParams } = new URL(_request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const minStakes = parseInt(searchParams.get('minStakes') || '1');

    // Get VerusID quality details using the view we created
    const verusIDsQuery = `
      SELECT
        address,
        friendly_name,
        total_stakes,
        stakes_with_real_amounts,
        data_completeness_pct,
        apy_all_time,
        apy_calculation_method,
        avg_stake_amount_vrsc,
        last_calculated,
        updated_at
      FROM verusid_apy_quality
      WHERE total_stakes >= $1
      ORDER BY data_completeness_pct DESC, total_stakes DESC
      LIMIT $2
    `;

    const verusIDsResult = await pool.query(verusIDsQuery, [minStakes, limit]);

    const verusIDs = verusIDsResult.rows.map(row => ({
      address: row.address,
      friendly_name: row.friendly_name,
      total_stakes: parseInt(row.total_stakes) || 0,
      stakes_with_real_amounts: parseInt(row.stakes_with_real_amounts) || 0,
      data_completeness_pct: parseFloat(row.data_completeness_pct) || 0,
      apy_all_time: parseFloat(row.apy_all_time) || 0,
      apy_calculation_method: row.apy_calculation_method || 'estimated',
      avg_stake_amount_vrsc: row.avg_stake_amount_vrsc
        ? parseFloat(row.avg_stake_amount_vrsc)
        : null,
      last_calculated: row.last_calculated,
      updated_at: row.updated_at,
    }));

    return NextResponse.json({
      success: true,
      data: verusIDs,
    });
  } catch (error: any) {
    console.error('Error fetching VerusID quality data:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch VerusID quality data',
      },
      { status: 500 }
    );
  }
}
