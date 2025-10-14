import { NextResponse } from 'next/server';
import { CachedRPCClient } from '@/lib/cache/cached-rpc-client';
import { logger } from '@/lib/utils/logger';

// ISR configuration - regenerate every 5 minutes
export const revalidate = 300; // 5 minutes

// Cache tags for targeted revalidation
export const fetchCache = 'force-cache';
export const runtime = 'nodejs';

export async function GET() {
  try {
    logger.info('🔄 Generating popular blocks data (ISR)');

    // Fetch recent blocks data
    const blockchainInfo = await CachedRPCClient.getBlockchainInfo();

    if (!blockchainInfo || !blockchainInfo.blocks) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch blockchain information',
        },
        { status: 500 }
      );
    }

    const currentHeight = blockchainInfo.blocks;

    // Generate popular blocks (latest 20 blocks)
    const popularBlocks = [];
    const blockHashes = [];

    // Get block hashes for the latest blocks
    for (let i = 0; i < 20 && i < currentHeight; i++) {
      try {
        const blockHash = await CachedRPCClient.getBlockHash(currentHeight - i);
        if (blockHash && typeof blockHash === 'string') {
          blockHashes.push({
            height: currentHeight - i,
            hash: blockHash,
          });
        }
      } catch (error) {
        logger.warn(
          `Failed to get block hash for height ${currentHeight - i}:`,
          error
        );
      }
    }

    // Fetch block details for popular blocks
    for (const blockInfo of blockHashes) {
      try {
        const blockData = await CachedRPCClient.getBlock(blockInfo.hash, true);
        if (blockData) {
          const block = blockData as any;
          popularBlocks.push({
            height: blockInfo.height,
            hash: blockInfo.hash,
            timestamp: block.time || block.mediantime,
            size: block.size || 0,
            transactions: block.tx?.length || 0,
            difficulty: block.difficulty || 0,
            chainwork: block.chainwork || '',
            previousblockhash: block.previousblockhash || '',
            nextblockhash: block.nextblockhash || '',
          });
        }
      } catch (error) {
        logger.warn(`Failed to get block data for ${blockInfo.hash}:`, error);
      }
    }

    // Sort by height (descending)
    popularBlocks.sort((a, b) => b.height - a.height);

    const responseData = {
      success: true,
      data: {
        blocks: popularBlocks,
        totalBlocks: currentHeight,
        generatedAt: new Date().toISOString(),
        revalidationTime: 300, // 5 minutes
      },
      timestamp: new Date().toISOString(),
    };

    logger.info(`✅ Generated ${popularBlocks.length} popular blocks (ISR)`);

    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        'CDN-Cache-Control': 'public, s-maxage=300',
        'Vercel-CDN-Cache-Control': 'public, s-maxage=300',
      },
    });
  } catch (error) {
    logger.error('❌ Error generating popular blocks (ISR):', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate popular blocks data',
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
