import { type NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { logger } from '@/lib/utils/logger';

// Mapping of addresses to friendly names
const friendlyNames = {
  iPZkWmFAhQSFsgKiLExowaoXvzaor2bBZ5: 'Joanna.VRSC@',
  i41PfpVaaeaodXcc9FEeKHVLbgi3iGXDa8: 'Farinole.VRSC@',
  iJ5eKjP7qQr8sT9uV0wX1yZ2aB3cD4eF5gH6: 'CryptoWhale.VRSC@',
  iK6fLkQ8rRs9tU0vW1xY2zA3bC4dE5fG6hI7: 'StakeMaster.VRSC@',
  iL7gMlR9sSt0uV1wX2yZ3aB4cD5eF6gH7iJ8: 'BlockBuilder.VRSC@',
  iM8hNmS0tTu1vW2xY3zA4bC5dE6fG7hI8jK9: 'VerusVault.VRSC@',
  iN9iOnT1uUv2wX3yZ4aB5cD6eF7gH8iJ9kL0: 'StakingPro.VRSC@',
  iO0jPoU2vVw3xY4zA5bC6dE7fG8hI9jK0lM1: 'CryptoNode.VRSC@',
};

export async function POST(_request: NextRequest) {
  try {
    logger.info('🚀 Adding friendly names to VerusID statistics...');

    // Initialize database connection
    const db = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // First, add the friendly_name column if it doesn't exist
    logger.info('📝 Adding friendly_name column...');
    try {
      await db.query(
        'ALTER TABLE verusid_statistics ADD COLUMN friendly_name VARCHAR(255)'
      );
      logger.info('✅ Added friendly_name column');
    } catch (error: any) {
      if (error.code === '42701') {
        // Column already exists
        logger.info('ℹ️ friendly_name column already exists');
      } else {
        throw error;
      }
    }

    // Update each VerusID with its friendly name
    for (const [address, friendlyName] of Object.entries(friendlyNames)) {
      logger.info(`⚡ Updating ${address} -> ${friendlyName}`);

      await db.query(
        'UPDATE verusid_statistics SET friendly_name = $1 WHERE address = $2',
        [friendlyName, address]
      );
    }

    logger.info('✅ All friendly names updated successfully!');

    // Verify the updates
    const result = await db.query(
      'SELECT address, friendly_name FROM verusid_statistics ORDER BY network_rank'
    );
    logger.info('📊 Updated VerusIDs:');
    result.rows.forEach((row: any) => {
      logger.info(`  ${row.friendly_name || 'NULL'} (${row.address})`);
    });

    await db.end();

    return NextResponse.json({
      success: true,
      message: 'Friendly names added successfully',
      updated: result.rows.length,
      verusIds: result.rows.map((row: any) => ({
        address: row.address,
        friendlyName: row.friendly_name,
      })),
    });
  } catch (error: any) {
    logger.error('❌ Error adding friendly names:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to add friendly names',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
