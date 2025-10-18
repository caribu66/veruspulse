/**
 * Intelligent Mass Scanner for 10,000+ VerusIDs
 * Implements smart rate limiting, caching, and resource management
 * to avoid hammering the RPC while maintaining high throughput
 */

import { verusAPI } from '@/lib/rpc-client-robust';
import { Pool } from 'pg';

interface ScanConfig {
  maxConcurrentRequests: number;
  delayBetweenBatches: number; // milliseconds
  blockBatchSize: number;
  addressBatchSize: number;
  cacheBlockData: boolean;
  maxRetries: number;
  backoffMultiplier: number;
}

interface ScanProgress {
  totalAddresses: number;
  addressesProcessed: number;
  totalBlocks: number;
  blocksProcessed: number;
  stakeEventsFound: number;
  startTime: number;
  currentPhase: string;
  estimatedCompletion?: number;
  errors: number;
  cacheHits: number;
  cacheMisses: number;
}

export class IntelligentMassScanner {
  private db: Pool;
  private config: ScanConfig;
  private progress: ScanProgress;
  private isRunning: boolean = false;
  private blockCache: Map<number, any>;
  private requestQueue: Array<() => Promise<any>> = [];
  private activeRequests: number = 0;
  private lastRequestTime: number = 0;

  constructor(dbPool: Pool, config?: Partial<ScanConfig>) {
    this.db = dbPool;

    // Default configuration optimized for not hammering RPC
    this.config = {
      maxConcurrentRequests: 3, // Low to avoid overwhelming RPC
      delayBetweenBatches: 100, // 100ms delay between batches
      blockBatchSize: 50, // Process 50 blocks at a time
      addressBatchSize: 10, // Process 10 addresses at a time
      cacheBlockData: true, // Cache blocks to reduce duplicate requests
      maxRetries: 3,
      backoffMultiplier: 2,
      ...config,
    };

    this.blockCache = new Map();
    this.progress = {
      totalAddresses: 0,
      addressesProcessed: 0,
      totalBlocks: 0,
      blocksProcessed: 0,
      stakeEventsFound: 0,
      startTime: Date.now(),
      currentPhase: 'idle',
      errors: 0,
      cacheHits: 0,
      cacheMisses: 0,
    };
  }

  /**
   * Main entry point - Scan all active VerusIDs
   */
  async scanAllVerusIDs(
    options: {
      startFromHeight?: number;
      endAtHeight?: number;
      limitAddresses?: number;
    } = {}
  ): Promise<void> {
    if (this.isRunning) {
      throw new Error('Scan already in progress');
    }

    this.isRunning = true;
    this.progress.startTime = Date.now();

    try {
      console.log('[Intelligent Scanner] Starting comprehensive scan...');

      // Phase 1: Get all active VerusIDs from the blockchain
      this.progress.currentPhase = 'discovering_identities';
      const addresses = await this.discoverActiveVerusIDs(
        options.limitAddresses
      );
      this.progress.totalAddresses = addresses.length;

      console.log(
        `[Intelligent Scanner] Found ${addresses.length} active VerusIDs`
      );

      // Phase 2: Determine block range
      this.progress.currentPhase = 'determining_range';
      const blockchainInfo = await this.rateLimitedRequest(() =>
        verusAPI.getBlockchainInfo()
      );

      const endHeight = options.endAtHeight || blockchainInfo.blocks;
      const startHeight = options.startFromHeight || 1;
      this.progress.totalBlocks = endHeight - startHeight + 1;

      console.log(
        `[Intelligent Scanner] Scanning blocks ${startHeight} to ${endHeight} (${this.progress.totalBlocks} blocks)`
      );

      // Phase 3: Scan blocks in an intelligent way
      this.progress.currentPhase = 'scanning_blocks';
      await this.scanBlocksIntelligently(startHeight, endHeight, addresses);

      // Phase 4: Calculate statistics for all addresses
      this.progress.currentPhase = 'calculating_statistics';
      await this.calculateAllStatistics(addresses);

      console.log('[Intelligent Scanner] Scan complete!');
      console.log(`  Total Addresses: ${this.progress.addressesProcessed}`);
      console.log(`  Total Blocks: ${this.progress.blocksProcessed}`);
      console.log(`  Stake Events: ${this.progress.stakeEventsFound}`);
      console.log(`  Cache Efficiency: ${this.getCacheEfficiency()}%`);
      console.log(`  Errors: ${this.progress.errors}`);
    } catch (error) {
      console.error('[Intelligent Scanner] Fatal error:', error);
      throw error;
    } finally {
      this.isRunning = false;
      this.progress.currentPhase = 'complete';
    }
  }

  /**
   * Discover all active VerusIDs without hammering the RPC
   */
  private async discoverActiveVerusIDs(limit?: number): Promise<string[]> {
    const addresses: Set<string> = new Set();

    // Strategy 1: Get from existing stake_events table
    console.log('[Discovery] Checking existing stake events...');
    const existingResult = await this.db.query(
      "SELECT DISTINCT address FROM stake_events WHERE address LIKE 'i%' LIMIT $1",
      [limit || 100000]
    );
    existingResult.rows.forEach(row => addresses.add(row.address));
    console.log(
      `[Discovery] Found ${addresses.size} addresses from existing data`
    );

    // Strategy 2: Get from identities table if available
    console.log('[Discovery] Checking identities table...');
    try {
      const identitiesResult = await this.db.query(
        "SELECT DISTINCT identity_address FROM identities WHERE identity_address LIKE 'i%' LIMIT $1",
        [limit || 100000]
      );
      identitiesResult.rows.forEach(row => addresses.add(row.identity_address));
      console.log(`[Discovery] Total unique addresses: ${addresses.size}`);
    } catch (error) {
      console.log('[Discovery] No identities table available:', error);
    }

    // Strategy 3: If still need more, use listidentities RPC to get all VerusIDs
    if (addresses.size < 100 || (limit && addresses.size < limit)) {
      console.log('[Discovery] Fetching VerusIDs from blockchain via RPC...');
      await this.discoverFromRPC(addresses, limit);
    }

    // Strategy 4: If still need more, scan recent blocks for I-addresses (fallback)
    if (addresses.size < 100 || (limit && addresses.size < limit)) {
      console.log('[Discovery] Scanning recent blocks for more addresses...');
      await this.discoverFromRecentBlocks(addresses, limit);
    }

    const addressList = Array.from(addresses);
    return limit ? addressList.slice(0, limit) : addressList;
  }

  /**
   * Discover addresses using listidentities RPC call
   */
  private async discoverFromRPC(
    addresses: Set<string>,
    limit?: number
  ): Promise<void> {
    try {
      const batchSize = 1000; // Fetch 1000 at a time
      const maxToFetch = limit || 100000;
      let fetched = 0;

      console.log(
        `[Discovery RPC] Fetching up to ${maxToFetch} VerusIDs from blockchain...`
      );

      while (fetched < maxToFetch) {
        const identities = await this.rateLimitedRequest(() =>
          verusAPI.listIdentities({
            start: fetched,
            count: Math.min(batchSize, maxToFetch - fetched),
            txproof: false,
          })
        );

        // listIdentities only returns wallet identities, not all blockchain identities
        // So if it returns null or empty, we skip this method
        if (
          !identities ||
          !Array.isArray(identities) ||
          identities.length === 0
        ) {
          console.log(
            `[Discovery RPC] listIdentities returned no data (only shows wallet identities). Skipping RPC discovery.`
          );
          break;
        }

        // Extract I-addresses from identities
        identities.forEach((identity: any) => {
          if (identity?.identity?.identityaddress) {
            const addr = identity.identity.identityaddress;
            if (addr && addr.startsWith('i')) {
              addresses.add(addr);
            }
          }
        });

        fetched += identities.length;
        console.log(
          `[Discovery RPC] Progress: ${fetched} fetched, ${addresses.size} unique I-addresses found`
        );

        // If we got fewer than requested, we've reached the end
        if (identities.length < batchSize) {
          console.log(`[Discovery RPC] Reached end of identities list`);
          break;
        }
      }

      console.log(
        `[Discovery RPC] Complete! Found ${addresses.size} unique I-addresses`
      );
    } catch (error: any) {
      console.error(
        `[Discovery RPC] Error fetching identities:`,
        error.message
      );
    }
  }

  /**
   * Discover addresses from recent blocks
   */
  private async discoverFromRecentBlocks(
    addresses: Set<string>,
    limit?: number
  ): Promise<void> {
    const blockchainInfo = await this.rateLimitedRequest(() =>
      verusAPI.getBlockchainInfo()
    );

    const currentHeight = blockchainInfo.blocks;
    const scanDepth = 10000; // Scan last 10k blocks for addresses
    const startHeight = Math.max(1, currentHeight - scanDepth);

    console.log(
      `[Discovery] Scanning blocks ${startHeight} to ${currentHeight}...`
    );

    for (let height = currentHeight; height >= startHeight; height -= 100) {
      if (limit && addresses.size >= limit) break;

      const batch = [];
      for (let i = 0; i < 100 && height - i >= startHeight; i++) {
        batch.push(height - i);
      }

      await this.processBatchWithRateLimit(batch, async blockHeight => {
        try {
          const hash = await this.rateLimitedRequest(() =>
            verusAPI.getBlockHash(blockHeight)
          );
          const block = await this.rateLimitedRequest(() =>
            verusAPI.getBlock(hash, 1)
          );

          // Check if PoS block
          if (block.blocktype === 'minted' && block.tx && block.tx.length > 0) {
            // Get staker from first transaction
            const coinstakeTxid = block.tx[0];
            const tx = await this.rateLimitedRequest(() =>
              verusAPI.getRawTransaction(coinstakeTxid, true)
            );

            if (tx.vout && tx.vout.length > 1) {
              const output = tx.vout[1];
              if (output.scriptPubKey?.addresses) {
                const addr = output.scriptPubKey.addresses[0];
                if (addr.startsWith('i')) {
                  addresses.add(addr);
                }
              }
            }
          }
        } catch (error) {
          // Skip errors during discovery
        }
      });

      if (height % 1000 === 0) {
        console.log(
          `[Discovery] Scanned to block ${height}, found ${addresses.size} addresses`
        );
      }
    }
  }

  /**
   * Scan blocks intelligently with caching and rate limiting
   */
  private async scanBlocksIntelligently(
    startHeight: number,
    endHeight: number,
    targetAddresses: string[]
  ): Promise<void> {
    const addressSet = new Set(targetAddresses);

    console.log('[Intelligent Scan] Starting optimized block scanning...');
    console.log(
      `[Intelligent Scan] Config: ${this.config.maxConcurrentRequests} concurrent, ${this.config.delayBetweenBatches}ms delay`
    );

    // Process blocks in batches
    for (
      let height = startHeight;
      height <= endHeight;
      height += this.config.blockBatchSize
    ) {
      if (!this.isRunning) break;

      const batchEnd = Math.min(
        height + this.config.blockBatchSize - 1,
        endHeight
      );
      const batch = [];

      for (let h = height; h <= batchEnd; h++) {
        batch.push(h);
      }

      // Process this batch with rate limiting
      await this.processBatchWithRateLimit(batch, async blockHeight => {
        await this.processBlockOptimized(blockHeight, addressSet);
      });

      this.progress.blocksProcessed += batch.length;

      // Calculate ETA
      const elapsed = Date.now() - this.progress.startTime;
      const blocksRemaining = endHeight - this.progress.blocksProcessed;
      const avgTimePerBlock = elapsed / this.progress.blocksProcessed;
      this.progress.estimatedCompletion =
        Date.now() + blocksRemaining * avgTimePerBlock;

      // Progress update every 1000 blocks
      if (this.progress.blocksProcessed % 1000 === 0) {
        const percentage = (
          (this.progress.blocksProcessed / this.progress.totalBlocks) *
          100
        ).toFixed(2);
        const eta = new Date(
          this.progress.estimatedCompletion
        ).toLocaleTimeString();
        console.log(
          `[Progress] ${this.progress.blocksProcessed}/${this.progress.totalBlocks} blocks (${percentage}%), ${this.progress.stakeEventsFound} stakes found, ETA: ${eta}`
        );
        console.log(
          `[Cache] Efficiency: ${this.getCacheEfficiency()}%, Hits: ${this.progress.cacheHits}, Misses: ${this.progress.cacheMisses}`
        );
      }

      // Delay between batches to avoid hammering RPC
      await this.sleep(this.config.delayBetweenBatches);
    }
  }

  /**
   * Process a single block in an optimized way
   */
  private async processBlockOptimized(
    height: number,
    targetAddresses: Set<string>
  ): Promise<void> {
    try {
      // Check cache first
      let block = this.getFromCache(height);

      if (!block) {
        this.progress.cacheMisses++;
        const hash = await this.rateLimitedRequest(() =>
          verusAPI.getBlockHash(height)
        );
        block = await this.rateLimitedRequest(() => verusAPI.getBlock(hash, 2));

        if (this.config.cacheBlockData) {
          this.addToCache(height, block);
        }
      } else {
        this.progress.cacheHits++;
      }

      // Only process if it's a PoS block
      if (
        block.blocktype !== 'minted' &&
        !block.stakeRewardInfo?.isStakeReward
      ) {
        return;
      }

      // Extract stake event
      if (block.tx && block.tx.length > 0) {
        const coinstake = block.tx[0];

        if (coinstake.vout && coinstake.vout.length > 1) {
          const output = coinstake.vout[1];

          if (
            output.scriptPubKey?.addresses &&
            output.scriptPubKey.addresses.length > 0
          ) {
            const address = output.scriptPubKey.addresses[0];

            // Only process if it's a target address
            if (targetAddresses.has(address)) {
              const rewardAmount = block.stakeRewardInfo?.rewardAmount || 0;
              const stakeAmount = block.stakeAmount || 0;
              const stakeAge = block.stakeAge || 0;

              await this.storeStakeEvent({
                address,
                txid: coinstake.txid,
                blockHeight: height,
                blockTime: new Date(block.time * 1000),
                rewardAmount: Math.floor(rewardAmount * 100000000),
                stakeAmount: Math.floor(stakeAmount * 100000000),
                stakeAge,
              });

              this.progress.stakeEventsFound++;
            }
          }
        }
      }

      // Also store block analytics
      await this.storeBlockAnalytics(block);
    } catch (error) {
      this.progress.errors++;
      if (this.progress.errors % 100 === 0) {
        console.error(
          `[Error] Processed ${this.progress.errors} errors so far`
        );
      }
    }
  }

  /**
   * Process a batch with rate limiting
   */
  private async processBatchWithRateLimit<T>(
    items: T[],
    processor: (item: T) => Promise<void>
  ): Promise<void> {
    const promises: Promise<void>[] = [];

    for (const item of items) {
      // Wait if we've hit the concurrent request limit
      while (this.activeRequests >= this.config.maxConcurrentRequests) {
        await this.sleep(10);
      }

      this.activeRequests++;
      const promise = processor(item).finally(() => {
        this.activeRequests--;
      });
      promises.push(promise);
    }

    await Promise.allSettled(promises);
  }

  /**
   * Rate-limited RPC request with retry logic
   */
  private async rateLimitedRequest<T>(
    request: () => Promise<T>,
    retries: number = 0
  ): Promise<T> {
    // Ensure minimum delay between requests
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    const minDelay = 10; // 10ms minimum between requests

    if (timeSinceLastRequest < minDelay) {
      await this.sleep(minDelay - timeSinceLastRequest);
    }

    this.lastRequestTime = Date.now();

    try {
      return await request();
    } catch (error) {
      if (retries < this.config.maxRetries) {
        const backoffDelay =
          Math.pow(this.config.backoffMultiplier, retries) * 100;
        console.log(
          `[Retry] Attempt ${retries + 1}/${this.config.maxRetries}, waiting ${backoffDelay}ms`
        );
        await this.sleep(backoffDelay);
        return this.rateLimitedRequest(request, retries + 1);
      }
      throw error;
    }
  }

  /**
   * Cache management
   */
  private getFromCache(height: number): any | null {
    return this.blockCache.get(height) || null;
  }

  private addToCache(height: number, block: any): void {
    // Keep cache size reasonable (max 1000 blocks)
    if (this.blockCache.size >= 1000) {
      const firstKey = this.blockCache.keys().next().value;
      if (firstKey !== undefined) {
        this.blockCache.delete(firstKey);
      }
    }
    this.blockCache.set(height, block);
  }

  private getCacheEfficiency(): number {
    const total = this.progress.cacheHits + this.progress.cacheMisses;
    return total > 0
      ? (((this.progress.cacheHits / total) * 100).toFixed(2) as any)
      : 0;
  }

  /**
   * Store stake event in database
   */
  private async storeStakeEvent(event: {
    address: string;
    txid: string;
    blockHeight: number;
    blockTime: Date;
    rewardAmount: number;
    stakeAmount: number;
    stakeAge: number;
  }): Promise<void> {
    const query = `
      INSERT INTO stake_events (
        address, txid, block_height, block_time,
        reward_amount, stake_amount, stake_age, staking_probability
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 0)
      ON CONFLICT (txid) DO NOTHING
    `;

    await this.db.query(query, [
      event.address,
      event.txid,
      event.blockHeight,
      event.blockTime,
      event.rewardAmount,
      event.stakeAmount,
      event.stakeAge,
    ]);
  }

  /**
   * Store block analytics
   */
  private async storeBlockAnalytics(block: any): Promise<void> {
    const isPoS =
      block.blocktype === 'minted' || block.stakeRewardInfo?.isStakeReward;

    const query = `
      INSERT INTO block_analytics (
        height, block_hash, block_time, block_type,
        difficulty, size, tx_count, reward_amount
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (height) DO NOTHING
    `;

    await this.db.query(query, [
      block.height,
      block.hash,
      new Date(block.time * 1000),
      isPoS ? 'pos' : 'pow',
      block.difficulty || 0,
      block.size || 0,
      block.tx?.length || 0,
      Math.floor((block.stakeRewardInfo?.rewardAmount || 0) * 100000000),
    ]);
  }

  /**
   * Calculate statistics for all addresses
   */
  private async calculateAllStatistics(addresses: string[]): Promise<void> {
    console.log(
      `[Statistics] Calculating stats for ${addresses.length} addresses...`
    );

    const { ComprehensiveStatisticsCalculator } = await import(
      './comprehensive-statistics-calculator'
    );
    const calculator = new ComprehensiveStatisticsCalculator(this.db);

    let processed = 0;
    for (const address of addresses) {
      try {
        await calculator.calculateStatsForAddress(address);
        processed++;

        if (processed % 100 === 0) {
          console.log(
            `[Statistics] Calculated stats for ${processed}/${addresses.length} addresses`
          );
        }
      } catch (error) {
        // Skip addresses with no stake events
      }
    }

    // Calculate network rankings
    await calculator.calculateNetworkRankings();

    console.log(`[Statistics] Complete! Processed ${processed} addresses`);
  }

  /**
   * Utility: Sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Stop the scan
   */
  stopScan(): void {
    this.isRunning = false;
  }

  /**
   * Get progress
   */
  getProgress(): ScanProgress {
    return { ...this.progress };
  }

  /**
   * Check if running
   */
  isScanning(): boolean {
    return this.isRunning;
  }
}
