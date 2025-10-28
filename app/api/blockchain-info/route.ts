import { NextResponse } from 'next/server';
import { CachedRPCClient } from '@/lib/cache/cached-rpc-client';
import { verusAPI } from '@/lib/rpc-client-robust';
import { logger } from '@/lib/utils/logger';
import { ErrorSanitizer } from '@/lib/utils/error-sanitizer';

export async function GET() {
  try {
    // Fetch data with resilience to daemon warmup (-28 Loading block index)
    // Using batch RPC for better performance (single HTTP request instead of 3)
    const [bcResult, netResult, txoResult] = await Promise.allSettled([
      CachedRPCClient.getBlockchainInfo(),
      CachedRPCClient.getNetworkInfo(),
      CachedRPCClient.getTxOutSetInfo(), // Now using cached version
    ]);

    // Handle daemon warmup: if blockchain info is not yet available due to -28,
    // return a minimal, success=true payload so the UI can render syncing state.
    if (bcResult.status === 'rejected') {
      const message = (bcResult.reason && bcResult.reason.message) || '';
      if (message.includes('Loading block index') || message.includes('-28')) {
        return NextResponse.json({
          success: true,
          data: {
            blocks: 0,
            chain: 'unknown',
            difficulty: 0,
            bestBlockHash: '',
            verificationProgress: 0,
            connections: 0,
            networkActive: false,
            chainwork: '',
            sizeOnDisk: 0,
            commitments: 0,
            valuePools: [],
            circulatingSupply: 0,
            _raw: {
              blockchainInfo: null,
              networkInfo:
                netResult.status === 'fulfilled' ? netResult.value : null,
              txOutInfo: null,
              initializing: true,
              error: message,
            },
          },
          timestamp: new Date().toISOString(),
        });
      }
    }

    const blockchainInfo =
      bcResult.status === 'fulfilled' ? bcResult.value : null;
    const networkInfo =
      netResult.status === 'fulfilled' ? netResult.value : null;
    const txOutInfo = txoResult.status === 'fulfilled' ? txoResult.value : null;

    if (!blockchainInfo) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch blockchain information',
        },
        { status: 500 }
      );
    }

    // Enhance the response with derived fields for better UI display
    // Map snake_case fields from RPC to camelCase for UI
    const enhancedData = {
      blocks: blockchainInfo.blocks || 0,
      chain: blockchainInfo.chain || 'unknown',
      difficulty: blockchainInfo.difficulty || 0,
      bestBlockHash:
        blockchainInfo.bestblockhash || blockchainInfo.bestBlockHash || '',
      verificationProgress:
        blockchainInfo.verificationprogress ??
        blockchainInfo.verificationProgress ??
        0,
      connections: networkInfo?.connections || blockchainInfo.connections || 0,
      networkActive:
        networkInfo?.connections > 0 || blockchainInfo.connections > 0 || false,
      chainwork: blockchainInfo.chainwork || '',
      sizeOnDisk: blockchainInfo.size_on_disk || blockchainInfo.sizeOnDisk || 0,
      commitments: blockchainInfo.commitments || 0,
      valuePools: blockchainInfo.valuePools || blockchainInfo.valuepools || [],
      circulatingSupply: txOutInfo?.total_amount || 0,
      // Include raw data for debugging
      _raw: {
        blockchainInfo,
        networkInfo,
        txOutInfo,
      },
    };

    return NextResponse.json({
      success: true,
      data: enhancedData,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error fetching blockchain info:', error);

    const sanitizedError = ErrorSanitizer.createSanitizedError(error, {
      endpoint: '/api/blockchain-info',
      method: 'GET',
    });

    return NextResponse.json(
      {
        success: false,
        error: sanitizedError.message,
        code: sanitizedError.code,
        requestId: sanitizedError.requestId,
        timestamp: sanitizedError.timestamp,
      },
      { status: 500 }
    );
  }
}
