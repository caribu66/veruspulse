import { type NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const dynamic = 'force-dynamic';

// GET: Fetch known addresses
export async function GET(_request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    const type = searchParams.get('type');

    let query = 'SELECT * FROM known_addresses';
    const params: any[] = [];
    const conditions: string[] = [];

    if (address) {
      conditions.push('address = $' + (params.length + 1));
      params.push(address);
    }

    if (type) {
      conditions.push('type = $' + (params.length + 1));
      params.push(type);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY name ASC';

    const result = await pool.query(query, params);

    return NextResponse.json({
      success: true,
      data: result.rows,
      count: result.rowCount,
    });
  } catch (error: any) {
    console.error('Error fetching known addresses:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch known addresses',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// POST: Add or update known address
export async function POST(_request: NextRequest) {
  try {
    const body = await request.json();
    const { address, name, type, description, website, verified } = body;

    if (!address || !name || !type) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: address, name, type',
        },
        { status: 400 }
      );
    }

    const validTypes = ['pool', 'staker', 'exchange', 'service', 'other'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid type. Must be one of: ${validTypes.join(', ')}`,
        },
        { status: 400 }
      );
    }

    const query = `
      INSERT INTO known_addresses (address, name, type, description, website, verified)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (address)
      DO UPDATE SET
        name = EXCLUDED.name,
        type = EXCLUDED.type,
        description = EXCLUDED.description,
        website = EXCLUDED.website,
        verified = EXCLUDED.verified,
        updated_at = NOW()
      RETURNING *
    `;

    const result = await pool.query(query, [
      address,
      name,
      type,
      description || null,
      website || null,
      verified || false,
    ]);

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Known address saved successfully',
    });
  } catch (error: any) {
    console.error('Error saving known address:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to save known address',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// DELETE: Remove known address
export async function DELETE(_request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameter: address',
        },
        { status: 400 }
      );
    }

    const query = 'DELETE FROM known_addresses WHERE address = $1 RETURNING *';
    const result = await pool.query(query, [address]);

    if (result.rowCount === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Address not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Known address deleted successfully',
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error deleting known address:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete known address',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
