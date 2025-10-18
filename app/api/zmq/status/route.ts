import { NextResponse } from 'next/server';
import { zmqListener } from '@/lib/zmq-listener';
import { zmqBlockIndexer } from '@/lib/services/zmq-block-indexer';
import { logger } from '@/lib/utils/logger';

/**
 * ZMQ Status Endpoint
 * Check if ZMQ is available, connected, and get real-time indexing stats
 */
export async function GET() {
  try {
    const zmqStatus = zmqListener.getStatus();
    const indexerStatus = zmqBlockIndexer.getStatus();

    const response = {
      success: true,
      zmq: {
        available: zmqStatus.zmqAvailable,
        connected: zmqStatus.connected,
        address: zmqStatus.address,
        reconnectAttempts: zmqStatus.reconnectAttempts,
        status: zmqStatus.connected
          ? 'connected'
          : zmqStatus.zmqAvailable
            ? 'disconnected'
            : 'not_installed',
      },
      indexer: {
        running: indexerStatus.running,
        stats: indexerStatus.stats,
        queueSize: indexerStatus.queueSize,
      },
      setup: {
        required: !zmqStatus.zmqAvailable,
        steps: zmqStatus.zmqAvailable
          ? [
              'ZMQ package is installed ✅',
              'Configure verus.conf with zmqpub* settings',
              'Restart Verus daemon',
            ]
          : [
              'Install ZMQ: npm install zeromq',
              'Add to verus.conf:',
              '  zmqpubhashblock=tcp://127.0.0.1:28332',
              '  zmqpubhashtx=tcp://127.0.0.1:28332',
              '  zmqpubrawblock=tcp://127.0.0.1:28332',
              '  zmqpubrawtx=tcp://127.0.0.1:28332',
              'Restart Verus daemon',
              'Restart this application',
            ],
      },
      benefits: [
        'Real-time block notifications (no polling)',
        'Instant UI updates',
        'Reduced daemon load',
        '~90% less RPC calls for block updates',
      ],
      note: 'ZMQ is optional. The explorer works fine without it, but ZMQ provides better performance.',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error: any) {
    logger.error('❌ Error getting ZMQ status:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get ZMQ status',
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * Start/Stop ZMQ Indexer
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'start') {
      await zmqBlockIndexer.start();
      return NextResponse.json({
        success: true,
        message: 'ZMQ indexer started',
        status: zmqBlockIndexer.getStatus(),
      });
    } else if (action === 'stop') {
      await zmqBlockIndexer.stop();
      return NextResponse.json({
        success: true,
        message: 'ZMQ indexer stopped',
        status: zmqBlockIndexer.getStatus(),
      });
    } else if (action === 'reset_stats') {
      zmqBlockIndexer.resetStats();
      return NextResponse.json({
        success: true,
        message: 'ZMQ indexer stats reset',
        status: zmqBlockIndexer.getStatus(),
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid action',
          validActions: ['start', 'stop', 'reset_stats'],
        },
        { status: 400 }
      );
    }
  } catch (error: any) {
    logger.error('❌ Error controlling ZMQ indexer:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to control ZMQ indexer',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
