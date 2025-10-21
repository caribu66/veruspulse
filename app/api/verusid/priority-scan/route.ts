import { NextResponse } from 'next/server';
import { addSecurityHeaders } from '@/lib/middleware/security';
import { logger } from '@/lib/utils/logger';
import {
  priorityScanVerusID,
  needsPriorityScan,
} from '@/lib/services/priority-verusid-scanner';

export async function POST(request: Request) {
  try {
    const { identityAddress } = await request.json();

    if (!identityAddress) {
      return NextResponse.json(
        {
          success: false,
          error: 'Identity address is required',
        },
        { status: 400 }
      );
    }

    // Validate I-address format
    if (!identityAddress.startsWith('i')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid identity address format',
        },
        { status: 400 }
      );
    }

    logger.info(`🚀 Priority scan requested for: ${identityAddress}`);

    // Check if priority scan is needed
    const needsScan = await needsPriorityScan(identityAddress);

    if (!needsScan) {
      logger.info(`✅ ${identityAddress} already has complete staking data`);
      return NextResponse.json({
        success: true,
        data: {
          needsScan: false,
          message: 'Already has complete staking data',
          stakesFound: 0,
        },
      });
    }

    // Start priority scan (this will run in background)
    logger.info(`🔍 Starting priority scan for ${identityAddress}...`);

    // Run the scan (this is async but we don't wait for completion)
    priorityScanVerusID(identityAddress)
      .then(result => {
        if (result.success) {
          logger.info(
            `✅ Priority scan completed for ${identityAddress}: ${result.message}`
          );
        } else {
          logger.error(
            `❌ Priority scan failed for ${identityAddress}: ${result.message}`
          );
        }
      })
      .catch(error => {
        logger.error(`❌ Priority scan error for ${identityAddress}:`, error);
      });

    // Return immediately to user
    const response = NextResponse.json({
      success: true,
      data: {
        needsScan: true,
        message: 'Priority scan started in background',
        status: 'scanning',
        estimatedTime: '2-5 minutes',
      },
    });

    return addSecurityHeaders(response);
  } catch (error: any) {
    logger.error('❌ Priority scan API error:', error);

    const response = NextResponse.json(
      {
        success: false,
        error: 'Failed to start priority scan',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );

    return addSecurityHeaders(response);
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const identityAddress = searchParams.get('address');

    if (!identityAddress) {
      return NextResponse.json(
        {
          success: false,
          error: 'Identity address is required',
        },
        { status: 400 }
      );
    }

    // Check if priority scan is needed
    const needsScan = await needsPriorityScan(identityAddress);

    const response = NextResponse.json({
      success: true,
      data: {
        identityAddress,
        needsScan,
        message: needsScan
          ? 'Priority scan recommended'
          : 'Already has complete data',
      },
    });

    return addSecurityHeaders(response);
  } catch (error: any) {
    logger.error('❌ Priority scan check error:', error);

    const response = NextResponse.json(
      {
        success: false,
        error: 'Failed to check scan status',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );

    return addSecurityHeaders(response);
  }
}
