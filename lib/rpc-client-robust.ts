import { logger } from './utils/logger';
import { enhancedLogger } from './utils/enhanced-logger';
import { RPCErrorHandler } from './utils/rpc-error-handler';
import { ListIdentitiesParams } from './types/verus-rpc-types';

interface RPCResponse {
  result?: any;
  error?: {
    code: number;
    message: string;
  };
}

class VerusAPIClient {
  private baseUrl: string;
  private timeout: number;
  private rateLimiter: Map<string, number> = new Map();

  constructor() {
    this.baseUrl = process.env.VERUS_RPC_HOST || 'http://127.0.0.1:18843';
    this.timeout = parseInt(process.env.VERUS_RPC_TIMEOUT || '15000'); // 15 seconds default
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Combine an external signal with an internal timeout; returns undefined if neither provided
  private composeAbortSignal(
    external?: AbortSignal,
    timeoutMs?: number
  ): AbortSignal | undefined {
    const hasExternal = !!external;
    const hasTimeout = typeof timeoutMs === 'number' && timeoutMs > 0;
    if (!hasExternal && !hasTimeout) return undefined;

    // If only timeout
    if (!hasExternal && hasTimeout) return AbortSignal.timeout(timeoutMs!);
    // If only external
    if (hasExternal && !hasTimeout) return external;

    // Both provided: create a controller that aborts on either
    const controller = new AbortController();
    const onAbort = () => {
      try {
        controller.abort();
      } catch {}
    };
    // Attach listener to external signal
    external!.addEventListener('abort', onAbort, { once: true });
    const timer = setTimeout(onAbort, timeoutMs);

    // Log when the composed signal aborts and indicate whether the external
    // signal was the cause (best-effort check) — this helps trace client-driven
    // cancellations versus internal timeouts.
    controller.signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        try {
          external!.removeEventListener('abort', onAbort);
        } catch {}
        try {
          const externalAborted = !!external && external.aborted;
          logger.warn(
            `🔚 RPC composed signal aborted (externalAborted=${externalAborted}, timeoutMs=${timeoutMs})`
          );
        } catch (e) {
          // swallow logging errors
        }
      },
      { once: true }
    );

    logger.info(
      `🧭 Composed abort signal (external=${!!external}, timeoutMs=${timeoutMs})`
    );

    return controller.signal;
  }

  private async callWithRetry(
    method: string,
    params: any[] = [],
    maxRetries: number = 3,
    signal?: AbortSignal
  ): Promise<any> {
    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Rate limiting per method
        const now = Date.now();
        const lastCall = this.rateLimiter.get(method) || 0;
        const timeSinceLastCall = now - lastCall;

        // Minimum 100ms between calls for the same method
        if (timeSinceLastCall < 100) {
          await this.sleep(100 - timeSinceLastCall);
        }

        this.rateLimiter.set(method, Date.now());

        // Validate parameters before making the call
        if (!RPCErrorHandler.validateRPCParams(method, params)) {
          const fallback = RPCErrorHandler.createFallbackResponse(method);
          logger.warn(`🚫 Invalid parameters for ${method}, using fallback`);
          return fallback;
        }

        const timerId = `${method}-${Date.now()}`;
        enhancedLogger.startTimer(timerId);

        if (attempt > 0) {
          enhancedLogger.rpcCall(method, 'retry', undefined, {
            attempt,
            maxRetries,
            params,
          });
        } else {
          enhancedLogger.rpcCall(method, 'success', undefined, { params });
        }

        const response = await fetch(`${this.baseUrl}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization:
              'Basic ' +
              Buffer.from(
                `${process.env.VERUS_RPC_USER || 'verus'}:${process.env.VERUS_RPC_PASSWORD || 'verus'}`
              ).toString('base64'),
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: Date.now(),
            method,
            params,
          }),
          signal: this.composeAbortSignal(signal, this.timeout),
        });

        if (!response.ok) {
          // Handle rate limiting specifically
          if (response.status === 429) {
            const retryAfter =
              parseInt(response.headers.get('Retry-After') || '1') * 1000;
            logger.warn(
              `⏳ Rate limited for ${method}, waiting ${retryAfter}ms`
            );
            await this.sleep(retryAfter);
            continue;
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: RPCResponse = await response.json();

        if (data.error) {
          const error = new Error(
            `RPC Error: ${data.error.message} (Code: ${data.error.code})`
          );
          (error as any).code = data.error.code;
          throw error;
        }

        const duration = enhancedLogger.endTimer(timerId);
        enhancedLogger.rpcCall(method, 'success', duration);
        return data.result;
      } catch (error: any) {
        lastError = error;

        // Detect aborts specifically and log for observability
        try {
          const isAbort =
            error &&
            (error.name === 'AbortError' ||
              /aborted/i.test(error.message || ''));
          if (isAbort) {
            logger.warn(`✋ RPC Call aborted: ${method} (attempt ${attempt})`);
            // For aborts we generally don't want to retry
            break;
          }
        } catch (e) {
          // ignore logging failures
        }

        // Don't retry for certain types of RPC errors
        if (error.code === -32601 || error.code === -32602) {
          // Method not found or invalid params
          break;
        }

        if (attempt < maxRetries) {
          // Exponential backoff: 1s, 2s, 4s
          const backoffMs = Math.pow(2, attempt) * 1000;
          logger.warn(
            `⚠️ RPC Error for ${method}, retrying in ${backoffMs}ms:`,
            error.message
          );
          await this.sleep(backoffMs);
        }
      }
    }

    // Use the error handler to provide fallback responses
    return RPCErrorHandler.handleRPCError(
      method,
      lastError,
      RPCErrorHandler.createFallbackResponse(method)
    );
  }

  async call(
    method: string,
    params: any[] = [],
    signal?: AbortSignal
  ): Promise<any> {
    return this.callWithRetry(method, params, 3, signal);
  }

  /**
   * Batch RPC calls - single HTTP request for multiple RPC methods
   * Returns array of {result, error} objects for graceful error handling per call
   * Based on Verus-Desktop pattern for optimal performance
   */
  async batch<T = any>(
    calls: Array<{ method: string; params?: any[] }>,
    signal?: AbortSignal
  ): Promise<Array<{ result?: T; error?: { code: number; message: string } }>> {
    try {
      logger.info(`🔍 Batch RPC Call: ${calls.length} requests`, {
        methods: calls.map(c => c.method),
      });

      // Rate limiting for batch calls
      const now = Date.now();
      const lastCall = this.rateLimiter.get('batch') || 0;
      const timeSinceLastCall = now - lastCall;

      if (timeSinceLastCall < 100) {
        await this.sleep(100 - timeSinceLastCall);
      }

      this.rateLimiter.set('batch', Date.now());

      const response = await fetch(`${this.baseUrl}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization:
            'Basic ' +
            Buffer.from(
              `${process.env.VERUS_RPC_USER || 'verus'}:${process.env.VERUS_RPC_PASSWORD || 'verus'}`
            ).toString('base64'),
        },
        body: JSON.stringify(
          calls.map((call, index) => ({
            jsonrpc: '2.0',
            id: Date.now() + index,
            method: call.method,
            params: call.params || [],
          }))
        ),
        signal: this.composeAbortSignal(signal, this.timeout),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: RPCResponse[] = await response.json();

      const successCount = data.filter(item => !item.error).length;
      const errorCount = data.filter(item => item.error).length;

      logger.info(
        `✅ Batch RPC Complete: ${successCount} success, ${errorCount} errors`
      );

      return data.map(item => ({
        result: item.result,
        error: item.error,
      }));
    } catch (error: any) {
      logger.error(`❌ Batch RPC Error:`, error);
      // Return error for all calls
      return calls.map(() => ({
        error: {
          code: -1,
          message: error.message || 'Batch RPC failed',
        },
      }));
    }
  }

  // Convenience methods for common RPC calls
  async getBlockchainInfo(signal?: AbortSignal) {
    return this.call('getblockchaininfo', [], signal);
  }

  async getMiningInfo(signal?: AbortSignal) {
    return this.call('getmininginfo', [], signal);
  }

  async getMempoolInfo(signal?: AbortSignal) {
    return this.call('getmempoolinfo', [], signal);
  }

  // @deprecated Use getWalletInfo() instead - getstakinginfo is deprecated in Verus
  async getStakingInfo(signal?: AbortSignal) {
    logger.warn(
      '⚠️  getStakingInfo() is deprecated. Use getWalletInfo() instead.'
    );
    return this.call('getstakinginfo', [], signal);
  }

  async getWalletInfo(signal?: AbortSignal) {
    return this.call('getwalletinfo', [], signal);
  }

  async getNetworkInfo(signal?: AbortSignal) {
    return this.call('getnetworkinfo', [], signal);
  }

  async getAddressBalance(address: string, signal?: AbortSignal) {
    return this.call('getaddressbalance', [{ addresses: [address] }], signal);
  }

  async getAddressTxids(address: string, signal?: AbortSignal) {
    return this.call('getaddresstxids', [{ addresses: [address] }], signal);
  }

  async getRawTransaction(
    txid: string,
    verbose: boolean = true,
    signal?: AbortSignal
  ) {
    return this.call('getrawtransaction', [txid, verbose ? 1 : 0], signal);
  }

  async getBlock(
    hash: string,
    verbose: number | boolean = true,
    signal?: AbortSignal
  ) {
    // Support both boolean and numeric verbosity levels
    const verbosity =
      typeof verbose === 'boolean' ? (verbose ? 1 : 0) : verbose;
    return this.call('getblock', [hash, verbosity], signal);
  }

  async getBlockHash(height: number, signal?: AbortSignal) {
    return this.call('getblockhash', [height], signal);
  }

  async getBestBlockHash(signal?: AbortSignal) {
    return this.call('getbestblockhash', [], signal);
  }

  async getBlockCount(signal?: AbortSignal) {
    return this.call('getblockcount', [], signal);
  }

  async getRawMempool(verbose: boolean = false, signal?: AbortSignal) {
    return this.call('getrawmempool', [verbose], signal);
  }

  async getIdentity(name: string, signal?: AbortSignal) {
    return this.call('getidentity', [name], signal);
  }

  async getAddressUTXOs(address: string, signal?: AbortSignal) {
    return this.call('getaddressutxos', [{ addresses: [address] }], signal);
  }

  // Verus-specific methods (updated for latest API)
  async listIdentities(params?: ListIdentitiesParams, signal?: AbortSignal) {
    if (!params) {
      return this.call('listidentities', [], signal);
    }
    const defaultParams = {
      start: 0,
      count: 10,
      txproof: false,
    };
    const finalParams = { ...defaultParams, ...params };
    return this.call(
      'listidentities',
      [
        finalParams.start,
        finalParams.count,
        finalParams.systemid,
        finalParams.parent,
        finalParams.timelockfrom,
        finalParams.timelockto,
        finalParams.fromheight,
        finalParams.toheight,
        finalParams.txproof,
      ],
      signal
    );
  }

  async listCurrencies(signal?: AbortSignal) {
    return this.call('listcurrencies', [], signal);
  }

  async listCurrenciesWithFilter(filter: any, signal?: AbortSignal) {
    return this.call('listcurrencies', [filter], signal);
  }

  async getCurrency(currencyId?: string, signal?: AbortSignal) {
    if (currencyId && currencyId !== '*') {
      return this.call('getcurrency', [currencyId], signal);
    } else {
      // Default to VRSCTEST for test network
      return this.call('getcurrency', ['VRSCTEST'], signal);
    }
  }

  async getPBaaSChain(chainId: string = '*', signal?: AbortSignal) {
    return this.call('getpbaaschain', [chainId], signal);
  }

  async getAddressDeltas(address: string, signal?: AbortSignal) {
    return this.call('getaddressdeltas', [{ addresses: [address] }], signal);
  }

  async getAddressMempool(address: string, signal?: AbortSignal) {
    return this.call('getaddressmempool', [{ addresses: [address] }], signal);
  }

  async getAddressTransaction(
    address: string,
    txid: string,
    signal?: AbortSignal
  ) {
    return this.call(
      'getaddresstransaction',
      [{ addresses: [address], txid }],
      signal
    );
  }

  async getNotarizationCount(chainId: string, signal?: AbortSignal) {
    return this.call('getnotarizationcount', [chainId], signal);
  }

  async getInfo(signal?: AbortSignal) {
    return this.call('getinfo', [], signal);
  }

  async getPeerInfo(signal?: AbortSignal) {
    return this.call('getpeerinfo', [], signal);
  }

  async getTxOutProof(txids: string[], signal?: AbortSignal) {
    return this.call('gettxoutproof', [txids], signal);
  }

  async verifyTxOutProof(proof: string, signal?: AbortSignal) {
    return this.call('verifytxoutproof', [proof], signal);
  }

  // New Verus API methods (v1.2.10+)
  async getBlockTemplate(templateRequest: any = {}, signal?: AbortSignal) {
    return this.call('getblocktemplate', [templateRequest], signal);
  }

  // Verus-specific PBaaS methods
  async getCurrencyState(currencyName?: string, signal?: AbortSignal) {
    if (currencyName) {
      return this.call('getcurrency', [currencyName], signal);
    } else {
      // Default to VRSCTEST for test network
      return this.call('getcurrency', ['VRSCTEST'], signal);
    }
  }

  async getIdentityState(identityName: string, signal?: AbortSignal) {
    return this.call('getidentity', [identityName], signal);
  }

  async getNotarizationData(signal?: AbortSignal) {
    return this.call('getnotarizationdata', [], signal);
  }

  // Enhanced security methods
  async validateAddress(address: string, signal?: AbortSignal) {
    return this.call('validateaddress', [address], signal);
  }

  // Performance monitoring

  // Note: getmempoolentry method doesn't exist in this version of Verus
  // Use getrawmempool with verbose=true instead

  async getChainTxStats(
    nblocks?: number,
    blockhash?: string,
    signal?: AbortSignal
  ) {
    const params: any[] = [];
    if (nblocks !== undefined) params.push(nblocks);
    if (blockhash !== undefined) params.push(blockhash);
    return this.call('getchaintxstats', params, signal);
  }

  async getTxOut(
    txid: string,
    n: number,
    includeMempool: boolean = true,
    signal?: AbortSignal
  ) {
    return this.call('gettxout', [txid, n, includeMempool], signal);
  }

  async getTxOutSetInfo(signal?: AbortSignal) {
    return this.call('gettxoutsetinfo', [], signal);
  }

  async getDifficulty(signal?: AbortSignal) {
    return this.call('getdifficulty', [], signal);
  }

  async getConnectionCount(signal?: AbortSignal) {
    return this.call('getconnectioncount', [], signal);
  }

  async getNetTotals(signal?: AbortSignal) {
    return this.call('getnettotals', [], signal);
  }

  async getNetworkHashPS(
    nblocks: number = 120,
    height: number = -1,
    signal?: AbortSignal
  ) {
    return this.call('getnetworkhashps', [nblocks, height], signal);
  }

  async getMempoolAncestors(
    txid: string,
    verbose: boolean = false,
    signal?: AbortSignal
  ) {
    return this.call('getmempoolancestors', [txid, verbose], signal);
  }

  async getMempoolDescendants(
    txid: string,
    verbose: boolean = false,
    signal?: AbortSignal
  ) {
    return this.call('getmempooldescendants', [txid, verbose], signal);
  }

  // Enhanced Verus-specific methods
  async getIdentityHistory(
    name: string,
    startHeight?: number,
    endHeight?: number,
    signal?: AbortSignal
  ) {
    const params: any[] = [name];
    if (startHeight !== undefined) params.push(startHeight);
    if (endHeight !== undefined) params.push(endHeight);
    return this.call('getidentityhistory', params, signal);
  }

  async getCurrencyDefinition(currencyId: string, signal?: AbortSignal) {
    return this.call('getcurrencydefinition', [currencyId], signal);
  }

  async getCurrencyConverters(currencyId: string, signal?: AbortSignal) {
    return this.call('getcurrencyconverters', [currencyId], signal);
  }

  async getCurrencyReserves(currencyId: string, signal?: AbortSignal) {
    return this.call('getcurrencyreserves', [currencyId], signal);
  }

  async getCurrencySupply(currencyId: string, signal?: AbortSignal) {
    return this.call('getcurrencysupply', [currencyId], signal);
  }

  // Additional Verus-specific methods for enhanced functionality
  async getNotarizationDataByHeight(height: number, signal?: AbortSignal) {
    return this.call('getnotarizationdatabyheight', [height], signal);
  }

  async getNotarizationDataByHash(hash: string, signal?: AbortSignal) {
    return this.call('getnotarizationdatabyhash', [hash], signal);
  }

  async getNotarizationDataByIndex(index: number, signal?: AbortSignal) {
    return this.call('getnotarizationdatabyindex', [index], signal);
  }

  async getNotarizationDataByTime(timestamp: number, signal?: AbortSignal) {
    return this.call('getnotarizationdatabytime', [timestamp], signal);
  }

  async getNotarizationDataByBlock(blockHash: string, signal?: AbortSignal) {
    return this.call('getnotarizationdatabyblock', [blockHash], signal);
  }

  async getNotarizationDataByTx(txid: string, signal?: AbortSignal) {
    return this.call('getnotarizationdatabytx', [txid], signal);
  }

  async getNotarizationDataByAddress(address: string, signal?: AbortSignal) {
    return this.call('getnotarizationdatabyaddress', [address], signal);
  }

  async getNotarizationDataByCurrency(
    currencyId: string,
    signal?: AbortSignal
  ) {
    return this.call('getnotarizationdatabycurrency', [currencyId], signal);
  }

  async getNotarizationDataByChain(chainId: string, signal?: AbortSignal) {
    return this.call('getnotarizationdatabychain', [chainId], signal);
  }

  async getNotarizationDataByPBaaS(pbaasId: string, signal?: AbortSignal) {
    return this.call('getnotarizationdatabypbaas', [pbaasId], signal);
  }
}

export const verusAPI = new VerusAPIClient();
