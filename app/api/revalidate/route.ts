import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag, revalidatePath } from 'next/cache';
import { logger } from '@/lib/utils/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, path, tag } = body;

    // Validate required fields
    if (!type) {
      return NextResponse.json(
        { success: false, error: 'Type is required' },
        { status: 400 }
      );
    }

    logger.info(`🔄 Manual revalidation requested: ${type}`, { path, tag });

    switch (type) {
      case 'path':
        if (!path) {
          return NextResponse.json(
            { success: false, error: 'Path is required for path revalidation' },
            { status: 400 }
          );
        }

        revalidatePath(path);
        logger.info(`✅ Revalidated path: ${path}`);

        return NextResponse.json({
          success: true,
          message: `Path revalidated: ${path}`,
          timestamp: new Date().toISOString(),
        });

      case 'tag':
        if (!tag) {
          return NextResponse.json(
            { success: false, error: 'Tag is required for tag revalidation' },
            { status: 400 }
          );
        }

        revalidateTag(tag);
        logger.info(`✅ Revalidated tag: ${tag}`);

        return NextResponse.json({
          success: true,
          message: `Tag revalidated: ${tag}`,
          timestamp: new Date().toISOString(),
        });

      case 'all':
        // Revalidate common paths and tags
        const commonPaths = [
          '/',
          '/block/[hash]',
          '/api/blockchain-info',
          '/api/popular-blocks',
          '/api/network-stats',
          '/api/static-dashboard',
        ];

        const commonTags = [
          'blockchain-data',
          'network-stats',
          'popular-blocks',
          'dashboard-data',
        ];

        // Revalidate paths
        for (const path of commonPaths) {
          revalidatePath(path);
        }

        // Revalidate tags
        for (const tag of commonTags) {
          revalidateTag(tag);
        }

        logger.info(
          `✅ Revalidated all: ${commonPaths.length} paths, ${commonTags.length} tags`
        );

        return NextResponse.json({
          success: true,
          message: `All data revalidated: ${commonPaths.length} paths, ${commonTags.length} tags`,
          revalidatedPaths: commonPaths,
          revalidatedTags: commonTags,
          timestamp: new Date().toISOString(),
        });

      case 'blockchain':
        // Revalidate blockchain-related data
        revalidateTag('blockchain-data');
        revalidatePath('/api/blockchain-info');
        revalidatePath('/api/static-dashboard');

        logger.info('✅ Revalidated blockchain data');

        return NextResponse.json({
          success: true,
          message: 'Blockchain data revalidated',
          timestamp: new Date().toISOString(),
        });

      case 'blocks':
        // Revalidate block-related data
        revalidateTag('popular-blocks');
        revalidatePath('/api/popular-blocks');

        logger.info('✅ Revalidated blocks data');

        return NextResponse.json({
          success: true,
          message: 'Blocks data revalidated',
          timestamp: new Date().toISOString(),
        });

      case 'network':
        // Revalidate network-related data
        revalidateTag('network-stats');
        revalidatePath('/api/network-stats');
        revalidatePath('/api/static-dashboard');

        logger.info('✅ Revalidated network data');

        return NextResponse.json({
          success: true,
          message: 'Network data revalidated',
          timestamp: new Date().toISOString(),
        });

      default:
        return NextResponse.json(
          {
            success: false,
            error:
              'Invalid revalidation type. Use: path, tag, all, blockchain, blocks, or network',
          },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.error('❌ Revalidation error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Revalidation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET endpoint for revalidation status
export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Revalidation API is available',
    availableTypes: ['path', 'tag', 'all', 'blockchain', 'blocks', 'network'],
    usage: {
      path: 'POST /api/revalidate with {"type": "path", "path": "/api/blockchain-info"}',
      tag: 'POST /api/revalidate with {"type": "tag", "tag": "blockchain-data"}',
      all: 'POST /api/revalidate with {"type": "all"}',
      blockchain: 'POST /api/revalidate with {"type": "blockchain"}',
      blocks: 'POST /api/revalidate with {"type": "blocks"}',
      network: 'POST /api/revalidate with {"type": "network"}',
    },
    timestamp: new Date().toISOString(),
  });
}


