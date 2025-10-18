import { NextResponse } from 'next/server';
import { CachedRPCClient } from '@/lib/cache/cached-rpc-client';
import { verusAPI } from '@/lib/rpc-client-robust';
import { addSecurityHeaders } from '@/lib/middleware/security';
import { logger } from '@/lib/utils/logger';

export async function GET() {
  try {
    logger.info('🔍 Fetching real staking data...');

    // Get comprehensive staking and mining data using cached client for better performance
    // Note: getstakinginfo is deprecated in Verus - using getwalletinfo and getmininginfo instead
    const [
      walletInfo,
      miningInfo,
      blockchainInfo,
      networkHashPS,
      difficulty,
      txOutSetInfo,
    ] = await Promise.allSettled([
      verusAPI.getWalletInfo().catch(err => {
        logger.warn('Wallet info fetch failed:', err);
        return null;
      }),
      CachedRPCClient.getMiningInfo().catch(err => {
        logger.warn('Mining info fetch failed:', err);
        return null;
      }),
      CachedRPCClient.getBlockchainInfo().catch(err => {
        logger.warn('Blockchain info fetch failed:', err);
        return null;
      }),
      verusAPI.getNetworkHashPS().catch(err => {
        logger.warn('Network hash rate fetch failed:', err);
        return null;
      }),
      verusAPI.getDifficulty().catch(err => {
        logger.warn('Difficulty fetch failed:', err);
        return null;
      }),
      verusAPI.getTxOutSetInfo().catch(err => {
        logger.warn('TxOutSet info fetch failed:', err);
        return null;
      }),
    ]);

    // Process staking info using latest Verus API methods
    let processedStakingInfo = {};
    const walletData =
      walletInfo.status === 'fulfilled' ? walletInfo.value : {};
    const miningData =
      miningInfo.status === 'fulfilled' ? miningInfo.value : {};
    const blockchainData =
      blockchainInfo.status === 'fulfilled' ? blockchainInfo.value : {};
    const txOutSetData =
      txOutSetInfo.status === 'fulfilled' ? txOutSetInfo.value : {};

    // Extract staking information from multiple sources
    processedStakingInfo = {
      // Staking status from mining info (most reliable)
      enabled: !!miningData.staking,
      staking: !!miningData.staking,

      // Stake weight from wallet info (eligible_staking_balance is the current stake weight)
      weight: walletData.eligible_staking_balance || 0,

      // Network stake weight from multiple sources
      // Try mining info first, then blockchain info, then txOutSet info
      netstakeweight:
        miningData.stakingsupply ||
        miningData.netstakeweight ||
        miningData.stakeweight ||
        blockchainData.stakingsupply ||
        blockchainData.netstakeweight ||
        txOutSetData.total_amount ||
        0,

      // Chain stake from blockchain info (chainstake converted from hex)
      chainstake: blockchainData.chainstake
        ? parseInt(blockchainData.chainstake, 16)
        : 0,

      // Additional staking metrics
      eligible_staking_outputs: walletData.eligible_staking_outputs || 0,
      eligible_staking_balance: walletData.eligible_staking_balance || 0,

      // Mining info for context
      currentblocksize: miningData.currentblocksize || 0,
      currentblocktx: miningData.currentblocktx || 0,
      pooledtx: miningData.pooledtx || 0,
      difficulty:
        miningData.difficulty ||
        (difficulty.status === 'fulfilled' ? difficulty.value : 0),
      searchInterval: 0,
      expectedtime: 0,
      errors: miningData.errors || null,
    };

    // Debug logging to see what data we're getting
    logger.info('🔍 Debug - Mining data fields:', Object.keys(miningData));
    logger.info(
      '🔍 Debug - Blockchain data fields:',
      Object.keys(blockchainData)
    );
    logger.info('🔍 Debug - Wallet data fields:', Object.keys(walletData));
    logger.info('🔍 Debug - TxOutSet data fields:', Object.keys(txOutSetData));
    logger.info(
      '🔍 Debug - Final netstakeweight:',
      (processedStakingInfo as any).netstakeweight
    );
    logger.info('🔍 Debug - TxOutSet total_amount:', txOutSetData.total_amount);

    logger.info('✅ Staking data processed using latest API methods');

    const result = {
      wallet: walletInfo.status === 'fulfilled' ? walletInfo.value : null,
      staking: processedStakingInfo,
      mining: miningInfo.status === 'fulfilled' ? miningInfo.value : null,
      blockchain:
        blockchainInfo.status === 'fulfilled' ? blockchainInfo.value : null,
      networkHashRate:
        networkHashPS.status === 'fulfilled' ? networkHashPS.value : null,
      difficulty: difficulty.status === 'fulfilled' ? difficulty.value : null,
      timestamp: new Date().toISOString(),
    };

    logger.info('✅ Real staking data fetched successfully');

    const response = NextResponse.json({
      success: true,
      data: result,
    });

    return addSecurityHeaders(response);
  } catch (error) {
    logger.error('❌ Error fetching staking data:', error);

    const response = NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch staking information',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );

    return addSecurityHeaders(response);
  }
}
