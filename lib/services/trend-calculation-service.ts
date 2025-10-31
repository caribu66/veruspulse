import { type Pool } from 'pg';

export class TrendCalculationService {
  private db: Pool;

  constructor(db: Pool) {
    this.db = db;
  }

  /**
   * Calculate trends for all VerusIDs with recent activity
   */
  async calculateAllTrends(): Promise<void> {
    try {
      console.info('Starting trend calculation for all VerusIDs...');

      // Get all VerusIDs with recent staking activity (direct I-address stakes only)
      const verusidsQuery = `
        SELECT DISTINCT identity_address 
        FROM staking_rewards 
        WHERE block_time >= NOW() - INTERVAL '14 days'
          AND source_address = identity_address
        ORDER BY identity_address
      `;

      const result = await this.db.query(verusidsQuery);
      const verusids = result.rows.map(row => row.identity_address);

      console.info(`Found ${verusids.length} VerusIDs with recent activity`);

      // Calculate trends for each VerusID
      for (const address of verusids) {
        try {
          await this.calculateTrendsForVerusID(address);
        } catch (error) {
          console.error(`Error calculating trends for ${address}:`, error);
        }
      }

      console.info('Trend calculation completed for all VerusIDs');
    } catch (error) {
      console.error('Error in calculateAllTrends:', error);
      throw error;
    }
  }

  /**
   * Calculate trends for a specific VerusID
   */
  async calculateTrendsForVerusID(address: string): Promise<void> {
    await this.db.query('SELECT calculate_verusid_trends($1)', [address]);
  }

  /**
   * Get trending VerusIDs with enhanced metrics
   */
  async getTrendingVerusIDs(limit: number = 10): Promise<any[]> {
    const query = `
      SELECT 
        tm.verusid_address,
        tm.recent_stakes_7d,
        tm.recent_rewards_7d,
        tm.recent_views_7d,
        tm.stake_trend_percent,
        tm.reward_trend_percent,
        tm.view_trend_percent,
        tm.overall_trend_score,
        tm.last_calculated,
        -- Get additional metrics from verusid_statistics
        vs.friendly_name,
        vs.total_stakes,
        vs.total_rewards_satoshis,
        vs.apy_all_time,
        vs.apy_30d,
        vs.staking_efficiency,
        vs.network_rank,
        -- Get view data
        COALESCE(dv.total_views, 0) as total_views_7d
      FROM verusid_trend_metrics tm
      LEFT JOIN verusid_statistics vs ON tm.verusid_address = vs.address
      LEFT JOIN (
        SELECT 
          verusid_address,
          SUM(total_views) as total_views
        FROM verusid_daily_views
        WHERE view_date >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY verusid_address
      ) dv ON tm.verusid_address = dv.verusid_address
      WHERE tm.last_calculated >= NOW() - INTERVAL '2 hours'
      ORDER BY tm.overall_trend_score DESC NULLS LAST
      LIMIT $1
    `;

    const result = await this.db.query(query, [limit]);
    return result.rows;
  }

  /**
   * Update trend metrics for VerusIDs that need recalculation
   */
  async updateStaleTrends(): Promise<void> {
    const query = `
      SELECT DISTINCT identity_address 
      FROM staking_rewards 
      WHERE block_time >= NOW() - INTERVAL '14 days'
        AND source_address = identity_address
        AND identity_address NOT IN (
          SELECT verusid_address 
          FROM verusid_trend_metrics 
          WHERE last_calculated >= NOW() - INTERVAL '1 hour'
        )
    `;

    const result = await this.db.query(query);
    const staleAddresses = result.rows.map(row => row.identity_address);

    console.info(
      `Found ${staleAddresses.length} VerusIDs with stale trend data`
    );

    for (const address of staleAddresses) {
      try {
        await this.calculateTrendsForVerusID(address);
      } catch (error) {
        console.error(`Error updating trends for ${address}:`, error);
      }
    }
  }

  /**
   * Get performance metrics for progress bars
   */
  async getPerformanceMetrics(): Promise<{
    maxRewards: number;
    maxViews: number;
    maxStakes: number;
    maxTrend: number;
  }> {
    const query = `
      SELECT 
        MAX(recent_rewards_7d) as max_rewards,
        MAX(recent_views_7d) as max_views,
        MAX(recent_stakes_7d) as max_stakes,
        MAX(overall_trend_score) as max_trend
      FROM verusid_trend_metrics
      WHERE last_calculated >= NOW() - INTERVAL '2 hours'
    `;

    const result = await this.db.query(query);
    const row = result.rows[0];

    return {
      maxRewards: parseFloat(row.max_rewards) || 0,
      maxViews: parseFloat(row.max_views) || 0,
      maxStakes: parseFloat(row.max_stakes) || 0,
      maxTrend: parseFloat(row.max_trend) || 0,
    };
  }
}
