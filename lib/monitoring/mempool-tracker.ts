import { mempoolCache } from '../utils/lru-cache';

interface MempoolEntry {
  txid: string;
  time: number;
  size: number;
  fee: number;
}

interface PropagationResult {
  propagationSeconds: number | null;
  firstSeenTx: string | null;
  totalTxs: number;
  trackedTxs: number;
}

export class MempoolTracker {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private getRawMempool: () => Promise<MempoolEntry[]>;
  private pollInterval: number;

  constructor(
    getRawMempool: () => Promise<MempoolEntry[]>,
    pollInterval: number = 10000 // 10 seconds default
  ) {
    this.getRawMempool = getRawMempool;
    this.pollInterval = pollInterval;
  }

  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.poll();

    this.intervalId = setInterval(() => {
      this.poll();
    }, this.pollInterval);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
  }

  private async poll(): Promise<void> {
    try {
      const mempool = await this.getRawMempool();
      const now = Date.now() / 1000; // Convert to seconds

      for (const entry of mempool) {
        const existingTime = mempoolCache.get(entry.txid);
        if (!existingTime || entry.time < existingTime) {
          mempoolCache.set(entry.txid, entry.time);
        }
      }

      // Clean up old entries
      mempoolCache.cleanup();
    } catch (error) {
      console.warn('Mempool polling failed:', error);
    }
  }

  getFirstSeen(txid: string): number | null {
    return mempoolCache.get(txid);
  }

  calculatePropagation(blockTime: number, txIds: string[]): PropagationResult {
    const result: PropagationResult = {
      propagationSeconds: null,
      firstSeenTx: null,
      totalTxs: txIds.length,
      trackedTxs: 0,
    };

    if (!txIds || txIds.length === 0) {
      return result;
    }

    let minPropagation: number | null = null;
    let earliestTx: string | null = null;

    for (const txid of txIds) {
      const firstSeen = this.getFirstSeen(txid);
      if (firstSeen) {
        result.trackedTxs++;
        const propagation = blockTime - firstSeen;

        if (minPropagation === null || propagation < minPropagation) {
          minPropagation = propagation;
          earliestTx = txid;
        }
      }
    }

    result.propagationSeconds = minPropagation;
    result.firstSeenTx = earliestTx;

    return result;
  }

  getStats() {
    return {
      isRunning: this.isRunning,
      pollInterval: this.pollInterval,
      cacheStats: mempoolCache.getStats(),
    };
  }
}

// Global mempool tracker instance
let globalMempoolTracker: MempoolTracker | null = null;

export function initializeMempoolTracker(
  getRawMempool: () => Promise<MempoolEntry[]>,
  pollInterval?: number
): MempoolTracker {
  if (globalMempoolTracker) {
    globalMempoolTracker.stop();
  }

  globalMempoolTracker = new MempoolTracker(getRawMempool, pollInterval);
  return globalMempoolTracker;
}

export function getMempoolTracker(): MempoolTracker | null {
  return globalMempoolTracker;
}

export function startMempoolTracking(): void {
  if (globalMempoolTracker) {
    globalMempoolTracker.start();
  }
}

export function stopMempoolTracking(): void {
  if (globalMempoolTracker) {
    globalMempoolTracker.stop();
  }
}

export function formatPropagationTime(seconds: number | null): string {
  if (seconds === null) return 'Unknown';
  if (seconds < 1) return `${(seconds * 1000).toFixed(0)}ms`;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  if (seconds < 3600) return `${(seconds / 60).toFixed(1)}m`;
  return `${(seconds / 3600).toFixed(1)}h`;
}

export function getPropagationColor(seconds: number | null): string {
  if (seconds === null) return 'text-gray-400';
  if (seconds < 1) return 'text-green-400';
  if (seconds < 5) return 'text-yellow-400';
  if (seconds < 30) return 'text-orange-400';
  return 'text-red-400';
}
