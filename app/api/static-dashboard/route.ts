import { NextResponse } from 'next/server';
import { CachedRPCClient } from '@/lib/cache/cached-rpc-client';
import { logger } from '@/lib/utils/logger';

// ISR configuration - regenerate every 10 minutes for dashboard
export const revalidate = 600; // 10 minutes

// Cache tags for targeted revalidation
export const fetchCache = 'force-cache';
export const runtime = 'nodejs';

export async function GET() {
  try {
    logger.info('🔄 Generating static dashboard data (ISR)');

    // Fetch all dashboard data in parallel
    const [blockchainInfo, networkInfo, miningInfo, mempoolInfo] =
      await Promise.all([
        CachedRPCClient.getBlockchainInfo(),
        CachedRPCClient.getNetworkInfo(),
        CachedRPCClient.getMiningInfo(),
        CachedRPCClient.getMempoolInfo(),
      ]);

    if (!blockchainInfo) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch dashboard data',
        },
        { status: 500 }
      );
    }

    // Generate dashboard data
    const dashboardData = {
      overview: {
        chain: blockchainInfo.chain || 'unknown',
        blocks: blockchainInfo.blocks || 0,
        difficulty: blockchainInfo.difficulty || 0,
        networkHashRate: miningInfo?.networkhashps || 0,
        connections:
          networkInfo?.connections || blockchainInfo.connections || 0,
        mempoolSize: (mempoolInfo as any)?.size || 0,
        syncProgress:
          (blockchainInfo.verificationprogress ||
            blockchainInfo.verificationProgress ||
            0) * 100,
        lastUpdate: new Date().toISOString(),
      },
      blockchain: {
        bestBlockHash:
          blockchainInfo.bestblockhash || blockchainInfo.bestBlockHash || '',
        chainwork: blockchainInfo.chainwork || '',
        sizeOnDisk:
          blockchainInfo.size_on_disk || blockchainInfo.sizeOnDisk || 0,
        commitments: blockchainInfo.commitments || 0,
        valuePools:
          blockchainInfo.valuePools || blockchainInfo.valuepools || [],
        verificationProgress:
          blockchainInfo.verificationprogress ||
          blockchainInfo.verificationProgress ||
          0,
      },
      network: {
        version: networkInfo?.version || 0,
        subversion: networkInfo?.subversion || '',
        protocolVersion: networkInfo?.protocolversion || 0,
        localServices: networkInfo?.localservices || '',
        timeOffset: networkInfo?.timeoffset || 0,
        relayFee: networkInfo?.relayfee || 0,
        networks: networkInfo?.networks || [],
        warnings: networkInfo?.warnings || '',
      },
      mining: {
        currentBlockSize: miningInfo?.currentblocksize || 0,
        currentBlockTx: miningInfo?.currentblocktx || 0,
        pooledTx: miningInfo?.pooledtx || 0,
        errors: miningInfo?.errors || '',
        warnings: miningInfo?.warnings || '',
      },
      mempool: {
        bytes: (mempoolInfo as any)?.bytes || 0,
        usage: (mempoolInfo as any)?.usage || 0,
        maxMempool: (mempoolInfo as any)?.maxmempool || 0,
        mempoolMinFee: (mempoolInfo as any)?.mempoolminfee || 0,
        minRelayTxFee: (mempoolInfo as any)?.minrelaytxfee || 0,
      },
      // Performance metrics
      performance: {
        averageBlockTime: 60, // Estimated block time in seconds
        networkLatency: calculateNetworkLatency(networkInfo),
        mempoolEfficiency: calculateMempoolEfficiency(mempoolInfo),
        syncEfficiency: calculateSyncEfficiency(blockchainInfo),
      },
      // Health indicators
      health: {
        networkStatus:
          (networkInfo?.connections || 0) > 0 ? 'healthy' : 'disconnected',
        syncStatus:
          (blockchainInfo.verificationprogress || 0) > 0.99
            ? 'synced'
            : 'syncing',
        mempoolStatus:
          ((mempoolInfo as any)?.size || 0) < 10000 ? 'normal' : 'congested',
        overallHealth: calculateOverallHealth(
          blockchainInfo,
          networkInfo,
          mempoolInfo
        ),
      },
    };

    const responseData = {
      success: true,
      data: dashboardData,
      generatedAt: new Date().toISOString(),
      revalidationTime: 600, // 10 minutes
      timestamp: new Date().toISOString(),
    };

    logger.info('✅ Generated static dashboard data (ISR)');

    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200',
        'CDN-Cache-Control': 'public, s-maxage=600',
        'Vercel-CDN-Cache-Control': 'public, s-maxage=600',
      },
    });
  } catch (error) {
    logger.error('❌ Error generating static dashboard (ISR):', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate dashboard data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    );
  }
}

// Helper functions for performance calculations
function calculateNetworkLatency(networkInfo: any): number {
  const timeOffset = networkInfo?.timeoffset || 0;
  return Math.abs(timeOffset);
}

function calculateMempoolEfficiency(mempoolInfo: any): number {
  const size = mempoolInfo?.size || 0;
  const bytes = mempoolInfo?.bytes || 0;
  const maxMempool = mempoolInfo?.maxmempool || 0;

  if (maxMempool === 0) return 100;
  return Math.max(0, 100 - (bytes / maxMempool) * 100);
}

function calculateSyncEfficiency(blockchainInfo: any): number {
  const progress =
    blockchainInfo.verificationprogress ||
    blockchainInfo.verificationProgress ||
    0;
  return progress * 100;
}

function calculateOverallHealth(
  blockchainInfo: any,
  networkInfo: any,
  mempoolInfo: any
): 'excellent' | 'good' | 'fair' | 'poor' {
  const hasConnections = (networkInfo?.connections || 0) > 0;
  const isSynced = (blockchainInfo.verificationprogress || 0) > 0.99;
  const mempoolNormal = (mempoolInfo?.size || 0) < 10000;

  if (hasConnections && isSynced && mempoolNormal) return 'excellent';
  if (hasConnections && isSynced) return 'good';
  if (hasConnections) return 'fair';
  return 'poor';
}
