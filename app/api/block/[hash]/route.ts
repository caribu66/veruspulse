import { type NextRequest, NextResponse } from 'next/server';
import { verusAPI } from '@/lib/rpc-client-robust';
import { verusClientWithFallback } from '@/lib/rpc-client-with-fallback';
import { computeBlockFees } from '@/lib/utils/fees';
import { extractCoinbasePayout } from '@/lib/utils/coinbase';
import { isOrphan } from '@/lib/utils/orphan';
import { getMempoolTracker } from '@/lib/monitoring/mempool-tracker';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ hash: string }> }
) {
  try {
    const { hash } = await params;
    const { searchParams } = new URL(_request.url);
    const metrics = searchParams.get('metrics') === '1';

    if (!hash) {
      return NextResponse.json(
        {
          success: false,
          error: 'Block hash is required',
        },
        { status: 400 }
      );
    }

    const block = await verusClientWithFallback.getBlock(hash);

    if (!block) {
      return NextResponse.json(
        {
          success: false,
          error: 'Block not found',
        },
        { status: 404 }
      );
    }

    // Fetch detailed transaction information
    const txDetails = await Promise.all(
      block.tx.map((txid: string) =>
        verusClientWithFallback.getTransaction(txid, true)
      )
    );

    block.tx = txDetails.filter(tx => tx !== null);

    // Add heavy metrics if requested
    if (metrics) {
      try {
        // Calculate fees
        const feeResult = await computeBlockFees(
          block,
          (txid: string) => verusClientWithFallback.getTransaction(txid, true),
          200 // Limit lookups to prevent timeout
        );

        // Extract coinbase payout
        let coinbaseResult = null;
        if (block.tx && block.tx.length > 0) {
          const firstTx = block.tx[0];
          if (
            firstTx &&
            firstTx.vin &&
            firstTx.vin.some((vin: any) => vin.coinbase)
          ) {
            coinbaseResult = extractCoinbasePayout(firstTx);
          }
        }

        // Check orphan status
        const orphanResult = await isOrphan(
          block,
          (height: number) => verusAPI.getBlockHash(height) // Keep using direct API for block hash lookups
        );

        // Calculate propagation time
        let propagationResult = null;
        const mempoolTracker = getMempoolTracker();
        if (mempoolTracker && block.tx) {
          const txIds = block.tx.map((tx: any) => tx.txid);
          propagationResult = mempoolTracker.calculatePropagation(
            block.time,
            txIds
          );
        }

        return NextResponse.json({
          success: true,
          data: {
            ...block,
            // Fee metrics
            feeTotal: feeResult.feeTotal,
            feePerByteAvg: feeResult.feePerByteAvg,
            feeApproximate: feeResult.approximate,
            feeProcessedTxs: feeResult.processedTxs,
            feeTotalTxs: feeResult.totalTxs,
            // Miner/Staker identity
            coinbasePayout: coinbaseResult?.payoutAddress || null,
            minerType: coinbaseResult?.minerType || 'miner',
            isShieldedPayout: coinbaseResult?.isShielded || false,
            totalPayout: coinbaseResult?.totalPayout || 0,
            // Orphan status
            isOrphan: orphanResult.isOrphan,
            canonicalHash: orphanResult.canonicalHash,
            orphanConfidence: orphanResult.confidence,
            // Propagation metrics
            propagationSeconds: propagationResult?.propagationSeconds || null,
            firstSeenTx: propagationResult?.firstSeenTx || null,
            propagationTrackedTxs: propagationResult?.trackedTxs || 0,
            propagationTotalTxs: propagationResult?.totalTxs || 0,
          },
          metrics: true,
        });
      } catch (error) {
        // Return base data with error flags
        return NextResponse.json({
          success: true,
          data: {
            ...block,
            feeTotal: 0,
            feePerByteAvg: 0,
            feeApproximate: true,
            feeProcessedTxs: 0,
            feeTotalTxs: block.tx ? block.tx.length : 0,
            coinbasePayout: null,
            minerType: 'miner',
            isShieldedPayout: false,
            totalPayout: 0,
            isOrphan: false,
            canonicalHash: null,
            orphanConfidence: 'low',
            propagationSeconds: null,
            firstSeenTx: null,
            propagationTrackedTxs: 0,
            propagationTotalTxs: block.tx ? block.tx.length : 0,
            metricsError: true,
          },
          metrics: true,
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: block,
      metrics: false,
    });
  } catch (error) {
    console.error('Error fetching block details:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch block details',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
