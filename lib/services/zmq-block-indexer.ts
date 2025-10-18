/**
 * ZMQ Block Indexer Service
 * Automatically indexes new blocks as they arrive via ZMQ
 * Based on verus-explorer pattern from official Verus GitHub
 */

import { zmqListener } from '../zmq-listener';
import { verusAPI } from '../rpc-client-robust';
import { logger } from '../utils/logger';
import { redisClient } from '@/lib/cache/redis-client';

interface BlockIndexStats {
  blocksIndexed: number;
  transactionsIndexed: number;
  lastBlockHash?: string;
  lastBlockHeight?: number;
  lastBlockTime?: string;
  errors: number;
}

class ZMQBlockIndexer {
  private stats: BlockIndexStats = {
    blocksIndexed: 0,
    transactionsIndexed: 0,
    errors: 0,
  };
  private isRunning: boolean = false;
  private indexingQueue: Set<string> = new Set();

  /**
   * Start the ZMQ block indexer
   */
  async start() {
    if (this.isRunning) {
      logger.warn('⚠️  ZMQ Block Indexer already running');
      return;
    }

    if (!zmqListener.isAvailable()) {
      logger.info(
        '💡 ZMQ not available. Block indexing will use polling instead.'
      );
      return;
    }

    this.isRunning = true;
    logger.info('🚀 Starting ZMQ Block Indexer...');

    // Listen for new blocks
    zmqListener.on('newBlock', async (blockHash: string) => {
      await this.indexBlock(blockHash);
    });

    // Listen for new transactions
    zmqListener.on('newTransaction', async (txHash: string) => {
      await this.indexTransaction(txHash);
    });

    // Handle ZMQ errors
    zmqListener.on('error', (error: Error) => {
      this.stats.errors++;
      logger.error('❌ ZMQ Indexer Error:', error);
    });

    // Handle disconnection
    zmqListener.on('disconnected', () => {
      logger.warn('⚠️  ZMQ disconnected. Waiting for reconnection...');
    });

    // Handle reconnection
    zmqListener.on('connected', () => {
      logger.info('✅ ZMQ reconnected. Resuming block indexing...');
    });

    logger.info('✅ ZMQ Block Indexer started successfully');
  }

  /**
   * Stop the ZMQ block indexer
   */
  async stop() {
    if (!this.isRunning) {
      return;
    }

    logger.info('🛑 Stopping ZMQ Block Indexer...');

    // Remove all listeners
    zmqListener.removeAllListeners('newBlock');
    zmqListener.removeAllListeners('newTransaction');
    zmqListener.removeAllListeners('error');
    zmqListener.removeAllListeners('disconnected');
    zmqListener.removeAllListeners('connected');

    this.isRunning = false;
    logger.info('✅ ZMQ Block Indexer stopped');
  }

  /**
   * Index a new block
   */
  private async indexBlock(blockHash: string) {
    // Prevent duplicate indexing
    if (this.indexingQueue.has(blockHash)) {
      logger.debug(`⏭️  Block ${blockHash} already in indexing queue`);
      return;
    }

    this.indexingQueue.add(blockHash);

    try {
      logger.info(`📦 Indexing new block: ${blockHash.substring(0, 16)}...`);

      // Fetch full block data with transactions
      const block = await verusAPI.call('getblock', [blockHash, 2]);

      // Update stats
      this.stats.blocksIndexed++;
      this.stats.lastBlockHash = blockHash;
      this.stats.lastBlockHeight = block.height;
      this.stats.lastBlockTime = new Date(block.time * 1000).toISOString();
      this.stats.transactionsIndexed += block.tx?.length || 0;

      // Invalidate relevant caches
      await this.invalidateCaches(block);

      // Store block in database (if you have DB setup)
      // await storeBlockInDatabase(block);

      logger.info(
        `✅ Block indexed: ${block.height} (${block.tx?.length || 0} txs)`
      );
    } catch (error: any) {
      this.stats.errors++;
      logger.error(`❌ Failed to index block ${blockHash}:`, error.message);
    } finally {
      this.indexingQueue.delete(blockHash);
    }
  }

  /**
   * Index a new transaction
   */
  private async indexTransaction(txHash: string) {
    try {
      logger.debug(`📝 New transaction: ${txHash.substring(0, 16)}...`);

      // Optionally fetch and process transaction
      // const tx = await verusAPI.call('getrawtransaction', [txHash, 1]);

      // Invalidate mempool cache
      if ((redisClient as any)?.status === 'ready') {
        await redisClient.del('mempool:transactions');
        await redisClient.del('mempool:size');
      }
    } catch (error: any) {
      logger.error(`❌ Failed to index transaction ${txHash}:`, error.message);
    }
  }

  /**
   * Invalidate relevant caches when new block arrives
   */
  private async invalidateCaches(block: any) {
    if ((redisClient as any)?.status !== 'ready') {
      return;
    }

    try {
      const keys = [
        'blockchain:info',
        'mining:info',
        'latest:blocks',
        'latest:transactions',
        'network:stats',
      ];

      await Promise.all(keys.map(key => redisClient.del(key)));

      logger.debug('🗑️  Cache invalidated for new block');
    } catch (error: any) {
      logger.error('❌ Failed to invalidate caches:', error);
    }
  }

  /**
   * Get indexer statistics
   */
  getStats(): BlockIndexStats {
    return { ...this.stats };
  }

  /**
   * Get indexer status
   */
  getStatus() {
    return {
      running: this.isRunning,
      zmqAvailable: zmqListener.isAvailable(),
      zmqStatus: zmqListener.getStatus(),
      stats: this.getStats(),
      queueSize: this.indexingQueue.size,
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      blocksIndexed: 0,
      transactionsIndexed: 0,
      errors: 0,
    };
    logger.info('📊 ZMQ Indexer stats reset');
  }
}

// Singleton instance
export const zmqBlockIndexer = new ZMQBlockIndexer();

// Auto-start in production
if (
  process.env.NODE_ENV === 'production' &&
  process.env.ENABLE_ZMQ !== 'false'
) {
  zmqBlockIndexer.start().catch(err => {
    logger.warn(
      '⚠️  Could not start ZMQ indexer (optional feature):',
      err.message
    );
  });
}
