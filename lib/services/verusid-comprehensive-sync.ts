// VerusID Comprehensive Sync Service
// Syncs all active VerusIDs with complete block analytics and statistics

import { verusAPI } from '@/lib/rpc-client-robust';
import { Pool } from 'pg';
import { UTXODatabaseService } from './utxo-database';
import { BlockAnalyticsExtractor } from './block-analytics-extractor';
import { StatisticsCalculator } from './statistics-calculator';

export interface SyncProgress {
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
  total: number;
  processed: number;
  failed: number;
  current?: string;
  percentComplete: number;
  estimatedTimeRemaining?: string;
  startTime?: Date;
  errors: Array<{ address: string; error: string }>;
}

export class VerusIDComprehensiveSync {
  private db: Pool;
  private utxoDb: UTXODatabaseService;
  private blockExtractor: BlockAnalyticsExtractor;
  private statsCalculator: StatisticsCalculator;
  
  private progress: SyncProgress = {
    status: 'idle',
    total: 0,
    processed: 0,
    failed: 0,
    percentComplete: 0,
    errors: [],
  };
  
  private shouldStop = false;
  private shouldPause = false;

  constructor(databaseUrl: string) {
    this.db = new Pool({
      connectionString: databaseUrl,
      max: 10, // Lower max to conserve memory
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
    
    this.utxoDb = new UTXODatabaseService(databaseUrl);
    this.blockExtractor = new BlockAnalyticsExtractor(this.db);
    this.statsCalculator = new StatisticsCalculator(this.db);
  }

  /**
   * Get current sync progress
   */
  getProgress(): SyncProgress {
    return { ...this.progress };
  }

  /**
   * Stop the sync process
   */
  stop(): void {
    this.shouldStop = true;
    this.progress.status = 'idle';
  }

  /**
   * Pause the sync process
   */
  pause(): void {
    this.shouldPause = true;
    this.progress.status = 'paused';
  }

  /**
   * Resume the sync process
   */
  resume(): void {
    this.shouldPause = false;
    if (this.progress.status === 'paused') {
      this.progress.status = 'running';
    }
  }

  /**
   * Check memory usage and pause if needed
   */
  private async checkMemoryAndPause(): Promise<void> {
    try {
      const memUsage = process.memoryUsage();
      const usedPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
      
      if (usedPercent > 85) {
        console.warn(`Memory usage high (${usedPercent.toFixed(1)}%), pausing...`);
        this.shouldPause = true;
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
        
        // Wait for memory to clear
        await new Promise(resolve => setTimeout(resolve, 10000));
        this.shouldPause = false;
      }
    } catch (error) {
      console.error('Error checking memory:', error);
    }
  }

  /**
   * Sync all active VerusIDs
   */
  async syncAllVerusIDs(options: {
    batchSize?: number;
    delayBetweenBatches?: number;
    specificId?: string;
    incremental?: boolean;
  } = {}): Promise<SyncProgress> {
    const {
      batchSize = 5,
      delayBetweenBatches = 10000,
      specificId,
      incremental = false,
    } = options;

    this.shouldStop = false;
    this.shouldPause = false;
    this.progress = {
      status: 'running',
      total: 0,
      processed: 0,
      failed: 0,
      percentComplete: 0,
      startTime: new Date(),
      errors: [],
    };

    try {
      // Fetch all active VerusIDs
      console.log('Fetching all active VerusIDs...');
      const identities = specificId
        ? [await verusAPI.getIdentity(specificId)]
        : await verusAPI.listIdentities();
      
      if (!identities || identities.length === 0) {
        console.log('No identities found');
        this.progress.status = 'completed';
        return this.progress;
      }

      // Extract I-addresses (identityaddress field)
      const addresses = identities
        .map((id: any) => {
          // Handle different API response formats
          return id?.identity?.identityaddress || id?.identityaddress || null;
        })
        .filter(Boolean);

      console.log(`Found ${addresses.length} VerusID addresses`);
      this.progress.total = addresses.length;

      // If incremental, filter to only updated IDs
      let addressesToSync = addresses;
      if (incremental) {
        addressesToSync = await this.filterUpdatedAddresses(addresses);
        console.log(`Incremental mode: ${addressesToSync.length} addresses need updating`);
        this.progress.total = addressesToSync.length;
      }

      // Process in batches
      for (let i = 0; i < addressesToSync.length; i += batchSize) {
        if (this.shouldStop) {
          console.log('Sync stopped by user');
          this.progress.status = 'idle';
          break;
        }

        while (this.shouldPause) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        const batch = addressesToSync.slice(i, i + batchSize);
        console.log(`\nProcessing batch ${Math.floor(i / batchSize) + 1} (${batch.length} addresses)...`);

        // Process batch in parallel
        await Promise.allSettled(
          batch.map(address => this.syncSingleVerusID(address))
        );

        // Update progress
        this.progress.processed = Math.min(i + batchSize, addressesToSync.length);
        this.progress.percentComplete = (this.progress.processed / this.progress.total) * 100;
        
        // Calculate ETA
        if (this.progress.startTime) {
          const elapsed = Date.now() - this.progress.startTime.getTime();
          const avgTimePerID = elapsed / this.progress.processed;
          const remaining = (this.progress.total - this.progress.processed) * avgTimePerID;
          this.progress.estimatedTimeRemaining = this.formatDuration(remaining);
        }

        console.log(`Progress: ${this.progress.processed}/${this.progress.total} (${this.progress.percentComplete.toFixed(1)}%)`);
        console.log(`ETA: ${this.progress.estimatedTimeRemaining || 'calculating...'}`);

        // Check memory and pause if needed
        await this.checkMemoryAndPause();

        // Delay between batches to avoid overwhelming the system
        if (i + batchSize < addressesToSync.length) {
          console.log(`Waiting ${delayBetweenBatches / 1000}s before next batch...`);
          await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
        }
      }

      this.progress.status = 'completed';
      console.log(`\n✅ Sync completed: ${this.progress.processed} processed, ${this.progress.failed} failed`);
      
      if (this.progress.errors.length > 0) {
        console.log(`\nErrors encountered:`);
        this.progress.errors.forEach(err => {
          console.log(`  - ${err.address}: ${err.error}`);
        });
      }

    } catch (error: any) {
      console.error('Sync error:', error);
      this.progress.status = 'error';
      this.progress.errors.push({
        address: 'system',
        error: error.message || 'Unknown error',
      });
    }

    return this.progress;
  }

  /**
   * Sync a single VerusID
   */
  private async syncSingleVerusID(address: string): Promise<void> {
    this.progress.current = address;
    console.log(`  Syncing ${address}...`);

    try {
      // Step 1: Get all stake events for this address (from existing UTXO database)
      console.log(`    [1/3] Fetching stake events from database...`);
      const stakeEvents = await this.utxoDb.getStakeEvents(address);
      
      // Step 2: Extract block analytics for each stake block
      console.log(`    [2/3] Extracting block analytics (${stakeEvents.length} blocks)...`);
      let blockAnalyticsExtracted = 0;
      for (const event of stakeEvents) {
        try {
          // Check if we already have analytics for this block
          const existingQuery = await this.db.query(
            'SELECT height FROM block_analytics WHERE height = $1',
            [event.blockHeight]
          );
          
          if (existingQuery.rows.length === 0) {
            const analytics = await this.blockExtractor.extractBlockAnalytics(event.blockHeight);
            if (analytics) {
              await this.blockExtractor.storeBlockAnalytics(analytics);
              blockAnalyticsExtracted++;
            }
          }
        } catch (error) {
          console.error(`      Error extracting block ${event.blockHeight}:`, error);
          // Continue with other blocks
        }

        // Throttle block extraction
        if (blockAnalyticsExtracted % 10 === 0 && blockAnalyticsExtracted > 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      console.log(`      Extracted ${blockAnalyticsExtracted} new block analytics`);

      // Step 3: Calculate comprehensive statistics
      console.log(`    [3/3] Calculating statistics...`);
      const stats = await this.statsCalculator.calculateStats(address);
      await this.statsCalculator.storeStats(stats);

      console.log(`  ✅ ${address} completed`);
    } catch (error: any) {
      console.error(`  ❌ ${address} failed:`, error.message);
      this.progress.failed++;
      this.progress.errors.push({
        address,
        error: error.message || 'Unknown error',
      });
    }
  }

  /**
   * Filter addresses that need updating (for incremental sync)
   */
  private async filterUpdatedAddresses(addresses: string[]): Promise<string[]> {
    const updated: string[] = [];

    for (const address of addresses) {
      try {
        // Check when this address was last calculated
        const result = await this.db.query(
          'SELECT last_calculated FROM verusid_statistics WHERE address = $1',
          [address]
        );

        if (result.rows.length === 0) {
          // Never synced, needs update
          updated.push(address);
        } else {
          const lastCalculated = new Date(result.rows[0].last_calculated);
          const hoursSinceUpdate = (Date.now() - lastCalculated.getTime()) / (1000 * 60 * 60);
          
          // Update if older than 24 hours
          if (hoursSinceUpdate > 24) {
            updated.push(address);
          }
        }
      } catch (error) {
        // If error checking, include address to be safe
        updated.push(address);
      }
    }

    return updated;
  }

  /**
   * Format duration in human-readable format
   */
  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  /**
   * Close database connections
   */
  async close(): Promise<void> {
    await this.db.end();
  }
}

