// Search Database Service for Verus Explorer
import { Pool } from 'pg';
import {
  SearchHistory,
  VerusIDSearch,
  SearchAnalytics,
} from '@/lib/models/search';
import { enhancedLogger } from '@/lib/utils/enhanced-logger';

export class SearchDatabaseService {
  private db: Pool;

  constructor(databaseUrl: string) {
    this.db = new Pool({
      connectionString: databaseUrl,
      max: 10, // Maximum number of connections
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  // Initialize database tables
  async initializeTables(): Promise<void> {
    try {
      // Create search_history table
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS search_history (
          id SERIAL PRIMARY KEY,
          search_query VARCHAR(255) NOT NULL,
          search_type VARCHAR(20) NOT NULL CHECK (search_type IN ('verusid', 'address', 'transaction', 'block', 'auto')),
          result_found BOOLEAN NOT NULL DEFAULT FALSE,
          result_data JSONB,
          user_agent TEXT,
          ip_address INET,
          timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        )
      `);

      // Create verusid_searches table
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS verusid_searches (
          id SERIAL PRIMARY KEY,
          search_history_id INTEGER REFERENCES search_history(id) ON DELETE CASCADE,
          verus_id VARCHAR(255) NOT NULL,
          identity_address VARCHAR(255),
          primary_addresses JSONB,
          friendly_name VARCHAR(255),
          fully_qualified_name VARCHAR(255),
          parent VARCHAR(255),
          minimum_signatures INTEGER,
          can_revoke BOOLEAN,
          private_address VARCHAR(255),
          content_map JSONB,
          revocation_authority VARCHAR(255),
          recovery_authority VARCHAR(255),
          time_lock INTEGER,
          flags INTEGER,
          version INTEGER,
          txid VARCHAR(64),
          height INTEGER,
          status VARCHAR(50),
          block_height INTEGER,
          has_history BOOLEAN DEFAULT FALSE,
          history_available BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        )
      `);

      // Create search_analytics table
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS search_analytics (
          id SERIAL PRIMARY KEY,
          search_type VARCHAR(20) NOT NULL,
          total_searches INTEGER NOT NULL DEFAULT 0,
          successful_searches INTEGER NOT NULL DEFAULT 0,
          failed_searches INTEGER NOT NULL DEFAULT 0,
          unique_users INTEGER NOT NULL DEFAULT 0,
          average_response_time DECIMAL(10,2) NOT NULL DEFAULT 0,
          date DATE NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          UNIQUE(search_type, date)
        )
      `);

      // Create indexes for better performance
      await this.db.query(`
        CREATE INDEX IF NOT EXISTS idx_search_history_query ON search_history(search_query);
        CREATE INDEX IF NOT EXISTS idx_search_history_type ON search_history(search_type);
        CREATE INDEX IF NOT EXISTS idx_search_history_timestamp ON search_history(timestamp);
        CREATE INDEX IF NOT EXISTS idx_verusid_searches_verus_id ON verusid_searches(verus_id);
        CREATE INDEX IF NOT EXISTS idx_verusid_searches_identity_address ON verusid_searches(identity_address);
        CREATE INDEX IF NOT EXISTS idx_search_analytics_type_date ON search_analytics(search_type, date);
      `);

      enhancedLogger.info('DATABASE', 'Search database tables initialized successfully');
    } catch (error) {
      enhancedLogger.error('DATABASE', 'Failed to initialize search database tables', error as Error);
      throw error;
    }
  }

  // Store a search in the database
  async storeSearch(search: Omit<SearchHistory, 'id' | 'createdAt' | 'updatedAt'>): Promise<SearchHistory> {
    const query = `
      INSERT INTO search_history (
        search_query, search_type, result_found, result_data, user_agent, ip_address, timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const values = [
      search.searchQuery,
      search.searchType,
      search.resultFound,
      search.resultData ? JSON.stringify(search.resultData) : null,
      search.userAgent,
      search.ipAddress,
      search.timestamp,
    ];

    try {
      const result = await this.db.query(query, values);
      const searchRecord = this.mapRowToSearchHistory(result.rows[0]);
      
      enhancedLogger.info('DATABASE', `Stored search: ${search.searchType} for "${search.searchQuery}"`);
      return searchRecord;
    } catch (error) {
      enhancedLogger.error('DATABASE', 'Failed to store search', error as Error);
      throw error;
    }
  }

  // Store a VerusID search result
  async storeVerusIDSearch(verusIDSearch: Omit<VerusIDSearch, 'id' | 'createdAt' | 'updatedAt'>): Promise<VerusIDSearch> {
    const query = `
      INSERT INTO verusid_searches (
        search_history_id, verus_id, identity_address, primary_addresses, friendly_name,
        fully_qualified_name, parent, minimum_signatures, can_revoke, private_address,
        content_map, revocation_authority, recovery_authority, time_lock, flags, version,
        txid, height, status, block_height, has_history, history_available
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      RETURNING *
    `;

    const values = [
      verusIDSearch.searchHistoryId,
      verusIDSearch.verusID,
      verusIDSearch.identityAddress,
      verusIDSearch.primaryAddresses ? JSON.stringify(verusIDSearch.primaryAddresses) : null,
      verusIDSearch.friendlyName,
      verusIDSearch.fullyQualifiedName,
      verusIDSearch.parent,
      verusIDSearch.minimumSignatures,
      verusIDSearch.canRevoke,
      verusIDSearch.privateAddress,
      verusIDSearch.contentMap ? JSON.stringify(verusIDSearch.contentMap) : null,
      verusIDSearch.revocationAuthority,
      verusIDSearch.recoveryAuthority,
      verusIDSearch.timeLock,
      verusIDSearch.flags,
      verusIDSearch.version,
      verusIDSearch.txid,
      verusIDSearch.height,
      verusIDSearch.status,
      verusIDSearch.blockHeight,
      verusIDSearch.hasHistory,
      verusIDSearch.historyAvailable,
    ];

    try {
      const result = await this.db.query(query, values);
      const verusIDRecord = this.mapRowToVerusIDSearch(result.rows[0]);
      
      enhancedLogger.info('DATABASE', `Stored VerusID search: ${verusIDSearch.verusID}`);
      return verusIDRecord;
    } catch (error) {
      enhancedLogger.error('DATABASE', 'Failed to store VerusID search', error as Error);
      throw error;
    }
  }

  // Get recent searches
  async getRecentSearches(limit: number = 50): Promise<SearchHistory[]> {
    const query = `
      SELECT * FROM search_history 
      ORDER BY timestamp DESC 
      LIMIT $1
    `;

    try {
      const result = await this.db.query(query, [limit]);
      return result.rows.map(row => this.mapRowToSearchHistory(row));
    } catch (error) {
      enhancedLogger.error('DATABASE', 'Failed to get recent searches', error as Error);
      throw error;
    }
  }

  // Get VerusID search statistics
  async getVerusIDSearchStats(): Promise<{
    totalSearches: number;
    uniqueVerusIDs: number;
    successfulSearches: number;
    mostSearchedVerusIDs: Array<{ verusID: string; count: number }>;
  }> {
    const query = `
      SELECT 
        COUNT(*) as total_searches,
        COUNT(DISTINCT vs.verus_id) as unique_verus_ids,
        COUNT(CASE WHEN sh.result_found = true THEN 1 END) as successful_searches
      FROM search_history sh
      LEFT JOIN verusid_searches vs ON sh.id = vs.search_history_id
      WHERE sh.search_type = 'verusid'
    `;

    const topSearchesQuery = `
      SELECT 
        vs.verus_id,
        COUNT(*) as search_count
      FROM verusid_searches vs
      JOIN search_history sh ON vs.search_history_id = sh.id
      GROUP BY vs.verus_id
      ORDER BY search_count DESC
      LIMIT 10
    `;

    try {
      const [statsResult, topSearchesResult] = await Promise.all([
        this.db.query(query),
        this.db.query(topSearchesQuery),
      ]);

      const stats = statsResult.rows[0];
      const topSearches = topSearchesResult.rows.map(row => ({
        verusID: row.verus_id,
        count: parseInt(row.search_count),
      }));

      return {
        totalSearches: parseInt(stats.total_searches) || 0,
        uniqueVerusIDs: parseInt(stats.unique_verus_ids) || 0,
        successfulSearches: parseInt(stats.successful_searches) || 0,
        mostSearchedVerusIDs: topSearches,
      };
    } catch (error) {
      enhancedLogger.error('DATABASE', 'Failed to get VerusID search stats', error as Error);
      throw error;
    }
  }

  // Update search analytics
  async updateSearchAnalytics(searchType: string, responseTime: number, success: boolean): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    
    const query = `
      INSERT INTO search_analytics (search_type, total_searches, successful_searches, failed_searches, average_response_time, date)
      VALUES ($1, 1, $2, $3, $4, $5)
      ON CONFLICT (search_type, date)
      DO UPDATE SET
        total_searches = search_analytics.total_searches + 1,
        successful_searches = search_analytics.successful_searches + $2,
        failed_searches = search_analytics.failed_searches + $3,
        average_response_time = (
          (search_analytics.average_response_time * search_analytics.total_searches + $4) / 
          (search_analytics.total_searches + 1)
        ),
        updated_at = NOW()
    `;

    const values = [
      searchType,
      success ? 1 : 0,
      success ? 0 : 1,
      responseTime,
      today,
    ];

    try {
      await this.db.query(query, values);
    } catch (error) {
      enhancedLogger.error('DATABASE', 'Failed to update search analytics', error as Error);
      // Don't throw here as this is not critical for the search functionality
    }
  }

  // Helper methods to map database rows to objects
  private mapRowToSearchHistory(row: any): SearchHistory {
    return {
      id: row.id,
      searchQuery: row.search_query,
      searchType: row.search_type,
      resultFound: row.result_found,
      resultData: row.result_data ? JSON.parse(row.result_data) : undefined,
      userAgent: row.user_agent,
      ipAddress: row.ip_address,
      timestamp: new Date(row.timestamp),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapRowToVerusIDSearch(row: any): VerusIDSearch {
    return {
      id: row.id,
      searchHistoryId: row.search_history_id,
      verusID: row.verus_id,
      identityAddress: row.identity_address,
      primaryAddresses: row.primary_addresses ? JSON.parse(row.primary_addresses) : undefined,
      friendlyName: row.friendly_name,
      fullyQualifiedName: row.fully_qualified_name,
      parent: row.parent,
      minimumSignatures: row.minimum_signatures,
      canRevoke: row.can_revoke,
      privateAddress: row.private_address,
      contentMap: row.content_map ? JSON.parse(row.content_map) : undefined,
      revocationAuthority: row.revocation_authority,
      recoveryAuthority: row.recovery_authority,
      timeLock: row.time_lock,
      flags: row.flags,
      version: row.version,
      txid: row.txid,
      height: row.height,
      status: row.status,
      blockHeight: row.block_height,
      hasHistory: row.has_history,
      historyAvailable: row.history_available,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  // Close database connection
  async close(): Promise<void> {
    await this.db.end();
  }
}




