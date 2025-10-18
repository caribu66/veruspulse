import { NextRequest, NextResponse } from 'next/server';
import { CacheManager } from '@/lib/cache/cache-utils';
import { CachedRPCClient } from '@/lib/cache/cached-rpc-client';
import { addSecurityHeaders } from '@/lib/middleware/security';
import { logger } from '@/lib/utils/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'stats':
        const stats = await CacheManager.getStats();
        return NextResponse.json({
          success: true,
          data: stats,
          timestamp: new Date().toISOString(),
        });

      case 'health':
        // Test Redis connection
        const testKey = 'health:test';
        await CacheManager.set(testKey, 'ok', 5);
        const healthCheck = await CacheManager.get(testKey);
        await CacheManager.delete(testKey);

        return NextResponse.json({
          success: true,
          data: {
            redis: healthCheck === 'ok',
            timestamp: new Date().toISOString(),
          },
        });

      default:
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid action. Use ?action=stats or ?action=health',
          },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.error('❌ Cache API error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Cache operation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const identifier = searchParams.get('identifier');

    let result = false;

    switch (type) {
      case 'all':
        result = await CacheManager.clearAll();
        logger.info('🗑️ All cache cleared via API');
        break;

      case 'blockchain':
        await CachedRPCClient.invalidateCache('blockchain');
        result = true;
        logger.info('🗑️ Blockchain cache cleared via API');
        break;

      case 'block':
        if (identifier) {
          await CachedRPCClient.invalidateCache('block', identifier);
          result = true;
          logger.info(`🗑️ Block cache cleared for: ${identifier}`);
        } else {
          return NextResponse.json(
            {
              success: false,
              error: 'Block identifier required for block cache clearing',
            },
            { status: 400 }
          );
        }
        break;

      case 'transaction':
        if (identifier) {
          await CachedRPCClient.invalidateCache('transaction', identifier);
          result = true;
          logger.info(`🗑️ Transaction cache cleared for: ${identifier}`);
        } else {
          return NextResponse.json(
            {
              success: false,
              error:
                'Transaction identifier required for transaction cache clearing',
            },
            { status: 400 }
          );
        }
        break;

      case 'address':
        if (identifier) {
          await CachedRPCClient.invalidateCache('address', identifier);
          result = true;
          logger.info(`🗑️ Address cache cleared for: ${identifier}`);
        } else {
          return NextResponse.json(
            {
              success: false,
              error: 'Address identifier required for address cache clearing',
            },
            { status: 400 }
          );
        }
        break;

      case 'verusid':
        if (identifier) {
          await CachedRPCClient.invalidateCache('verusid', identifier);
          result = true;
          logger.info(`🗑️ VerusID cache cleared for: ${identifier}`);
        } else {
          await CachedRPCClient.invalidateCache('verusid');
          result = true;
          logger.info('🗑️ All VerusID cache cleared');
        }
        break;

      default:
        return NextResponse.json(
          {
            success: false,
            error:
              'Invalid cache type. Use: all, blockchain, block, transaction, address, or verusid',
          },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: result,
      message: `Cache cleared for type: ${type}${identifier ? ` (${identifier})` : ''}`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('❌ Cache deletion error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Cache deletion failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
