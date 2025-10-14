/**
 * Verus ZMQ Real-Time Listener
 * Provides real-time blockchain updates without polling
 * Based on verus-explorer pattern from official Verus GitHub
 *
 * Setup:
 * 1. Install: npm install zeromq
 * 2. Add to verus.conf:
 *    zmqpubhashblock=tcp://127.0.0.1:28332
 *    zmqpubhashtx=tcp://127.0.0.1:28332
 *    zmqpubrawblock=tcp://127.0.0.1:28332
 *    zmqpubrawtx=tcp://127.0.0.1:28332
 * 3. Restart Verus daemon
 */

import { EventEmitter } from 'events';
import { logger } from './utils/logger';

// Type definitions for ZMQ events
export interface ZMQEvents {
  newBlock: (blockHash: string) => void;
  newTransaction: (txHash: string) => void;
  rawBlock: (blockData: Buffer) => void;
  rawTransaction: (txData: Buffer) => void;
  connected: () => void;
  disconnected: () => void;
  error: (error: Error) => void;
}

export class VerusZMQListener extends EventEmitter {
  private socket?: any; // zmq.Subscriber type (dynamic import)
  private isConnected: boolean = false;
  private zmqAddress: string;
  private reconnectTimeout?: NodeJS.Timeout;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private zmqAvailable: boolean = false;

  constructor(zmqAddress?: string) {
    super();
    this.zmqAddress =
      zmqAddress ||
      process.env.VERUS_ZMQ_ADDRESS ||
      'tcp://127.0.0.1:28332';
  }

  /**
   * Connect to Verus ZMQ endpoint
   * Dynamically imports zeromq to avoid breaking if not installed
   */
  async connect(): Promise<boolean> {
    try {
      // Dynamic import to avoid errors if zeromq not installed
      let zmq: any;
      try {
        // @ts-ignore - zeromq is optional dependency
        zmq = await import('zeromq');
        this.zmqAvailable = true;
      } catch (importError) {
        logger.warn(
          '⚠️  ZMQ package not installed. Run: npm install zeromq'
        );
        logger.info(
          '💡 ZMQ provides real-time updates but is optional. The app will work without it.'
        );
        this.zmqAvailable = false;
        return false;
      }

      this.socket = new zmq.Subscriber();

      // Subscribe to topics
      this.socket.subscribe('hashblock');
      this.socket.subscribe('hashtx');
      this.socket.subscribe('rawblock');
      this.socket.subscribe('rawtx');

      await this.socket.connect(this.zmqAddress);
      this.isConnected = true;
      this.reconnectAttempts = 0;

      logger.info(`✅ Connected to Verus ZMQ: ${this.zmqAddress}`);
      this.emit('connected');

      // Start listening for messages
      this.startListening();

      return true;
    } catch (error: any) {
      logger.error('❌ Failed to connect to ZMQ:', error.message);
      logger.info(
        '💡 To enable ZMQ: Add zmqpub* settings to verus.conf and restart daemon'
      );
      this.emit('error', error);

      // Attempt reconnect
      this.scheduleReconnect();

      return false;
    }
  }

  /**
   * Listen for ZMQ messages
   */
  private async startListening() {
    if (!this.socket) return;

    try {
      for await (const [topic, message] of this.socket) {
        const topicStr = topic.toString();

        try {
          switch (topicStr) {
            case 'hashblock':
              const blockHash = message.toString('hex');
              this.emit('newBlock', blockHash);
              logger.info(`🔔 New Block: ${blockHash.substring(0, 16)}...`);
              break;

            case 'hashtx':
              const txHash = message.toString('hex');
              this.emit('newTransaction', txHash);
              logger.debug(`🔔 New Transaction: ${txHash.substring(0, 16)}...`);
              break;

            case 'rawblock':
              // Full block data (binary)
              this.emit('rawBlock', message);
              logger.debug(`🔔 Raw Block Data: ${message.length} bytes`);
              break;

            case 'rawtx':
              // Full transaction data (binary)
              this.emit('rawTransaction', message);
              logger.debug(`🔔 Raw Transaction Data: ${message.length} bytes`);
              break;
          }
        } catch (error: any) {
          logger.error(`❌ Error processing ${topicStr}:`, error);
          this.emit('error', error);
        }
      }
    } catch (error: any) {
      if (this.isConnected) {
        logger.error('❌ ZMQ listening error:', error);
        this.emit('error', error);
        this.isConnected = false;
        this.emit('disconnected');

        // Attempt reconnect
        this.scheduleReconnect();
      }
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error(
        '❌ Max ZMQ reconnection attempts reached. ZMQ disabled.'
      );
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000); // Exponential backoff, max 30s

    logger.info(
      `🔄 Attempting ZMQ reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`
    );

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Disconnect from ZMQ
   */
  async disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    if (this.socket) {
      try {
        await this.socket.close();
        this.isConnected = false;
        logger.info('✅ Disconnected from ZMQ');
        this.emit('disconnected');
      } catch (error: any) {
        logger.error('❌ Error disconnecting from ZMQ:', error);
      }
    }
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      connected: this.isConnected,
      address: this.zmqAddress,
      reconnectAttempts: this.reconnectAttempts,
      zmqAvailable: this.zmqAvailable,
    };
  }

  /**
   * Check if ZMQ is available and configured
   */
  isAvailable(): boolean {
    return this.zmqAvailable && this.isConnected;
  }
}

// Singleton instance
export const zmqListener = new VerusZMQListener();

// Auto-connect on module load (gracefully fails if ZMQ not available)
if (process.env.NODE_ENV !== 'test') {
  zmqListener.connect().catch(err => {
    logger.warn('⚠️  ZMQ auto-connect failed (optional feature):', err.message);
  });
}

