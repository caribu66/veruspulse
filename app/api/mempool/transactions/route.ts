import { type NextRequest, NextResponse } from 'next/server';
import { verusAPI } from '@/lib/rpc-client-robust';
import { addSecurityHeaders } from '@/lib/middleware/security';
import { logger } from '@/lib/utils/logger';

export async function GET(request: NextRequest) {
  try {
    logger.info('🔍 Fetching mempool transactions...');

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const _verbose = searchParams.get('verbose') === 'true';

    // Get raw mempool transactions with verbose details
    const rawMempool = await verusAPI.getRawMempool(true);

    if (!rawMempool || typeof rawMempool !== 'object') {
      return NextResponse.json({
        success: true,
        data: {
          transactions: [],
          count: 0,
          timestamp: Date.now(),
        },
      });
    }

    // Convert verbose mempool object to array and get detailed transaction information
    const transactions = [];
    const txIds = Object.keys(rawMempool).slice(0, limit);

    for (const txId of txIds) {
      try {
        const txInfo = rawMempool[txId];
        if (txInfo) {
          transactions.push({
            txid: txId,
            size: txInfo.size || 0,
            fee: txInfo.fee || 0,
            time: txInfo.time || 0,
            height: txInfo.height || 0,
            startingpriority: txInfo.startingpriority || 0,
            currentpriority: txInfo.currentpriority || 0,
            depends: txInfo.depends || [],
            spentby: txInfo.spentby || [],
          });
        }
      } catch (error) {
        logger.warn(`Failed to process transaction ${txId}:`, error);
        // Add basic transaction info even if processing fails
        transactions.push({
          txid: txId,
          size: 0,
          fee: 0,
          time: Date.now() / 1000,
          height: 0,
          startingpriority: 0,
          currentpriority: 0,
          depends: [],
          spentby: [],
        });
      }
    }

    // Sort by time (newest first)
    transactions.sort((a, b) => b.time - a.time);

    logger.info(`✅ Retrieved ${transactions.length} mempool transactions`);

    const response = NextResponse.json({
      success: true,
      data: {
        transactions,
        count: transactions.length,
        total: rawMempool.length,
        timestamp: Date.now(),
      },
    });

    return addSecurityHeaders(response);
  } catch (error: any) {
    logger.error('❌ Failed to fetch mempool transactions:', error);

    const response = NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch mempool transactions',
        details: error.message,
        timestamp: Date.now(),
      },
      { status: 500 }
    );

    return addSecurityHeaders(response);
  }
}
