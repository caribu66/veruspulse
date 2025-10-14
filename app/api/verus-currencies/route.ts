import { NextResponse } from 'next/server';
import { verusAPI } from '@/lib/rpc-client-robust';
import { addSecurityHeaders } from '@/lib/middleware/security';
import { logger } from '@/lib/utils/logger';

export async function GET() {
  try {
    logger.info('🔍 Fetching Verus currencies...');

    // Get current chain currency info - try different approaches
    let currencies = null;
    try {
      // First try with VRSCTEST (test network)
      currencies = await verusAPI.call('getcurrency', ['VRSCTEST']);
    } catch {
      try {
        // If that fails, try with VRSC (main chain)
        currencies = await verusAPI.call('getcurrency', ['VRSC']);
      } catch {
        try {
          // Try without parameters (some nodes might support this)
          currencies = await verusAPI.call('getcurrency');
        } catch {
          // If all fail, return basic chain info
          currencies = {
            name: 'VRSCTEST',
            fullyqualifiedname: 'VRSCTEST',
            version: 1,
            message:
              'Using basic chain info - getcurrency method not available with current parameters',
          };
        }
      }
    }

    logger.info(`✅ Retrieved currency info for current chain`);

    const response = NextResponse.json({
      success: true,
      data: {
        currency: currencies || null,
        count: currencies ? 1 : 0,
        timestamp: Date.now(),
      },
    });

    return addSecurityHeaders(response);
  } catch (error: any) {
    logger.error('❌ Failed to fetch currencies:', error);

    const response = NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch currencies',
        details: error.message,
        timestamp: Date.now(),
      },
      { status: 500 }
    );

    return addSecurityHeaders(response);
  }
}
