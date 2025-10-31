import { type NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(_request: NextRequest) {
  try {
    // Get overall APY quality statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total_verusids,
        COUNT(CASE WHEN stakes_with_real_amounts > 0 THEN 1 END) as with_actual_data,
        COUNT(CASE WHEN stakes_with_real_amounts = 0 THEN 1 END) as with_estimated_data,
        AVG(
          CASE 
            WHEN total_stakes > 0 THEN (stakes_with_real_amounts::DECIMAL / total_stakes) * 100
            ELSE 0
          END
        ) as avg_completeness,
        SUM(total_stakes) as total_stakes,
        SUM(stakes_with_real_amounts) as stakes_with_amounts,
        MAX(updated_at) as last_updated
      FROM verusid_statistics
      WHERE total_stakes > 0
    `;

    const statsResult = await pool.query(statsQuery);
    const stats = statsResult.rows[0];

    const responseData = {
      totalVerusIDs: parseInt(stats.total_verusids) || 0,
      withActualData: parseInt(stats.with_actual_data) || 0,
      withEstimatedData: parseInt(stats.with_estimated_data) || 0,
      avgCompleteness: parseFloat(stats.avg_completeness) || 0,
      totalStakes: parseInt(stats.total_stakes) || 0,
      stakesWithAmounts: parseInt(stats.stakes_with_amounts) || 0,
      lastUpdated: stats.last_updated || new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: responseData,
    });
  } catch (error: any) {
    console.error('Error fetching APY quality stats:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch APY quality statistics',
      },
      { status: 500 }
    );
  }
}
