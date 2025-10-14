import { NextResponse } from 'next/server';
import { verusAPI } from '@/lib/rpc-client-robust';
import { redisClient } from '../../../../lib/cache/redis-client';
import { logger } from '@/lib/utils/logger';

/**
 * Mempool Statistics Endpoint
 * Provides real-time mempool statistics with caching
 */
export async function GET() {
  try {
    const cacheKey = 'mempool:stats';
    const cacheTTL = 10; // Cache for 10 seconds

    // Try cache first (ioredis exposes a `status` string: 'ready' when connected)
    if ((redisClient as any)?.status === 'ready') {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        logger.debug('✅ Mempool stats served from cache');
        return NextResponse.json(JSON.parse(cached));
      }
    }

    logger.info('📊 Fetching mempool statistics...');

    // Fetch data
    const [mempoolInfo, rawMempool] = await Promise.all([
      verusAPI.call('getmempoolinfo'),
      verusAPI.call('getrawmempool', [false]).catch(() => []),
    ]);

    // Calculate additional stats
    const txCount = Array.isArray(rawMempool) ? rawMempool.length : 0;

    const stats = {
      // Basic stats
      size: mempoolInfo.size || 0,
      bytes: mempoolInfo.bytes || 0,
      usage: mempoolInfo.usage || 0,
      maxmempool: mempoolInfo.maxmempool || 0,

      // Fees
      mempoolminfee: mempoolInfo.mempoolminfee || 0,
      minrelaytxfee: mempoolInfo.minrelaytxfee || 0,

      // Calculated stats
      usagePercentage:
        mempoolInfo.maxmempool > 0
          ? parseFloat(
              ((mempoolInfo.usage / mempoolInfo.maxmempool) * 100).toFixed(2)
            )
          : 0,
      avgTxSize:
        txCount > 0 ? Math.round(mempoolInfo.bytes / txCount) : 0,

      // Capacity info
      capacityUsed: mempoolInfo.usage || 0,
      capacityTotal: mempoolInfo.maxmempool || 0,
      capacityFree: (mempoolInfo.maxmempool || 0) - (mempoolInfo.usage || 0),

      // Status indicators
      status: getMempoolStatus(
        mempoolInfo.maxmempool > 0
          ? (mempoolInfo.usage / mempoolInfo.maxmempool) * 100
          : 0
      ),
      health: getMempoolHealth(mempoolInfo),
    };

    const response = {
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    };

    // Cache the result
    if ((redisClient as any)?.status === 'ready') {
      // Use SET with EX for compatibility
      await redisClient.set(cacheKey, JSON.stringify(response), 'EX', String(cacheTTL));
    }

    logger.info(`✅ Mempool stats: ${stats.size} transactions, ${stats.usagePercentage}% full`);

    return NextResponse.json(response);
  } catch (error: any) {
    logger.error('❌ Error fetching mempool stats:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch mempool statistics',
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * Get mempool status based on usage percentage
 */
function getMempoolStatus(usagePercentage: number): string {
  if (usagePercentage < 50) {
    return 'normal';
  } else if (usagePercentage < 75) {
    return 'moderate';
  } else if (usagePercentage < 90) {
    return 'high';
  } else {
    return 'critical';
  }
}

/**
 * Get mempool health assessment
 */
function getMempoolHealth(mempoolInfo: any): {
  status: string;
  message: string;
} {
  const usagePercentage =
    mempoolInfo.maxmempool > 0
      ? (mempoolInfo.usage / mempoolInfo.maxmempool) * 100
      : 0;

  if (usagePercentage < 50) {
    return {
      status: 'healthy',
      message: 'Mempool is operating normally',
    };
  } else if (usagePercentage < 75) {
    return {
      status: 'moderate',
      message: 'Mempool usage is moderate',
    };
  } else if (usagePercentage < 90) {
    return {
      status: 'elevated',
      message: 'Mempool usage is high - transactions may take longer',
    };
  } else {
    return {
      status: 'critical',
      message: 'Mempool is nearly full - high fees may be required',
    };
  }
}



