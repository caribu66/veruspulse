import { NextResponse } from 'next/server';
import { verusAPI } from '@/lib/rpc-client-robust';
import { addSecurityHeaders } from '@/lib/middleware/security';
import { logger } from '@/lib/utils/logger';

export async function GET() {
  try {
    logger.info('🔍 Fetching Verus identities...');

    // Get list of identities from Verus blockchain
    const identities = await verusAPI.listIdentities();

    logger.info(`✅ Found ${identities?.length || 0} identities`);

    // Handle null result (no identities registered)
    const identityList = identities || [];

    const response = NextResponse.json({
      success: true,
      data: {
        identities: identityList,
        count: identityList.length,
        timestamp: Date.now(),
      },
    });

    return addSecurityHeaders(response);
  } catch (error: any) {
    logger.error('❌ Failed to fetch identities:', error);

    const response = NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch identities',
        details: error.message,
        timestamp: Date.now(),
      },
      { status: 500 }
    );

    return addSecurityHeaders(response);
  }
}
