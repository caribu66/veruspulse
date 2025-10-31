/**
 * API endpoint for comprehensive historical blockchain scanning
 * This populates the database with real historical data
 */

import { type NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { ComprehensiveBlockScanner } from '@/lib/services/comprehensive-block-scanner';
import { ComprehensiveStatisticsCalculator } from '@/lib/services/comprehensive-statistics-calculator';

// Initialize database connection
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Global scanners to track progress
let scanner: ComprehensiveBlockScanner | null = null;
let calculator: ComprehensiveStatisticsCalculator | null = null;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, startHeight, endHeight, addresses } = body;

    if (action === 'start') {
      // Initialize scanner if not already running
      if (!scanner || !scanner.isRunning()) {
        scanner = new ComprehensiveBlockScanner(db);
        calculator = new ComprehensiveStatisticsCalculator(db);

        // Start scanning in the background
        scanner
          .startScan({
            startHeight: startHeight || 1,
            endHeight,
            batchSize: 100,
            addresses,
          })
          .then(async () => {
            console.info(
              '[Comprehensive Scan] Block scanning complete, calculating statistics...'
            );

            // Get all unique addresses from stake events
            const result = await db.query(
              'SELECT DISTINCT address FROM stake_events ORDER BY address'
            );

            const allAddresses = result.rows.map(row => row.address);
            console.info(
              `[Comprehensive Scan] Found ${allAddresses.length} unique stakers`
            );

            // Calculate statistics for each address
            for (const address of allAddresses) {
              try {
                await calculator!.calculateStatsForAddress(address);
              } catch (error) {
                console.error(
                  `[Comprehensive Scan] Error calculating stats for ${address}:`,
                  error
                );
              }
            }

            // Calculate network rankings
            await calculator!.calculateNetworkRankings();

            console.info(
              '[Comprehensive Scan] All statistics calculated successfully!'
            );
          })
          .catch(error => {
            console.error('[Comprehensive Scan] Error during scan:', error);
          });

        return NextResponse.json({
          success: true,
          message: 'Comprehensive scan started',
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
        const isRunning = scanner.isRunning();

        return NextResponse.json({
          success: true,
          isRunning,
          progress: {
            ...progress,
            percentComplete: (
              (progress.blocksProcessed /
                (progress.targetHeight -
                  progress.currentHeight +
                  progress.blocksProcessed)) *
              100
            ).toFixed(2),
            estimatedTimeRemaining: progress.estimatedCompletion
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

    if (action === 'calculate') {
      // Calculate statistics for specific addresses or all
      if (!calculator) {
        calculator = new ComprehensiveStatisticsCalculator(db);
      }

      if (addresses && addresses.length > 0) {
        const results = [];
        for (const address of addresses) {
          try {
            const stats = await calculator.calculateStatsForAddress(address);
            results.push({ address, success: true, stats });
          } catch (error: any) {
            results.push({ address, success: false, error: error.message });
          }
        }

        return NextResponse.json({
          success: true,
          results,
        });
      } else {
        // Calculate for all addresses
        const result = await db.query(
          'SELECT DISTINCT address FROM stake_events ORDER BY address'
        );

        const allAddresses = result.rows.map(row => row.address);
        let processed = 0;

        for (const address of allAddresses) {
          try {
            await calculator.calculateStatsForAddress(address);
            processed++;
          } catch (error) {
            console.error(`Error calculating stats for ${address}:`, error);
          }
        }

        await calculator.calculateNetworkRankings();

        return NextResponse.json({
          success: true,
          message: `Statistics calculated for ${processed}/${allAddresses.length} addresses`,
        });
      }
    }

    if (action === 'scan-recent') {
      // Scan only recent blocks (last 30 days)
      const daysToScan = body.days || 30;
      const blocksPerDay = 1440; // Approximately 1 block per minute
      const blocksToScan = daysToScan * blocksPerDay;

      // Get current blockchain height
      const { verusAPI } = await import('@/lib/rpc-client-robust');
      const blockchainInfo = await verusAPI.getBlockchainInfo();
      const currentHeight = blockchainInfo.blocks;
      const startHeight = Math.max(1, currentHeight - blocksToScan);

      if (!scanner || !scanner.isRunning()) {
        scanner = new ComprehensiveBlockScanner(db);
        calculator = new ComprehensiveStatisticsCalculator(db);

        scanner
          .startScan({
            startHeight,
            endHeight: currentHeight,
            batchSize: 100,
            addresses,
          })
          .then(async () => {
            console.info(
              '[Recent Scan] Block scanning complete, calculating statistics...'
            );

            const result = await db.query(
              'SELECT DISTINCT address FROM stake_events WHERE block_height >= $1',
              [startHeight]
            );

            const recentAddresses = result.rows.map(row => row.address);

            for (const address of recentAddresses) {
              try {
                await calculator!.calculateStatsForAddress(address);
              } catch (error) {
                console.error(`Error calculating stats for ${address}:`, error);
              }
            }

            await calculator!.calculateNetworkRankings();

            console.info(
              '[Recent Scan] Recent statistics calculated successfully!'
            );
          })
          .catch(error => {
            console.error('[Recent Scan] Error during scan:', error);
          });

        return NextResponse.json({
          success: true,
          message: `Scanning last ${daysToScan} days (blocks ${startHeight} to ${currentHeight})`,
          progress: scanner.getProgress(),
        });
      }
    }

    return NextResponse.json(
      {
        success: false,
        message: 'Invalid action',
      },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('[Comprehensive Scan API] Error:', error);
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
      const isRunning = scanner.isRunning();

      return NextResponse.json({
        success: true,
        isRunning,
        progress: {
          ...progress,
          percentComplete:
            progress.targetHeight > 0
              ? (
                  (progress.blocksProcessed /
                    (progress.targetHeight -
                      progress.currentHeight +
                      progress.blocksProcessed)) *
                  100
                ).toFixed(2)
              : 0,
          estimatedTimeRemaining: progress.estimatedCompletion
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
