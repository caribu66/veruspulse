import { type NextRequest, NextResponse } from 'next/server';
import { SearchDatabaseService } from '@/lib/services/search-database';
import { enhancedLogger } from '@/lib/utils/enhanced-logger';
import { addSecurityHeaders } from '@/lib/middleware/security';

export async function GET(request: NextRequest) {
  let searchDb: SearchDatabaseService | null = null;

  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        {
          success: false,
          error: 'Search database not configured',
        },
        { status: 503 }
      );
    }

    searchDb = new SearchDatabaseService(process.env.DATABASE_URL);
    await searchDb.initializeTables();

    const [recentSearches, verusIDStats] = await Promise.all([
      searchDb.getRecentSearches(20),
      searchDb.getVerusIDSearchStats(),
    ]);

    const stats = {
      recentSearches,
      verusIDStats,
      timestamp: new Date().toISOString(),
    };

    enhancedLogger.info('API', 'Retrieved search statistics');

    const response = NextResponse.json({
      success: true,
      data: stats,
    });

    return addSecurityHeaders(response);
  } catch (error) {
    enhancedLogger.error(
      'API',
      'Failed to get search statistics',
      error as Error
    );

    const response = NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve search statistics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );

    return addSecurityHeaders(response);
  } finally {
    if (searchDb) {
      try {
        await searchDb.close();
      } catch (error) {
        enhancedLogger.warn(
          'DATABASE',
          'Failed to close search database connection',
          { error: (error as Error).message }
        );
      }
    }
  }
}
