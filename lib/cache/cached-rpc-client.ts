import { verusAPI } from '@/lib/rpc-client-robust';
import { CacheManager, CACHE_KEYS, CACHE_TTL } from './cache-utils';
import { logger } from '@/lib/utils/logger';

/**
 * Cached RPC client that wraps the original verusAPI with caching
 */
export class CachedRPCClient {
  /**
   * Get blockchain info with caching
   */
  static async getBlockchainInfo() {
    const cached = await CacheManager.get('blockchain:info');
    if (cached !== null) {
      return cached;
    }
    return await this._fetchAndCache(
      'blockchain:info',
      CACHE_TTL.BLOCKCHAIN_INFO,
      () => verusAPI.getBlockchainInfo()
    );
  }

  /**
   * Get mining info with caching
   */
  static async getMiningInfo() {
    const cached = await CacheManager.get('mining:info');
    if (cached !== null) {
      return cached;
    }
    return await this._fetchAndCache('mining:info', CACHE_TTL.MINING_INFO, () =>
      verusAPI.getMiningInfo()
    );
  }

  /**
   * Get network info with caching
   */
  static async getNetworkInfo() {
    const cached = await CacheManager.get('network:info');
    if (cached !== null) {
      return cached;
    }
    return await this._fetchAndCache(
      'network:info',
      CACHE_TTL.NETWORK_INFO,
      () => verusAPI.getNetworkInfo()
    );
  }

  /**
   * Get block data with caching
   */
  static async getBlock(hash: string, verbose: number | boolean = true) {
    const cacheKey = CACHE_KEYS.blockData(hash);
    return (
      CacheManager.get(cacheKey) ||
      (await this._fetchAndCache(cacheKey, CACHE_TTL.BLOCK_DATA, () =>
        verusAPI.getBlock(hash, verbose)
      ))
    );
  }

  /**
   * Get block hash by height with caching
   */
  static async getBlockHash(height: number) {
    const cacheKey = `block:hash:${height}`;
    return (
      CacheManager.get(cacheKey) ||
      (await this._fetchAndCache(cacheKey, CACHE_TTL.BLOCK_DATA, () =>
        verusAPI.getBlockHash(height)
      ))
    );
  }

  /**
   * Get transaction data with caching
   */
  static async getRawTransaction(txid: string, verbose: boolean = true) {
    const cacheKey = CACHE_KEYS.transactionData(txid);
    return (
      CacheManager.get(cacheKey) ||
      (await this._fetchAndCache(cacheKey, CACHE_TTL.TRANSACTION_DATA, () =>
        verusAPI.getRawTransaction(txid, verbose)
      ))
    );
  }

  /**
   * Get address balance with caching
   */
  static async getAddressBalance(address: string) {
    const cacheKey = CACHE_KEYS.addressBalance(address);
    return (
      CacheManager.get(cacheKey) ||
      (await this._fetchAndCache(cacheKey, CACHE_TTL.ADDRESS_BALANCE, () =>
        verusAPI.getAddressBalance(address)
      ))
    );
  }

  /**
   * Get address transactions with caching
   */
  static async getAddressTxids(address: string) {
    const cacheKey = `address:${address}:txids`;
    return (
      CacheManager.get(cacheKey) ||
      (await this._fetchAndCache(cacheKey, CACHE_TTL.ADDRESS_TRANSACTIONS, () =>
        verusAPI.getAddressTxids(address)
      ))
    );
  }

  /**
   * Get address UTXOs with caching
   */
  static async getAddressUTXOs(address: string) {
    const cacheKey = CACHE_KEYS.addressUtxos(address);
    return (
      CacheManager.get(cacheKey) ||
      (await this._fetchAndCache(cacheKey, CACHE_TTL.ADDRESS_UTXOS, () =>
        verusAPI.getAddressUTXOs(address)
      ))
    );
  }

  /**
   * Get mempool info with caching
   */
  static async getMempoolInfo() {
    return (
      CacheManager.get('mempool:info') ||
      (await this._fetchAndCache('mempool:info', CACHE_TTL.MEMPOOL_INFO, () =>
        verusAPI.getMempoolInfo()
      ))
    );
  }

  /**
   * Get raw mempool with caching
   */
  static async getRawMempool(verbose: boolean = false) {
    const cacheKey = CACHE_KEYS.mempoolTransactions();
    return (
      CacheManager.get(cacheKey) ||
      (await this._fetchAndCache(cacheKey, CACHE_TTL.MEMPOOL_TRANSACTIONS, () =>
        verusAPI.getRawMempool(verbose)
      ))
    );
  }

  /**
   * Get VerusID with caching
   */
  static async getIdentity(identity: string) {
    const cacheKey = CACHE_KEYS.verusId(identity);
    return (
      CacheManager.get(cacheKey) ||
      (await this._fetchAndCache(cacheKey, CACHE_TTL.VERUS_ID, () =>
        verusAPI.getIdentity(identity)
      ))
    );
  }

  /**
   * Get identity history with caching
   */
  static async getIdentityHistory(
    identity: string,
    startHeight?: number,
    endHeight?: number
  ) {
    const cacheKey = `verusid:${identity}:history:${startHeight || 0}:${endHeight || 0}`;
    return (
      CacheManager.get(cacheKey) ||
      (await this._fetchAndCache(cacheKey, CACHE_TTL.VERUS_ID, () =>
        verusAPI.getIdentityHistory(identity, startHeight, endHeight)
      ))
    );
  }

  /**
   * List identities with caching
   */
  static async listIdentities() {
    const cacheKey = CACHE_KEYS.verusIdList();
    return (
      CacheManager.get(cacheKey) ||
      (await this._fetchAndCache(cacheKey, CACHE_TTL.VERUS_ID_LIST, () =>
        verusAPI.listIdentities()
      ))
    );
  }

  /**
   * Get currency data with caching
   */
  static async getCurrency(currencyId?: string) {
    const cacheKey = CACHE_KEYS.currencyData(currencyId || 'default');
    return (
      CacheManager.get(cacheKey) ||
      (await this._fetchAndCache(cacheKey, CACHE_TTL.CURRENCY_DATA, () =>
        verusAPI.getCurrency(currencyId)
      ))
    );
  }

  /**
   * List currencies with caching
   */
  static async listCurrencies() {
    const cacheKey = CACHE_KEYS.currencyList();
    return (
      CacheManager.get(cacheKey) ||
      (await this._fetchAndCache(cacheKey, CACHE_TTL.CURRENCY_DATA, () =>
        verusAPI.listCurrencies()
      ))
    );
  }

  /**
   * Generic method to fetch data and cache it
   */
  private static async _fetchAndCache<T>(
    cacheKey: string,
    ttl: number,
    fetchFn: () => Promise<T>
  ): Promise<T> {
    try {
      logger.debug(`🔄 Fetching fresh data for: ${cacheKey}`);
      const data = await fetchFn();

      // Cache the result
      await CacheManager.set(cacheKey, data, ttl);
      logger.debug(`💾 Cached data for: ${cacheKey} (TTL: ${ttl}s)`);

      return data;
    } catch (error) {
      logger.error(`❌ Error fetching data for ${cacheKey}:`, error);
      throw error;
    }
  }

  /**
   * Invalidate cache for specific data types
   */
  static async invalidateCache(
    type: 'blockchain' | 'block' | 'transaction' | 'address' | 'verusid',
    identifier?: string
  ) {
    switch (type) {
      case 'blockchain':
        await CacheManager.deletePattern('blockchain:*');
        await CacheManager.deletePattern('mining:*');
        await CacheManager.deletePattern('network:*');
        await CacheManager.deletePattern('mempool:*');
        break;

      case 'block':
        if (identifier) {
          await CacheManager.delete(CACHE_KEYS.blockData(identifier));
        }
        await CacheManager.deletePattern('blocks:*');
        break;

      case 'transaction':
        if (identifier) {
          await CacheManager.delete(CACHE_KEYS.transactionData(identifier));
        }
        await CacheManager.deletePattern('transactions:*');
        break;

      case 'address':
        if (identifier) {
          await CacheManager.deletePattern(`address:${identifier}:*`);
        }
        break;

      case 'verusid':
        if (identifier) {
          await CacheManager.delete(CACHE_KEYS.verusId(identifier));
        }
        await CacheManager.delete(CACHE_KEYS.verusIdList());
        break;
    }
  }

  /**
   * Get cache statistics
   */
  static async getCacheStats() {
    return await CacheManager.getStats();
  }

  /**
   * Clear all cache
   */
  static async clearAllCache() {
    return await CacheManager.clearAll();
  }
}

// Export cached client as default
export default CachedRPCClient;
