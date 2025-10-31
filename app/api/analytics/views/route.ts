import { type NextRequest, NextResponse } from 'next/server';
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

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { verusidAddress, sessionId } = body;

    if (!verusidAddress) {
      return NextResponse.json(
        {
          success: false,
          error: 'VerusID address is required',
        },
        { status: 400 }
      );
    }

    // Get client IP and user agent
    const ip =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || '';
    const referrer = request.headers.get('referer') || '';

    // Insert view record
    const query = `
      INSERT INTO verusid_views (
        verusid_address,
        ip_address,
        user_agent,
        referrer,
        session_id
      ) VALUES ($1, $2, $3, $4, $5)
    `;

    await db.query(query, [verusidAddress, ip, userAgent, referrer, sessionId]);

    return NextResponse.json({
      success: true,
      message: 'View tracked successfully',
    });
  } catch (error: any) {
    console.error('Error tracking view:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to track view',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
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

    const searchParams = request.nextUrl.searchParams;
    const verusidAddress = searchParams.get('address');
    const period = searchParams.get('period') || '7d';

    let intervalClause = '';
    switch (period) {
      case '1d':
        intervalClause = "view_date >= CURRENT_DATE - INTERVAL '1 day'";
        break;
      case '7d':
        intervalClause = "view_date >= CURRENT_DATE - INTERVAL '7 days'";
        break;
      case '30d':
        intervalClause = "view_date >= CURRENT_DATE - INTERVAL '30 days'";
        break;
      default:
        intervalClause = "view_date >= CURRENT_DATE - INTERVAL '7 days'";
    }

    let query = `
      SELECT
        verusid_address,
        SUM(total_views) as total_views,
        SUM(unique_views) as unique_views
      FROM verusid_daily_views
      WHERE ${intervalClause}
    `;

    const params: any[] = [];

    if (verusidAddress) {
      query += ' AND verusid_address = $1';
      params.push(verusidAddress);
    }

    query += ' GROUP BY verusid_address ORDER BY total_views DESC';

    const result = await db.query(query, params);

    return NextResponse.json({
      success: true,
      data: {
        views: result.rows,
        period,
        total: result.rows.length,
      },
    });
  } catch (error: any) {
    console.error('Error fetching view data:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch view data',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
