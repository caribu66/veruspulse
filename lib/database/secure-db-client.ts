import { Pool, PoolClient, QueryResult } from 'pg';
import { logger } from '@/lib/utils/logger';
import { SecurityMonitor } from '@/lib/security/security-monitor';

/**
 * Secure database query wrapper with SQL injection protection
 */
export class SecureDatabaseClient {
  private pool: Pool;
  private monitor: SecurityMonitor;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      ssl:
        process.env.NODE_ENV === 'production'
          ? { rejectUnauthorized: false }
          : false,
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
    });

    this.monitor = SecurityMonitor.getInstance();

    // Handle pool errors
    this.pool.on('error', err => {
      logger.error('Unexpected error on idle client', err);
    });
  }

  /**
   * Execute a parameterized query safely
   */
  async query<T = any>(
    text: string,
    params: any[] = [],
    client?: PoolClient
  ): Promise<QueryResult<T>> {
    const startTime = Date.now();

    try {
      // Validate query parameters
      this.validateQueryParameters(text, params);

      // Execute query
      const result = client
        ? await client.query<T>(text, params)
        : await this.pool.query<T>(text, params);

      const duration = Date.now() - startTime;

      // Log slow queries
      if (duration > 1000) {
        logger.warn('Slow query detected', {
          query: text.substring(0, 100),
          duration,
          rowCount: result.rowCount,
        });
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      logger.error('Database query error', {
        query: text.substring(0, 100),
        params: params.map(p =>
          typeof p === 'string' ? p.substring(0, 50) : p
        ),
        duration,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Check for potential SQL injection attempts
      if (this.isSQLInjectionAttempt(text, params)) {
        this.monitor.logEvent({
          type: 'SQL_INJECTION_ATTEMPT',
          severity: 'CRITICAL',
          ip: 'unknown', // Would need to pass request context
          userAgent: 'unknown',
          path: 'database',
          method: 'QUERY',
          details: {
            query: text.substring(0, 200),
            params: params.map(p =>
              typeof p === 'string' ? p.substring(0, 100) : p
            ),
            error: error instanceof Error ? error.message : 'Unknown error',
          },
          blocked: true,
        });
      }

      throw error;
    }
  }

  /**
   * Execute multiple queries in a transaction
   */
  async transaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get a client from the pool for manual transaction management
   */
  async getClient(): Promise<PoolClient> {
    return await this.pool.connect();
  }

  /**
   * Close the database connection pool
   */
  async close(): Promise<void> {
    await this.pool.end();
  }

  /**
   * Validate query parameters to prevent SQL injection
   */
  private validateQueryParameters(text: string, params: any[]): void {
    // Check for suspicious patterns in the query text
    const suspiciousPatterns = [
      /;\s*drop\s+table/i,
      /;\s*delete\s+from/i,
      /;\s*update\s+.*\s+set/i,
      /union\s+select/i,
      /insert\s+into/i,
      /create\s+table/i,
      /alter\s+table/i,
      /exec\s*\(/i,
      /sp_\w+/i,
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(text)) {
        throw new Error('Potentially dangerous SQL operation detected');
      }
    }

    // Validate parameter types
    for (const param of params) {
      if (typeof param === 'string') {
        // Check for SQL injection patterns in string parameters
        const injectionPatterns = [
          /['"]\s*;\s*drop/i,
          /['"]\s*;\s*delete/i,
          /['"]\s*;\s*update/i,
          /union\s+select/i,
          /--\s*$/,
          /\/\*.*?\*\//,
        ];

        for (const pattern of injectionPatterns) {
          if (pattern.test(param)) {
            throw new Error('SQL injection attempt detected in parameter');
          }
        }
      }
    }
  }

  /**
   * Check if a query error indicates a SQL injection attempt
   */
  private isSQLInjectionAttempt(text: string, params: any[]): boolean {
    const injectionIndicators = [
      'syntax error',
      'unexpected token',
      'invalid syntax',
      'near "union"',
      'near "drop"',
      'near "delete"',
      'near "update"',
      'near "insert"',
    ];

    const queryText = text.toLowerCase();
    const paramText = params
      .map(p => String(p))
      .join(' ')
      .toLowerCase();
    const combinedText = queryText + ' ' + paramText;

    return injectionIndicators.some(indicator =>
      combinedText.includes(indicator)
    );
  }
}

/**
 * Database query builder with security features
 */
export class SecureQueryBuilder {
  private query: string = '';
  private params: any[] = [];
  private paramIndex: number = 1;

  /**
   * Add a SELECT clause
   */
  select(columns: string | string[]): SecureQueryBuilder {
    const cols = Array.isArray(columns) ? columns.join(', ') : columns;
    this.query += `SELECT ${cols}`;
    return this;
  }

  /**
   * Add a FROM clause
   */
  from(table: string): SecureQueryBuilder {
    this.query += ` FROM ${this.escapeIdentifier(table)}`;
    return this;
  }

  /**
   * Add a WHERE clause
   */
  where(condition: string, ...params: any[]): SecureQueryBuilder {
    this.query += ` WHERE ${condition}`;
    this.params.push(...params);
    return this;
  }

  /**
   * Add an AND condition
   */
  and(condition: string, ...params: any[]): SecureQueryBuilder {
    this.query += ` AND ${condition}`;
    this.params.push(...params);
    return this;
  }

  /**
   * Add an OR condition
   */
  or(condition: string, ...params: any[]): SecureQueryBuilder {
    this.query += ` OR ${condition}`;
    this.params.push(...params);
    return this;
  }

  /**
   * Add an ORDER BY clause
   */
  orderBy(
    column: string,
    direction: 'ASC' | 'DESC' = 'ASC'
  ): SecureQueryBuilder {
    this.query += ` ORDER BY ${this.escapeIdentifier(column)} ${direction}`;
    return this;
  }

  /**
   * Add a LIMIT clause
   */
  limit(count: number): SecureQueryBuilder {
    this.query += ` LIMIT $${this.paramIndex}`;
    this.params.push(count);
    this.paramIndex++;
    return this;
  }

  /**
   * Add an OFFSET clause
   */
  offset(count: number): SecureQueryBuilder {
    this.query += ` OFFSET $${this.paramIndex}`;
    this.params.push(count);
    this.paramIndex++;
    return this;
  }

  /**
   * Build the final query
   */
  build(): { query: string; params: any[] } {
    return {
      query: this.query,
      params: this.params,
    };
  }

  /**
   * Escape SQL identifiers to prevent injection
   */
  private escapeIdentifier(identifier: string): string {
    // Only allow alphanumeric characters, underscores, and dots
    if (!/^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(identifier)) {
      throw new Error('Invalid SQL identifier');
    }
    return `"${identifier}"`;
  }
}

/**
 * Common database operations with security
 */
export class DatabaseOperations {
  private db: SecureDatabaseClient;

  constructor(db: SecureDatabaseClient) {
    this.db = db;
  }

  /**
   * Get a record by ID safely
   */
  async getById<T>(table: string, id: string | number): Promise<T | null> {
    const builder = new SecureQueryBuilder();
    const { query, params } = builder
      .select('*')
      .from(table)
      .where('id = $1', id)
      .build();

    const result = await this.db.query<T>(query, params);
    return result.rows[0] || null;
  }

  /**
   * Get records with pagination safely
   */
  async getPaginated<T>(
    table: string,
    page: number = 1,
    limit: number = 10,
    orderBy: string = 'id',
    orderDirection: 'ASC' | 'DESC' = 'DESC'
  ): Promise<{ data: T[]; total: number; page: number; limit: number }> {
    const offset = (page - 1) * limit;

    // Get total count
    const countBuilder = new SecureQueryBuilder();
    const countQuery = countBuilder.select('COUNT(*)').from(table).build();

    const countResult = await this.db.query<{ count: string }>(
      countQuery.query,
      countQuery.params
    );
    const total = parseInt(countResult.rows[0].count);

    // Get paginated data
    const dataBuilder = new SecureQueryBuilder();
    const dataQuery = dataBuilder
      .select('*')
      .from(table)
      .orderBy(orderBy, orderDirection)
      .limit(limit)
      .offset(offset)
      .build();

    const dataResult = await this.db.query<T>(
      dataQuery.query,
      dataQuery.params
    );

    return {
      data: dataResult.rows,
      total,
      page,
      limit,
    };
  }

  /**
   * Search records safely
   */
  async search<T>(
    table: string,
    searchTerm: string,
    searchColumns: string[],
    page: number = 1,
    limit: number = 10
  ): Promise<{ data: T[]; total: number; page: number; limit: number }> {
    const offset = (page - 1) * limit;
    const searchPattern = `%${searchTerm}%`;

    // Build search conditions
    const searchConditions = searchColumns
      .map((col, index) => `${col} ILIKE $${index + 1}`)
      .join(' OR ');

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM ${table} WHERE ${searchConditions}`;
    const countParams = searchColumns.map(() => searchPattern);
    const countResult = await this.db.query<{ count: string }>(
      countQuery,
      countParams
    );
    const total = parseInt(countResult.rows[0].count);

    // Get search results
    const dataQuery = `
      SELECT * FROM ${table} 
      WHERE ${searchConditions} 
      ORDER BY id DESC 
      LIMIT $${searchColumns.length + 1} 
      OFFSET $${searchColumns.length + 2}
    `;
    const dataParams = [...countParams, limit, offset];
    const dataResult = await this.db.query<T>(dataQuery, dataParams);

    return {
      data: dataResult.rows,
      total,
      page,
      limit,
    };
  }
}
