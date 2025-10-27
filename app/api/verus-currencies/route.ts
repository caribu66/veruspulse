import { NextResponse } from 'next/server';
import { verusAPI } from '@/lib/rpc-client-robust';
import { verusClientWithFallback } from '@/lib/rpc-client-with-fallback';
import { addSecurityHeaders } from '@/lib/middleware/security';
import { logger } from '@/lib/utils/logger';

export async function GET() {
  try {
    logger.info('🔍 Fetching Verus currencies...');

    // Get current chain currency info with proper fallback support
    let currencies = null;
    let usingFallback = false;

    try {
      // First try with VRSCTEST (test network)
      currencies = await verusClientWithFallback.getCurrencyInfo('VRSCTEST');
      usingFallback = verusClientWithFallback.isUsingFallback();
    } catch {
      try {
        // If that fails, try with VRSC (main chain)
        currencies = await verusClientWithFallback.getCurrencyInfo('VRSC');
        usingFallback = verusClientWithFallback.isUsingFallback();
      } catch {
        try {
          // Try without parameters (some nodes might support this)
          currencies = await verusAPI.call('getcurrency');
        } catch {
          // If all fail, return error instead of fake data
          throw new Error(
            'Unable to retrieve currency information from any source'
          );
        }
      }
    }

    logger.info(`✅ Retrieved currency info for current chain`);

    const response = NextResponse.json({
      success: true,
      data: {
        currency: currencies || null,
        count: currencies ? 1 : 0,
        usingFallback: usingFallback,
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
