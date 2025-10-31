import { type Pool } from 'pg';

export interface ViewAnalytics {
  entityType: string;
  entityId: string;
  viewCount: number;
  uniqueViews: number;
  lastViewedAt?: Date;
}

export interface SearchAnalytics {
  searchQuery: string;
  searchType: string;
  resultCount: number;
  searchCount: number;
  lastSearchedAt?: Date;
}

export interface TrendingScore {
  entityType: string;
  entityId: string;
  score24h: number;
  score7d: number;
  score30d: number;
  trendDirection: 'up' | 'down' | 'stable';
  trendPercentage: number;
}

export class AnalyticsService {
  private db: Pool;

  constructor(db: Pool) {
    this.db = db;
  }

  /**
   * Record a view for an entity
   */
  async recordView(
    entityType: string,
    entityId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      // Update view count
      await this.db.query('SELECT update_view_count($1, $2)', [
        entityType,
        entityId,
      ]);

      // Record view history
      if (ipAddress || userAgent) {
        await this.db.query('SELECT record_view_history($1, $2, $3, $4)', [
          entityType,
          entityId,
          ipAddress,
          userAgent,
        ]);
      }

      // Update trending scores entry if it doesn't exist
      await this.db.query(
        `INSERT INTO trending_scores (entity_type, entity_id)
         VALUES ($1, $2)
         ON CONFLICT (entity_type, entity_id) DO NOTHING`,
        [entityType, entityId]
      );
    } catch (error) {
      console.error('Error recording view:', error);
      // Don't throw - analytics failures shouldn't break the app
    }
  }

  /**
   * Record a search query
   */
  async recordSearch(
    searchQuery: string,
    searchType: string,
    resultCount: number
  ): Promise<void> {
    try {
      await this.db.query('SELECT update_search_analytics($1, $2, $3)', [
        searchQuery,
        searchType,
        resultCount,
      ]);
    } catch (error) {
      console.error('Error recording search:', error);
    }
  }

  /**
   * Get view analytics for an entity
   */
  async getViewAnalytics(
    entityType: string,
    entityId: string
  ): Promise<ViewAnalytics | null> {
    try {
      const result = await this.db.query(
        `SELECT entity_type, entity_id, view_count, unique_views, last_viewed_at
         FROM view_analytics
         WHERE entity_type = $1 AND entity_id = $2`,
        [entityType, entityId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        entityType: row.entity_type,
        entityId: row.entity_id,
        viewCount: row.view_count,
        uniqueViews: row.unique_views,
        lastViewedAt: row.last_viewed_at,
      };
    } catch (error) {
      console.error('Error getting view analytics:', error);
      return null;
    }
  }

  /**
   * Get trending scores for an entity
   */
  async getTrendingScore(
    entityType: string,
    entityId: string
  ): Promise<TrendingScore | null> {
    try {
      const result = await this.db.query(
        `SELECT entity_type, entity_id, score_24h, score_7d, score_30d,
                trend_direction, trend_percentage
         FROM trending_scores
         WHERE entity_type = $1 AND entity_id = $2`,
        [entityType, entityId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        entityType: row.entity_type,
        entityId: row.entity_id,
        score24h: parseFloat(row.score_24h) || 0,
        score7d: parseFloat(row.score_7d) || 0,
        score30d: parseFloat(row.score_30d) || 0,
        trendDirection: row.trend_direction,
        trendPercentage: parseFloat(row.trend_percentage) || 0,
      };
    } catch (error) {
      console.error('Error getting trending score:', error);
      return null;
    }
  }

  /**
   * Get top trending entities
   */
  async getTopTrending(
    entityType: string,
    timeRange: '24h' | '7d' | '30d' = '24h',
    limit: number = 10
  ): Promise<TrendingScore[]> {
    try {
      const scoreColumn = `score_${timeRange}`;
      const result = await this.db.query(
        `SELECT entity_type, entity_id, score_24h, score_7d, score_30d,
                trend_direction, trend_percentage
         FROM trending_scores
         WHERE entity_type = $1
         ORDER BY ${scoreColumn} DESC
         LIMIT $2`,
        [entityType, limit]
      );

      return result.rows.map(row => ({
        entityType: row.entity_type,
        entityId: row.entity_id,
        score24h: parseFloat(row.score_24h) || 0,
        score7d: parseFloat(row.score_7d) || 0,
        score30d: parseFloat(row.score_30d) || 0,
        trendDirection: row.trend_direction,
        trendPercentage: parseFloat(row.trend_percentage) || 0,
      }));
    } catch (error) {
      console.error('Error getting top trending:', error);
      return [];
    }
  }

  /**
   * Get popular searches
   */
  async getPopularSearches(
    searchType?: string,
    limit: number = 10
  ): Promise<SearchAnalytics[]> {
    try {
      let query = `SELECT search_query, search_type, result_count, search_count, last_searched_at
                   FROM search_analytics`;
      const params: any[] = [];

      if (searchType) {
        query += ` WHERE search_type = $1`;
        params.push(searchType);
        query += ` ORDER BY search_count DESC LIMIT $2`;
        params.push(limit);
      } else {
        query += ` ORDER BY search_count DESC LIMIT $1`;
        params.push(limit);
      }

      const result = await this.db.query(query, params);

      return result.rows.map(row => ({
        searchQuery: row.search_query,
        searchType: row.search_type,
        resultCount: row.result_count,
        searchCount: row.search_count,
        lastSearchedAt: row.last_searched_at,
      }));
    } catch (error) {
      console.error('Error getting popular searches:', error);
      return [];
    }
  }

  /**
   * Calculate trending scores for all entities
   * This should be run periodically (e.g., via cron)
   */
  async calculateTrendingScores(): Promise<void> {
    try {
      await this.db.query('SELECT calculate_trending_scores()');
    } catch (error) {
      console.error('Error calculating trending scores:', error);
    }
  }

  /**
   * Clean up old view history
   * This should be run periodically (e.g., via cron)
   */
  async cleanupOldHistory(): Promise<void> {
    try {
      await this.db.query('SELECT cleanup_old_view_history()');
    } catch (error) {
      console.error('Error cleaning up old history:', error);
    }
  }
}
