/**
 * Verus RPC Client with Fallback API Sources
 * Provides high availability by falling back to public APIs when local daemon is unavailable
 * Based on VerusPay dual-mode pattern from official Verus GitHub
 *
 * Primary: Local Verus daemon (best security, real-time data)
 * Fallback: Public explorer APIs (high availability, shared hosting compatible)
 */

import { verusAPI } from './rpc-client-robust';
import { logger } from './utils/logger';

export interface FallbackAPI {
  name: string;
  baseUrl: string;
  enabled: boolean;
  priority: number;
}

export class VerusClientWithFallback {
  private fallbackAPIs: FallbackAPI[] = [
    {
      name: 'Verus Explorer',
      baseUrl:
        process.env.FALLBACK_API_1 || 'https://explorer.veruscoin.io/api',
      enabled: true,
      priority: 1,
    },
    {
      name: 'Verus Services',
      baseUrl: process.env.FALLBACK_API_2 || 'https://api.verus.services',
      enabled: true,
      priority: 2,
    },
    // Add more fallback APIs as needed
  ];

  private useFallback: boolean = false;
  private lastDaemonCheck: number = 0;
  private daemonCheckInterval: number = 60000; // Check daemon every 60s

  constructor() {
    // Filter out disabled APIs
    this.fallbackAPIs = this.fallbackAPIs.filter(api => api.enabled);
    // Sort by priority
    this.fallbackAPIs.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Get block by hash with automatic fallback
   */
  async getBlock(hash: string, verbose: number = 2): Promise<any> {
    try {
      // Try local daemon first
      const result = await verusAPI.call('getblock', [hash, verbose]);
      this.useFallback = false;
      return result;
    } catch (error: any) {
      logger.warn(
        `⚠️  Local daemon unavailable for getBlock: ${error.message}`
      );
      logger.info('🔄 Trying fallback APIs...');

      // Try fallback APIs
      for (const api of this.fallbackAPIs) {
        try {
          const response = await fetch(`${api.baseUrl}/block/${hash}`, {
            signal: AbortSignal.timeout(10000),
          });

          if (response.ok) {
            const data = await response.json();
            logger.info(`✅ Retrieved block from fallback: ${api.name}`);
            this.useFallback = true;
            return data;
          }
        } catch (fallbackError: any) {
          logger.warn(
            `⚠️  Fallback ${api.name} failed: ${fallbackError.message}`
          );
          continue;
        }
      }

      // All sources failed
      throw new Error(
        'All API sources unavailable (local daemon + fallback APIs)'
      );
    }
  }

  /**
   * Get transaction by txid with automatic fallback
   */
  async getTransaction(txid: string, verbose: boolean = true): Promise<any> {
    try {
      // Try local daemon first
      const result = await verusAPI.call('getrawtransaction', [
        txid,
        verbose ? 1 : 0,
      ]);
      this.useFallback = false;
      return result;
    } catch (error: any) {
      logger.warn(
        `⚠️  Local daemon unavailable for getTransaction: ${error.message}`
      );
      logger.info('🔄 Trying fallback APIs...');

      // Try fallback APIs
      for (const api of this.fallbackAPIs) {
        try {
          const response = await fetch(`${api.baseUrl}/tx/${txid}`, {
            signal: AbortSignal.timeout(10000),
          });

          if (response.ok) {
            const data = await response.json();
            logger.info(`✅ Retrieved transaction from fallback: ${api.name}`);
            this.useFallback = true;
            return data;
          }
        } catch (fallbackError: any) {
          logger.warn(
            `⚠️  Fallback ${api.name} failed: ${fallbackError.message}`
          );
          continue;
        }
      }

      // All sources failed
      throw new Error(
        'All API sources unavailable (local daemon + fallback APIs)'
      );
    }
  }

  /**
   * Get blockchain info with automatic fallback
   */
  async getBlockchainInfo(): Promise<any> {
    try {
      // Try local daemon first
      const result = await verusAPI.call('getblockchaininfo');
      this.useFallback = false;
      return result;
    } catch (error: any) {
      logger.warn(
        `⚠️  Local daemon unavailable for getBlockchainInfo: ${error.message}`
      );
      logger.info('🔄 Trying fallback APIs...');

      // Try fallback APIs
      for (const api of this.fallbackAPIs) {
        try {
          const response = await fetch(`${api.baseUrl}/status`, {
            signal: AbortSignal.timeout(10000),
          });

          if (response.ok) {
            const data = await response.json();
            logger.info(
              `✅ Retrieved blockchain info from fallback: ${api.name}`
            );
            this.useFallback = true;

            // Transform to match getblockchaininfo format if needed
            return this.transformBlockchainInfo(data);
          }
        } catch (fallbackError: any) {
          logger.warn(
            `⚠️  Fallback ${api.name} failed: ${fallbackError.message}`
          );
          continue;
        }
      }

      // All sources failed
      throw new Error(
        'All API sources unavailable (local daemon + fallback APIs)'
      );
    }
  }

  /**
   * Get address balance with automatic fallback
   */
  async getAddressBalance(address: string): Promise<any> {
    try {
      // Try local daemon first
      const result = await verusAPI.call('getaddressbalance', [
        { addresses: [address] },
      ]);
      this.useFallback = false;
      return result;
    } catch (error: any) {
      logger.warn(
        `⚠️  Local daemon unavailable for getAddressBalance: ${error.message}`
      );
      logger.info('🔄 Trying fallback APIs...');

      // Try fallback APIs
      for (const api of this.fallbackAPIs) {
        try {
          const response = await fetch(`${api.baseUrl}/addr/${address}/balance`, {
            signal: AbortSignal.timeout(10000),
          });

          if (response.ok) {
            const data = await response.json();
            logger.info(
              `✅ Retrieved address balance from fallback: ${api.name}`
            );
            this.useFallback = true;
            return data;
          }
        } catch (fallbackError: any) {
          logger.warn(
            `⚠️  Fallback ${api.name} failed: ${fallbackError.message}`
          );
          continue;
        }
      }

      // All sources failed
      throw new Error(
        'All API sources unavailable (local daemon + fallback APIs)'
      );
    }
  }

  /**
   * Transform external API response to match Verus RPC format
   */
  private transformBlockchainInfo(data: any): any {
    // If data is already in correct format, return as-is
    if (data.chain && data.blocks && data.bestblockhash) {
      return data;
    }

    // Transform external format to RPC format
    return {
      chain: data.network || data.chain || 'main',
      blocks: data.height || data.blocks || 0,
      headers: data.height || data.blocks || 0,
      bestblockhash: data.bestBlockHash || data.bestblockhash || '',
      difficulty: data.difficulty || 0,
      verificationprogress: 1.0,
      chainwork: data.chainwork || '',
      // Add other fields as needed
    };
  }

  /**
   * Health check for all data sources
   */
  async healthCheck(): Promise<{
    localDaemon: { available: boolean; responseTime?: number; error?: string };
    fallbackAPIs: Array<{
      name: string;
      url: string;
      available: boolean;
      responseTime?: number;
      error?: string;
    }>;
    recommendation: string;
  }> {
    const results: any = {
      localDaemon: { available: false },
      fallbackAPIs: [],
      recommendation: '',
    };

    // Check local daemon
    try {
      const start = Date.now();
      await verusAPI.call('getblockchaininfo');
      const responseTime = Date.now() - start;
      results.localDaemon = {
        available: true,
        responseTime,
      };
    } catch (error: any) {
      results.localDaemon = {
        available: false,
        error: error.message,
      };
    }

    // Check fallback APIs
    for (const api of this.fallbackAPIs) {
      try {
        const start = Date.now();
        const response = await fetch(`${api.baseUrl}/status`, {
          signal: AbortSignal.timeout(5000),
        });
        const responseTime = Date.now() - start;

        results.fallbackAPIs.push({
          name: api.name,
          url: api.baseUrl,
          available: response.ok,
          responseTime,
        });
      } catch (error: any) {
        results.fallbackAPIs.push({
          name: api.name,
          url: api.baseUrl,
          available: false,
          error: error.message,
        });
      }
    }

    // Determine recommendation
    if (results.localDaemon.available) {
      results.recommendation = 'Local daemon is available and will be used (best option)';
    } else {
      const availableFallbacks = results.fallbackAPIs.filter(
        (api: any) => api.available
      );
      if (availableFallbacks.length > 0) {
        results.recommendation = `Local daemon unavailable. Using fallback APIs (${availableFallbacks.length} available)`;
      } else {
        results.recommendation =
          'All data sources unavailable. Please check daemon and network connectivity.';
      }
    }

    return results;
  }

  /**
   * Check if currently using fallback
   */
  isUsingFallback(): boolean {
    return this.useFallback;
  }

  /**
   * Force enable/disable fallback mode
   */
  setFallbackMode(enabled: boolean) {
    this.useFallback = enabled;
    logger.info(`🔄 Fallback mode ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get list of configured fallback APIs
   */
  getFallbackAPIs(): FallbackAPI[] {
    return [...this.fallbackAPIs];
  }

  /**
   * Add a fallback API
   */
  addFallbackAPI(api: FallbackAPI) {
    this.fallbackAPIs.push(api);
    this.fallbackAPIs.sort((a, b) => a.priority - b.priority);
    logger.info(`✅ Added fallback API: ${api.name}`);
  }

  /**
   * Remove a fallback API
   */
  removeFallbackAPI(name: string) {
    this.fallbackAPIs = this.fallbackAPIs.filter(api => api.name !== name);
    logger.info(`🗑️  Removed fallback API: ${name}`);
  }
}

// Singleton instance
export const verusClientWithFallback = new VerusClientWithFallback();



