import { logger } from './utils/logger';
import { RateLimiter, defaultRateLimiter } from './utils/rate-limiter';
import {
  type RPCResponse,
  type RPCError,
  type RPCMethod,
  type RPCCall,
  type RPCBatchCall,
  type BlockchainInfo,
  type BlockInfo,
  type BlockHeader,
  type MempoolInfo,
  type TxOutInfo,
  type TxOutSetInfo,
  type RawTransaction,
  type CreateRawTransactionParams,
  type SignedRawTransaction,
  type MiningInfo,
  type BlockTemplate,
  type WalletInfo,
  AddressInfo,
  type TransactionInfo,
  type UnspentOutput,
  type NetworkInfo,
  type PeerInfo,
  type NetTotals,
  type VerusIdentity,
  type IdentityHistory,
  type IdentityContent,
  type IdentityTrust,
  type VerusCurrency,
  type CurrencyState,
  type CurrencyTrust,
  type ConversionEstimate,
  type VerusOffer,
  // NotarizationData, // Unused
  // LaunchInfo, // Unused
  // ProofRoot, // Unused
  type GetBlockParams,
  type GetBlockHeaderParams,
  type GetRawTransactionParams,
  type SendRawTransactionParams,
  type SignRawTransactionParams,
  type GetIdentityParams,
  type GetCurrencyParams,
  type ListIdentitiesParams,
  type ListCurrenciesParams,
  type RateLimitConfig,
  type ChainTip,
} from './types/verus-rpc-types';

class RPCClient {
  private baseUrl: string;
  private timeout: number;
  private rateLimiter: RateLimiter;
  private requestId: number = 0;

  constructor(rateLimitConfig?: Partial<RateLimitConfig>) {
    this.baseUrl = process.env.VERUS_RPC_HOST || 'http://127.0.0.1:18843';
    this.timeout = 10000; // 10 seconds
    this.rateLimiter = rateLimitConfig
      ? new RateLimiter(rateLimitConfig)
      : defaultRateLimiter;

    // Note: Environment variable validation is deferred to runtime (first RPC call)
    // to allow Next.js build-time imports without requiring RPC credentials
  }

  private validateCredentials(): void {
    if (!process.env.VERUS_RPC_USER || !process.env.VERUS_RPC_PASSWORD) {
      throw new Error(
        'VERUS_RPC_USER and VERUS_RPC_PASSWORD environment variables are required'
      );
    }
  }

  /**
   * Generic RPC call method with rate limiting
   */
  async call<T = any>(method: RPCMethod, params: any[] = []): Promise<T> {
    return this.rateLimiter.execute(async () => {
      // Validate credentials before making RPC call
      this.validateCredentials();

      try {
        logger.info(`🔍 RPC Call: ${method}`, { params });

        const response = await fetch(`${this.baseUrl}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization:
              'Basic ' +
              Buffer.from(
                `${process.env.VERUS_RPC_USER}:${process.env.VERUS_RPC_PASSWORD}`
              ).toString('base64'),
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: ++this.requestId,
            method,
            params,
          }),
          signal: AbortSignal.timeout(this.timeout),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: RPCResponse<T> = await response.json();

        if (data.error) {
          throw new Error(
            `RPC Error: ${data.error.message} (Code: ${data.error.code})`
          );
        }

        logger.info(`✅ RPC Success: ${method}`);
        return data.result;
      } catch (error: any) {
        logger.error(`❌ RPC Error: ${method}`, error);
        throw error;
      }
    });
  }

  /**
   * Batch RPC calls with rate limiting
   * Throws error if any call fails
   */
  async batchCall<T = any>(calls: RPCCall[]): Promise<T[]> {
    return this.rateLimiter.execute(async () => {
      try {
        logger.info(`🔍 Batch RPC Call: ${calls.length} methods`);

        const batchRequest: RPCBatchCall = { calls };

        const response = await fetch(`${this.baseUrl}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization:
              'Basic ' +
              Buffer.from(
                `${process.env.VERUS_RPC_USER}:${process.env.VERUS_RPC_PASSWORD}`
              ).toString('base64'),
          },
          body: JSON.stringify(
            batchRequest.calls.map(call => ({
              jsonrpc: '2.0',
              id: ++this.requestId,
              method: call.method,
              params: call.params,
            }))
          ),
          signal: AbortSignal.timeout(this.timeout),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: RPCResponse<T>[] = await response.json();

        // Check for errors in batch response
        const errors = data.filter(item => item.error);
        if (errors.length > 0) {
          throw new Error(
            `Batch RPC Errors: ${errors.map(e => e.error?.message).join(', ')}`
          );
        }

        logger.info(`✅ Batch RPC Success: ${calls.length} methods`);
        return data.map(item => item.result);
      } catch (error: any) {
        logger.error(`❌ Batch RPC Error`, error);
        throw error;
      }
    });
  }

  /**
   * Batch RPC calls that returns individual results with error handling per call
   * Returns array of {result, error} objects for each call
   * Based on Verus-Desktop pattern
   */
  async batch<T = any>(
    calls: Array<{ method: RPCMethod; params?: any[] }>
  ): Promise<Array<{ result?: T; error?: RPCError }>> {
    return this.rateLimiter.execute(async () => {
      try {
        logger.info(`🔍 Batch RPC Call: ${calls.length} requests`, {
          methods: calls.map(c => c.method),
        });

        const response = await fetch(`${this.baseUrl}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization:
              'Basic ' +
              Buffer.from(
                `${process.env.VERUS_RPC_USER}:${process.env.VERUS_RPC_PASSWORD}`
              ).toString('base64'),
          },
          body: JSON.stringify(
            calls.map((call, _index) => ({
              jsonrpc: '2.0',
              id: ++this.requestId,
              method: call.method,
              params: call.params || [],
            }))
          ),
          signal: AbortSignal.timeout(this.timeout),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: RPCResponse<T>[] = await response.json();

        const successCount = data.filter(item => !item.error).length;
        const errorCount = data.filter(item => item.error).length;

        logger.info(
          `✅ Batch RPC Complete: ${successCount} success, ${errorCount} errors`
        );

        return data.map(item => ({
          result: item.result,
          error: item.error || undefined,
        }));
      } catch (error: any) {
        logger.error(`❌ Batch RPC Error:`, error);
        throw error;
      }
    });
  }

  // ============================================================================
  // BLOCKCHAIN RPC METHODS
  // ============================================================================

  async getBestBlockHash(): Promise<string> {
    return this.call('getbestblockhash');
  }

  async getBlock(params: GetBlockParams): Promise<BlockInfo | string> {
    if ('blockhash' in params) {
      return this.call('getblock', [params.blockhash, params.verbosity || 1]);
    } else if ('height' in params) {
      return this.call('getblock', [params.height, params.verbosity || 1]);
    }
    throw new Error('Either blockhash or height must be provided');
  }

  async getBlockchainInfo(): Promise<BlockchainInfo> {
    return this.call('getblockchaininfo');
  }

  async getBlockCount(): Promise<number> {
    return this.call('getblockcount');
  }

  async getBlockHash(height: number): Promise<string> {
    return this.call('getblockhash', [height]);
  }

  async getBlockHeader(params: GetBlockHeaderParams): Promise<BlockHeader> {
    if ('blockhash' in params) {
      return this.call('getblockheader', [params.blockhash]);
    } else if ('height' in params) {
      return this.call('getblockheader', [params.height]);
    }
    throw new Error('Either blockhash or height must be provided');
  }

  async getChainTips(): Promise<ChainTip[]> {
    return this.call('getchaintips');
  }

  async getDifficulty(): Promise<number> {
    return this.call('getdifficulty');
  }

  async getMempoolInfo(): Promise<MempoolInfo> {
    return this.call('getmempoolinfo');
  }

  async getRawMempool(): Promise<string[]> {
    return this.call('getrawmempool');
  }

  async getTxOut(
    txid: string,
    n: number,
    includeMempool: boolean = true
  ): Promise<TxOutInfo | null> {
    return this.call('gettxout', [txid, n, includeMempool]);
  }

  async getTxOutSetInfo(): Promise<TxOutSetInfo> {
    return this.call('gettxoutsetinfo');
  }

  // ============================================================================
  // TRANSACTION RPC METHODS
  // ============================================================================

  async createRawTransaction(
    params: CreateRawTransactionParams
  ): Promise<string> {
    return this.call('createrawtransaction', [params.inputs, params.outputs]);
  }

  async decodeRawTransaction(hexstring: string): Promise<RawTransaction> {
    return this.call('decoderawtransaction', [hexstring]);
  }

  async decodeScript(hexstring: string): Promise<any> {
    return this.call('decodescript', [hexstring]);
  }

  async getRawTransaction(
    params: GetRawTransactionParams
  ): Promise<RawTransaction | string> {
    return this.call('getrawtransaction', [
      params.txid,
      params.verbose !== false,
      params.blockhash,
    ]);
  }

  async sendRawTransaction(params: SendRawTransactionParams): Promise<string> {
    return this.call('sendrawtransaction', [
      params.hexstring,
      params.allowhighfees || false,
    ]);
  }

  async signRawTransaction(
    params: SignRawTransactionParams
  ): Promise<SignedRawTransaction> {
    return this.call('signrawtransaction', [
      params.hexstring,
      params.prevtxs || [],
      params.privkeys || [],
      params.sighashtype || 'ALL',
    ]);
  }

  // ============================================================================
  // MINING RPC METHODS
  // ============================================================================

  async getBlockTemplate(): Promise<BlockTemplate> {
    return this.call('getblocktemplate');
  }

  async getLocalSolPs(): Promise<number> {
    return this.call('getlocalsolps');
  }

  async getMiningInfo(): Promise<MiningInfo> {
    return this.call('getmininginfo');
  }

  async getNetworkHashPs(
    blocks: number = 120,
    height: number = -1
  ): Promise<number> {
    return this.call('getnetworkhashps', [blocks, height]);
  }

  async getNetworkSolPs(
    blocks: number = 120,
    height: number = -1
  ): Promise<number> {
    return this.call('getnetworksolps', [blocks, height]);
  }

  async prioritiseTransaction(
    txid: string,
    feeDelta: number
  ): Promise<boolean> {
    return this.call('prioritisetransaction', [txid, feeDelta]);
  }

  async submitBlock(hexdata: string, parameters?: any): Promise<string | null> {
    return this.call('submitblock', [hexdata, parameters]);
  }

  // ============================================================================
  // WALLET RPC METHODS
  // ============================================================================

  async getBalance(
    dummy?: string,
    minconf?: number,
    includeWatchonly?: boolean
  ): Promise<number> {
    return this.call('getbalance', [
      dummy || '*',
      minconf || 1,
      includeWatchonly || false,
    ]);
  }

  async getNewAddress(label?: string, addressType?: string): Promise<string> {
    return this.call('getnewaddress', [label, addressType]);
  }

  async getRawChangeAddress(addressType?: string): Promise<string> {
    return this.call('getrawchangeaddress', [addressType]);
  }

  async getReceivedByAddress(
    address: string,
    minconf: number = 1
  ): Promise<number> {
    return this.call('getreceivedbyaddress', [address, minconf]);
  }

  async getTransaction(
    txid: string,
    includeWatchonly?: boolean
  ): Promise<TransactionInfo> {
    return this.call('gettransaction', [txid, includeWatchonly || false]);
  }

  async getUnconfirmedBalance(): Promise<number> {
    return this.call('getunconfirmedbalance');
  }

  async getWalletInfo(): Promise<WalletInfo> {
    return this.call('getwalletinfo');
  }

  async listTransactions(
    count?: number,
    skip?: number,
    includeWatchonly?: boolean
  ): Promise<TransactionInfo[]> {
    return this.call('listtransactions', [
      '*',
      count || 10,
      skip || 0,
      includeWatchonly || false,
    ]);
  }

  async listUnspent(
    minconf?: number,
    maxconf?: number,
    addresses?: string[],
    includeUnsafe?: boolean
  ): Promise<UnspentOutput[]> {
    return this.call('listunspent', [
      minconf || 1,
      maxconf || 9999999,
      addresses || [],
      includeUnsafe || true,
    ]);
  }

  async sendToAddress(
    address: string,
    amount: number,
    comment?: string,
    commentTo?: string,
    subtractFeeFromAmount?: boolean
  ): Promise<string> {
    return this.call('sendtoaddress', [
      address,
      amount,
      comment || '',
      commentTo || '',
      subtractFeeFromAmount || false,
    ]);
  }

  async sendMany(
    fromaccount: string,
    amounts: Record<string, number>,
    minconf?: number,
    comment?: string,
    subtractFeeFromAmounts?: string[]
  ): Promise<string> {
    return this.call('sendmany', [
      fromaccount,
      amounts,
      minconf || 1,
      comment || '',
      subtractFeeFromAmounts || [],
    ]);
  }

  // ============================================================================
  // NETWORK RPC METHODS
  // ============================================================================

  async getNetworkInfo(): Promise<NetworkInfo> {
    return this.call('getnetworkinfo');
  }

  async getConnectionCount(): Promise<number> {
    return this.call('getconnectioncount');
  }

  async getPeerInfo(): Promise<PeerInfo[]> {
    return this.call('getpeerinfo');
  }

  async getNetTotals(): Promise<NetTotals> {
    return this.call('getnettotals');
  }

  async ping(): Promise<void> {
    return this.call('ping');
  }

  // ============================================================================
  // VERUS IDENTITY RPC METHODS
  // ============================================================================

  async getIdentity(params: GetIdentityParams): Promise<VerusIdentity> {
    return this.call('getidentity', [
      params.name,
      params.height,
      params.txproof || false,
      params.identityproof || false,
    ]);
  }

  async getIdentityHistory(
    name: string,
    height?: number
  ): Promise<IdentityHistory[]> {
    return this.call('getidentityhistory', [name, height]);
  }

  async getIdentityContent(name: string): Promise<IdentityContent[]> {
    return this.call('getidentitycontent', [name]);
  }

  async listIdentities(
    params?: ListIdentitiesParams
  ): Promise<VerusIdentity[]> {
    const defaultParams = {
      start: 0,
      count: 10,
      txproof: false,
    };
    const finalParams = { ...defaultParams, ...params };
    return this.call('listidentities', [
      finalParams.start,
      finalParams.count,
      finalParams.systemid,
      finalParams.parent,
      finalParams.timelockfrom,
      finalParams.timelockto,
      finalParams.fromheight,
      finalParams.toheight,
      finalParams.txproof,
    ]);
  }

  async getIdentitiesWithAddress(address: string): Promise<VerusIdentity[]> {
    return this.call('getidentitieswithaddress', [address]);
  }

  async registerIdentity(
    name: string,
    parent: string,
    primaryaddresses: string[],
    minimumsignatures: number,
    revocationauthority: string,
    recoveryauthority: string,
    privateaddress?: string,
    contentmap?: Record<string, string>
  ): Promise<string> {
    return this.call('registeridentity', [
      name,
      parent,
      primaryaddresses,
      minimumsignatures,
      revocationauthority,
      recoveryauthority,
      privateaddress || '',
      contentmap || {},
    ]);
  }

  async updateIdentity(
    name: string,
    parent: string,
    primaryaddresses: string[],
    minimumsignatures: number,
    revocationauthority: string,
    recoveryauthority: string,
    privateaddress?: string,
    contentmap?: Record<string, string>
  ): Promise<string> {
    return this.call('updateidentity', [
      name,
      parent,
      primaryaddresses,
      minimumsignatures,
      revocationauthority,
      recoveryauthority,
      privateaddress || '',
      contentmap || {},
    ]);
  }

  async revokeIdentity(
    name: string,
    revocationauthority: string
  ): Promise<string> {
    return this.call('revokeidentity', [name, revocationauthority]);
  }

  async recoverIdentity(
    name: string,
    recoveryauthority: string
  ): Promise<string> {
    return this.call('recoveridentity', [name, recoveryauthority]);
  }

  async setIdentityTrust(
    identity: string,
    trustlevel: number
  ): Promise<string> {
    return this.call('setidentitytrust', [identity, trustlevel]);
  }

  async getIdentityTrust(identity: string): Promise<IdentityTrust> {
    return this.call('getidentitytrust', [identity]);
  }

  // ============================================================================
  // VERUS CURRENCY RPC METHODS
  // ============================================================================

  async getCurrency(params: GetCurrencyParams): Promise<VerusCurrency> {
    return this.call('getcurrency', [
      params.name,
      params.height,
      params.txproof || false,
      params.currencyproof || false,
    ]);
  }

  async listCurrencies(
    params?: ListCurrenciesParams
  ): Promise<VerusCurrency[]> {
    const defaultParams = {
      start: 0,
      count: 10,
      txproof: false,
    };
    const finalParams = { ...defaultParams, ...params };
    return this.call('listcurrencies', [
      finalParams.start,
      finalParams.count,
      finalParams.systemid,
      finalParams.parent,
      finalParams.fromheight,
      finalParams.toheight,
      finalParams.txproof,
    ]);
  }

  async getCurrencyState(
    currencyid: string,
    height?: number
  ): Promise<CurrencyState> {
    return this.call('getcurrencystate', [currencyid, height]);
  }

  async sendCurrency(
    destination: string,
    currency: string,
    amount: number,
    from?: string,
    via?: string
  ): Promise<string> {
    return this.call('sendcurrency', [
      destination,
      currency,
      amount,
      from || '',
      via || '',
    ]);
  }

  async estimateConversion(
    currency: string,
    amount: number,
    via?: string
  ): Promise<ConversionEstimate> {
    return this.call('estimateconversion', [currency, amount, via || '']);
  }

  async setCurrencyTrust(
    currency: string,
    trustlevel: number
  ): Promise<string> {
    return this.call('setcurrencytrust', [currency, trustlevel]);
  }

  async getCurrencyTrust(currency: string): Promise<CurrencyTrust> {
    return this.call('getcurrencytrust', [currency]);
  }

  // ============================================================================
  // VERUS MARKETPLACE RPC METHODS
  // ============================================================================

  async makeOffer(offer: any, accept: any, identity: string): Promise<string> {
    return this.call('makeoffer', [offer, accept, identity]);
  }

  async takeOffer(offerid: string, identity: string): Promise<string> {
    return this.call('takeoffer', [offerid, identity]);
  }

  async getOffers(identity?: string, currency?: string): Promise<VerusOffer[]> {
    return this.call('getoffers', [identity || '', currency || '']);
  }

  async listOpenOffers(
    identity?: string,
    currency?: string
  ): Promise<VerusOffer[]> {
    return this.call('listopenoffers', [identity || '', currency || '']);
  }

  async closeOffers(offerids: string[], identity: string): Promise<string> {
    return this.call('closeoffers', [offerids, identity]);
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Get current rate limit status
   */
  getRateLimitStatus() {
    return this.rateLimiter.getStatus();
  }

  /**
   * Update rate limit configuration
   */
  updateRateLimitConfig(config: Partial<RateLimitConfig>) {
    this.rateLimiter.updateConfig(config);
  }

  /**
   * Reset rate limiter
   */
  resetRateLimiter() {
    this.rateLimiter.reset();
  }

  /**
   * Test RPC connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getBestBlockHash();
      return true;
    } catch (error) {
      logger.error('RPC connection test failed', error);
      return false;
    }
  }

  /**
   * Get current rate limiter statistics
   */
  getRateLimiterStats() {
    return this.rateLimiter.getDetailedStats();
  }
}

export const rpcClient = new RPCClient();
