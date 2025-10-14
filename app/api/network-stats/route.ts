import { NextResponse } from 'next/server';
import { CachedRPCClient } from '@/lib/cache/cached-rpc-client';
import { logger } from '@/lib/utils/logger';

// ISR configuration - regenerate every 2 minutes for network stats
export const revalidate = 120; // 2 minutes

// Cache tags for targeted revalidation
export const fetchCache = 'force-cache';
export const runtime = 'nodejs';

export async function GET() {
  try {
    logger.info('🔄 Generating network stats data (ISR)');

    // Fetch network and blockchain data in parallel
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
          error: 'Failed to fetch blockchain information',
        },
        { status: 500 }
      );
    }

    // Calculate network statistics
    const networkStats = {
      blockchain: {
        chain: blockchainInfo.chain || 'unknown',
        blocks: blockchainInfo.blocks || 0,
        headers: blockchainInfo.headers || 0,
        bestBlockHash:
          blockchainInfo.bestblockhash || blockchainInfo.bestBlockHash || '',
        difficulty: blockchainInfo.difficulty || 0,
        verificationProgress:
          blockchainInfo.verificationprogress ||
          blockchainInfo.verificationProgress ||
          0,
        chainwork: blockchainInfo.chainwork || '',
        sizeOnDisk:
          blockchainInfo.size_on_disk || blockchainInfo.sizeOnDisk || 0,
        commitments: blockchainInfo.commitments || 0,
        valuePools:
          blockchainInfo.valuePools || blockchainInfo.valuepools || [],
      },
      network: {
        connections:
          networkInfo?.connections || blockchainInfo.connections || 0,
        version: networkInfo?.version || 0,
        subversion: networkInfo?.subversion || '',
        protocolVersion: networkInfo?.protocolversion || 0,
        localServices: networkInfo?.localservices || '',
        timeOffset: networkInfo?.timeoffset || 0,
        relayFee: networkInfo?.relayfee || 0,
        networks: networkInfo?.networks || [],
        warnings: networkInfo?.warnings || '',
        networkActive:
          (networkInfo?.connections || blockchainInfo.connections || 0) > 0,
      },
      mining: {
        blocks: miningInfo?.blocks || 0,
        currentBlockSize: miningInfo?.currentblocksize || 0,
        currentBlockTx: miningInfo?.currentblocktx || 0,
        difficulty: miningInfo?.difficulty || 0,
        errors: miningInfo?.errors || '',
        networkHashPS: miningInfo?.networkhashps || 0,
        pooledTx: miningInfo?.pooledtx || 0,
        chain: miningInfo?.chain || 'unknown',
        warnings: miningInfo?.warnings || '',
      },
      mempool: {
        size: (mempoolInfo as any)?.size || 0,
        bytes: (mempoolInfo as any)?.bytes || 0,
        usage: (mempoolInfo as any)?.usage || 0,
        maxMempool: (mempoolInfo as any)?.maxmempool || 0,
        mempoolMinFee: (mempoolInfo as any)?.mempoolminfee || 0,
        minRelayTxFee: (mempoolInfo as any)?.minrelaytxfee || 0,
      },
      // Derived statistics
      derived: {
        blockTime: calculateAverageBlockTime(blockchainInfo),
        networkHashRate: miningInfo?.networkhashps || 0,
        mempoolSize: (mempoolInfo as any)?.size || 0,
        mempoolBytes: (mempoolInfo as any)?.bytes || 0,
        isHealthy: isNetworkHealthy(blockchainInfo, networkInfo, mempoolInfo),
        syncProgress:
          (blockchainInfo.verificationprogress ||
            blockchainInfo.verificationProgress ||
            0) * 100,
      },
    };

    const responseData = {
      success: true,
      data: networkStats,
      generatedAt: new Date().toISOString(),
      revalidationTime: 120, // 2 minutes
      timestamp: new Date().toISOString(),
    };

    logger.info('✅ Generated network stats data (ISR)');

    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
        'CDN-Cache-Control': 'public, s-maxage=120',
        'Vercel-CDN-Cache-Control': 'public, s-maxage=120',
      },
    });
  } catch (error) {
    logger.error('❌ Error generating network stats (ISR):', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate network statistics',
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

// Helper functions
function calculateAverageBlockTime(blockchainInfo: any): number {
  // Estimate block time based on difficulty and network conditions
  // This is a simplified calculation
  const difficulty = blockchainInfo.difficulty || 0;
  if (difficulty === 0) return 0;

  // Assuming target block time of 60 seconds for Verus
  return 60; // seconds
}

function isNetworkHealthy(
  blockchainInfo: any,
  networkInfo: any,
  mempoolInfo: any
): boolean {
  const hasConnections =
    (networkInfo?.connections || blockchainInfo.connections || 0) > 0;
  const isSynced =
    (blockchainInfo.verificationprogress ||
      blockchainInfo.verificationProgress ||
      0) > 0.99;
  const mempoolReasonable = (mempoolInfo?.size || 0) < 10000; // Less than 10k transactions

  return hasConnections && isSynced && mempoolReasonable;
}
