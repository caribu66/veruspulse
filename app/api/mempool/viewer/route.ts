import { NextRequest, NextResponse } from 'next/server';
import { verusAPI } from '@/lib/rpc-client-robust';
import { CachedRPCClient } from '@/lib/cache/cached-rpc-client';
import { logger } from '@/lib/utils/logger';

/**
 * Comprehensive Mempool Viewer Endpoint
 * Provides detailed view of pending transactions with statistics
 * Based on verus-explorer pattern from official Verus GitHub
 */
export async function GET(request: NextRequest) {
  try {
    logger.info('📊 Fetching comprehensive mempool data...');

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const includeTransactions = searchParams.get('transactions') !== 'false';

    // Use batch RPC for better performance
    const results = await verusAPI.batch([
      { method: 'getmempoolinfo' },
      { method: 'getblockchaininfo' },
    ]);

    const [mempoolInfoResult, blockchainInfoResult] = results;

    if (mempoolInfoResult.error) {
      throw new Error(
        mempoolInfoResult.error.message || 'Failed to fetch mempool info'
      );
    }

    const mempoolInfo = mempoolInfoResult.result;
    const blockchainInfo = blockchainInfoResult.result;

    // Get transaction list if requested
    let transactions = [];
    let totalFees = 0;
    let avgFee = 0;
    let avgSize = 0;

    if (includeTransactions && mempoolInfo.size > 0) {
      try {
        // Get raw mempool with verbose details
        const rawMempool = await verusAPI.call('getrawmempool', [true]);

        if (rawMempool && typeof rawMempool === 'object') {
          // Get details for first N transactions
          const txIds = Object.keys(rawMempool).slice(0, limit);

          for (const txId of txIds) {
            try {
              const entry = rawMempool[txId];

              if (entry) {
                transactions.push({
                  txid: txId,
                  size: entry.size || 0,
                  fee: entry.fee || 0,
                  modifiedfee: entry.modifiedfee || 0,
                  time: entry.time || 0,
                  height: entry.height || 0,
                  startingpriority: entry.startingpriority || 0,
                  currentpriority: entry.currentpriority || 0,
                  descendantcount: entry.descendantcount || 0,
                  descendantsize: entry.descendantsize || 0,
                  descendantfees: entry.descendantfees || 0,
                  ancestorcount: entry.ancestorcount || 0,
                  ancestorsize: entry.ancestorsize || 0,
                  ancestorfees: entry.ancestorfees || 0,
                  depends: entry.depends || [],
                });

                totalFees += entry.fee || 0;
              }
            } catch (error: any) {
              logger.warn(
                `⚠️  Failed to process entry for ${txId}:`,
                error.message
              );
            }
          }

          // Calculate averages
          if (transactions.length > 0) {
            avgFee = totalFees / transactions.length;
            avgSize =
              transactions.reduce((sum, tx) => sum + tx.size, 0) /
              transactions.length;
          }
        }
      } catch (error: any) {
        logger.error('❌ Error fetching transaction details:', error.message);
      }
    }

    // Sort transactions by time (newest first)
    transactions.sort((a, b) => b.time - a.time);

    // Calculate statistics
    const stats = {
      size: mempoolInfo.size || 0,
      bytes: mempoolInfo.bytes || 0,
      usage: mempoolInfo.usage || 0,
      maxmempool: mempoolInfo.maxmempool || 0,
      mempoolminfee: mempoolInfo.mempoolminfee || 0,
      minrelaytxfee: mempoolInfo.minrelaytxfee || 0,
      usagePercentage:
        mempoolInfo.maxmempool > 0
          ? ((mempoolInfo.usage / mempoolInfo.maxmempool) * 100).toFixed(2)
          : 0,
      totalFees,
      avgFee,
      avgSize: Math.round(avgSize),
      avgFeePerKB: avgSize > 0 ? ((avgFee / avgSize) * 1000).toFixed(8) : 0,
    };

    // Build response
    const response = {
      success: true,
      data: {
        stats,
        transactions: transactions.map(tx => ({
          ...tx,
          time_ago: calculateTimeAgo(tx.time),
          fee_per_kb: ((tx.fee / tx.size) * 1000).toFixed(8),
        })),
        meta: {
          showing: transactions.length,
          total: mempoolInfo.size || 0,
          hasMore: (mempoolInfo.size || 0) > limit,
          currentBlockHeight: blockchainInfo?.blocks || 0,
          limit,
        },
      },
      timestamp: new Date().toISOString(),
    };

    logger.info(
      `✅ Mempool viewer: ${stats.size} transactions, ${transactions.length} detailed`
    );

    return NextResponse.json(response);
  } catch (error: any) {
    logger.error('❌ Mempool viewer error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch mempool data',
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * Calculate human-readable time ago
 */
function calculateTimeAgo(timestamp: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;

  if (diff < 60) {
    return `${diff} seconds ago`;
  } else if (diff < 3600) {
    return `${Math.floor(diff / 60)} minutes ago`;
  } else if (diff < 86400) {
    return `${Math.floor(diff / 3600)} hours ago`;
  } else {
    return `${Math.floor(diff / 86400)} days ago`;
  }
}
