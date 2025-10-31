/**
 * API endpoint for intelligent mass scanning of 10,000+ VerusIDs
 * Optimized to not hammer the RPC
 */

import { type NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { IntelligentMassScanner } from '@/lib/services/intelligent-mass-scanner';

// Lazy database connection initialization
let db: Pool | null = null;

function getDbPool(): Pool {
  if (!db) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    db = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }
  return db;
}

// Global scanner instance
let scanner: IntelligentMassScanner | null = null;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, config, options } = body;

    if (action === 'start') {
      // Initialize scanner if not already running
      if (!scanner || !scanner.isScanning()) {
        // Custom configuration from request
        const scanConfig = {
          maxConcurrentRequests: config?.maxConcurrentRequests || 3,
          delayBetweenBatches: config?.delayBetweenBatches || 100,
          blockBatchSize: config?.blockBatchSize || 50,
          addressBatchSize: config?.addressBatchSize || 10,
          cacheBlockData: config?.cacheBlockData !== false,
          maxRetries: config?.maxRetries || 3,
          backoffMultiplier: config?.backoffMultiplier || 2,
        };

        scanner = new IntelligentMassScanner(getDbPool(), scanConfig);

        // Start scanning in the background
        scanner
          .scanAllVerusIDs({
            startFromHeight: options?.startFromHeight,
            endAtHeight: options?.endAtHeight,
            limitAddresses: options?.limitAddresses,
          })
          .then(() => {})
          .catch(error => {
            console.error('[Mass Scan API] Scan failed:', error);
          });

        return NextResponse.json({
          success: true,
          message: 'Intelligent mass scan started',
          config: scanConfig,
          progress: scanner.getProgress(),
        });
      } else {
        return NextResponse.json(
          {
            success: false,
            message: 'Scan already in progress',
          },
          { status: 400 }
        );
      }
    }

    if (action === 'stop') {
      if (scanner) {
        scanner.stopScan();
        return NextResponse.json({
          success: true,
          message: 'Scan stopped',
        });
      } else {
        return NextResponse.json(
          {
            success: false,
            message: 'No scan in progress',
          },
          { status: 400 }
        );
      }
    }

    if (action === 'progress') {
      if (scanner) {
        const progress = scanner.getProgress();
        const isRunning = scanner.isScanning();

        // Calculate percentages
        const blockPercent =
          progress.totalBlocks > 0
            ? ((progress.blocksProcessed / progress.totalBlocks) * 100).toFixed(
                2
              )
            : 0;
        const addressPercent =
          progress.totalAddresses > 0
            ? (
                (progress.addressesProcessed / progress.totalAddresses) *
                100
              ).toFixed(2)
            : 0;

        // Calculate rates
        const elapsed = Date.now() - progress.startTime;
        const blocksPerSecond = progress.blocksProcessed / (elapsed / 1000);
        const stakesPerSecond = progress.stakeEventsFound / (elapsed / 1000);

        return NextResponse.json({
          success: true,
          isRunning,
          progress: {
            ...progress,
            percentages: {
              blocks: blockPercent,
              addresses: addressPercent,
            },
            rates: {
              blocksPerSecond: blocksPerSecond.toFixed(2),
              stakesPerSecond: stakesPerSecond.toFixed(2),
            },
            estimatedCompletion: progress.estimatedCompletion
              ? new Date(progress.estimatedCompletion).toISOString()
              : null,
          },
        });
      } else {
        return NextResponse.json({
          success: true,
          isRunning: false,
          progress: null,
        });
      }
    }

    // Preset: Scan recent (last 30 days)
    if (action === 'scan-recent') {
      const days = body.days || 30;
      const blocksPerDay = 1440;
      const blocksToScan = days * blocksPerDay;

      const { verusAPI } = await import('@/lib/rpc-client-robust');
      const blockchainInfo = await verusAPI.getBlockchainInfo();
      const currentHeight = blockchainInfo.blocks;
      const startHeight = Math.max(1, currentHeight - blocksToScan);

      const scanConfig = {
        maxConcurrentRequests: 5, // Can be more aggressive for recent blocks
        delayBetweenBatches: 50,
        blockBatchSize: 100,
        addressBatchSize: 20,
        cacheBlockData: true,
        maxRetries: 3,
        backoffMultiplier: 2,
      };

      scanner = new IntelligentMassScanner(getDbPool(), scanConfig);

      scanner
        .scanAllVerusIDs({
          startFromHeight: startHeight,
          endAtHeight: currentHeight,
          limitAddresses: body.limitAddresses,
        })
        .then(() => {})
        .catch(error => {
          console.error('[Mass Scan API] Recent scan failed:', error);
        });

      return NextResponse.json({
        success: true,
        message: `Scanning last ${days} days (blocks ${startHeight} to ${currentHeight})`,
        config: scanConfig,
        progress: scanner.getProgress(),
      });
    }

    // Preset: Full historical scan (conservative settings)
    if (action === 'scan-full-history') {
      const scanConfig = {
        maxConcurrentRequests: 2, // Very conservative for full history
        delayBetweenBatches: 200, // Longer delay
        blockBatchSize: 25, // Smaller batches
        addressBatchSize: 5,
        cacheBlockData: true,
        maxRetries: 5,
        backoffMultiplier: 3,
      };

      scanner = new IntelligentMassScanner(getDbPool(), scanConfig);

      scanner
        .scanAllVerusIDs({
          startFromHeight: body.startHeight || 1,
          endAtHeight: body.endHeight,
          limitAddresses: body.limitAddresses || 10000, // Default 10k limit
        })
        .then(() => {})
        .catch(error => {
          console.error('[Mass Scan API] Full historical scan failed:', error);
        });

      return NextResponse.json({
        success: true,
        message: 'Full historical scan started with conservative settings',
        config: scanConfig,
        progress: scanner.getProgress(),
      });
    }

    return NextResponse.json(
      {
        success: false,
        message: 'Invalid action',
      },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('[Mass Scan API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    if (scanner) {
      const progress = scanner.getProgress();
      const isRunning = scanner.isScanning();

      const blockPercent =
        progress.totalBlocks > 0
          ? ((progress.blocksProcessed / progress.totalBlocks) * 100).toFixed(2)
          : 0;
      const addressPercent =
        progress.totalAddresses > 0
          ? (
              (progress.addressesProcessed / progress.totalAddresses) *
              100
            ).toFixed(2)
          : 0;

      const elapsed = Date.now() - progress.startTime;
      const blocksPerSecond = progress.blocksProcessed / (elapsed / 1000);
      const stakesPerSecond = progress.stakeEventsFound / (elapsed / 1000);

      return NextResponse.json({
        success: true,
        isRunning,
        progress: {
          ...progress,
          percentages: {
            blocks: blockPercent,
            addresses: addressPercent,
          },
          rates: {
            blocksPerSecond: blocksPerSecond.toFixed(2),
            stakesPerSecond: stakesPerSecond.toFixed(2),
          },
          estimatedCompletion: progress.estimatedCompletion
            ? new Date(progress.estimatedCompletion).toISOString()
            : null,
          elapsedTime: `${Math.floor(elapsed / 1000)}s`,
        },
      });
    } else {
      return NextResponse.json({
        success: true,
        isRunning: false,
        progress: null,
      });
    }
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
