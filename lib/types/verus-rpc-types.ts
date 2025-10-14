// Verus RPC Types - Comprehensive TypeScript definitions for all Verus RPC methods
// Generated from official VerusCoin repository analysis

export interface RPCResponse<T = any> {
  result: T;
  error: RPCError | null;
  id: string | number;
}

export interface RPCError {
  code: number;
  message: string;
  data?: any;
}

// ============================================================================
// BLOCKCHAIN RPC TYPES
// ============================================================================

export interface BlockchainInfo {
  chain: string;
  blocks: number;
  headers: number;
  bestblockhash: string;
  difficulty: number;
  mediantime: number;
  verificationprogress: number;
  chainwork: string;
  pruned: boolean;
  commitments: number;
  softforks: Array<{
    id: string;
    version: number;
    reject: {
      status: boolean;
    };
  }>;
  valuePools: Array<{
    id: string;
    monitored: boolean;
    chainValue: number;
    chainValueZat: number;
  }>;
}

export interface BlockInfo {
  hash: string;
  confirmations: number;
  size: number;
  height: number;
  version: number;
  versionHex: string;
  merkleroot: string;
  tx: string[];
  time: number;
  mediantime: number;
  nonce: number;
  bits: string;
  difficulty: number;
  chainwork: string;
  previousblockhash?: string;
  nextblockhash?: string;
}

export interface BlockHeader {
  hash: string;
  confirmations: number;
  height: number;
  version: number;
  versionHex: string;
  merkleroot: string;
  time: number;
  mediantime: number;
  nonce: number;
  bits: string;
  difficulty: number;
  chainwork: string;
  previousblockhash?: string;
  nextblockhash?: string;
}

export interface ChainTip {
  height: number;
  hash: string;
  branchlen: number;
  status: string;
}

export interface MempoolInfo {
  size: number;
  bytes: number;
  usage: number;
  maxmempool: number;
  mempoolminfee: number;
  minrelaytxfee: number;
}

export interface TxOutInfo {
  bestblock: string;
  confirmations: number;
  value: number;
  scriptPubKey: {
    asm: string;
    hex: string;
    reqSigs: number;
    type: string;
    addresses: string[];
  };
  coinbase: boolean;
}

export interface TxOutSetInfo {
  height: number;
  bestblock: string;
  transactions: number;
  txouts: number;
  bogosize: number;
  hash_serialized_2: string;
  disk_size: number;
  total_amount: number;
}

// ============================================================================
// TRANSACTION RPC TYPES
// ============================================================================

export interface RawTransaction {
  hex: string;
  txid: string;
  hash: string;
  size: number;
  vsize: number;
  weight: number;
  version: number;
  locktime: number;
  vin: Array<{
    txid: string;
    vout: number;
    scriptSig: {
      asm: string;
      hex: string;
    };
    sequence: number;
  }>;
  vout: Array<{
    value: number;
    n: number;
    scriptPubKey: {
      asm: string;
      hex: string;
      reqSigs: number;
      type: string;
      addresses: string[];
    };
  }>;
}

export interface CreateRawTransactionParams {
  inputs: Array<{
    txid: string;
    vout: number;
  }>;
  outputs:
    | Record<string, number>
    | Array<{
        [address: string]: number;
      }>;
}

export interface SignedRawTransaction {
  hex: string;
  complete: boolean;
  errors?: Array<{
    txid: string;
    vout: number;
    scriptSig: string;
    sequence: number;
    error: string;
  }>;
}

// ============================================================================
// MINING RPC TYPES
// ============================================================================

export interface MiningInfo {
  blocks: number;
  currentblocksize: number;
  currentblocktx: number;
  difficulty: number;
  networkhashps: number;
  networksolps: number;
  localsolps: number;
  pooledtx: number;
  testnet: boolean;
  chain: string;
  generate: boolean;
  numthreads: number;
  genproclimit: number;
  warnings: string;
}

export interface BlockTemplate {
  version: number;
  previousblockhash: string;
  transactions: Array<{
    data: string;
    hash: string;
    depends: number[];
    fee: number;
    sigops: number;
  }>;
  coinbasetxn?: {
    data: string;
    hash: string;
    depends: number[];
    fee: number;
    sigops: number;
  };
  target: string;
  mintime: number;
  mutable: string[];
  noncerange: string;
  sigoplimit: number;
  sizelimit: number;
  curtime: number;
  bits: string;
  height: number;
  longpollid: string;
  default_witness_commitment?: string;
}

// ============================================================================
// WALLET RPC TYPES
// ============================================================================

export interface WalletInfo {
  walletversion: number;
  balance: number;
  unconfirmed_balance: number;
  immature_balance: number;
  txcount: number;
  keypoololdest: number;
  keypoolsize: number;
  keypoolsize_hd_internal: number;
  unlocked_until: number;
  paytxfee: number;
  hdmasterkeyid: string;
}

export interface AddressInfo {
  address: string;
  scriptPubKey: string;
  ismine: boolean;
  iswatchonly: boolean;
  isscript: boolean;
  script: string;
  hex: string;
  pubkeys: string[];
  sigsrequired: number;
  addresses: string[];
  pubkey: string;
  embedded: {
    isscript: boolean;
    ispubkey: boolean;
    address: string;
    label: string;
    ismine: boolean;
    iswatchonly: boolean;
    script: string;
    hex: string;
    sigsrequired: number;
    pubkeys: string[];
    addresses: string[];
    pubkey: string;
  };
  ischange: boolean;
  timestamp: number;
  hdkeypath: string;
  hdmasterkeyid: string;
  labels: Array<{
    name: string;
    purpose: string;
  }>;
}

export interface TransactionInfo {
  amount: number;
  confirmations: number;
  blockhash: string;
  blockindex: number;
  blocktime: number;
  txid: string;
  time: number;
  timereceived: number;
  details: Array<{
    account: string;
    address: string;
    category: string;
    amount: number;
    label: string;
    vout: number;
    fee: number;
  }>;
  hex: string;
}

export interface UnspentOutput {
  txid: string;
  vout: number;
  address: string;
  account: string;
  scriptPubKey: string;
  amount: number;
  confirmations: number;
  spendable: boolean;
  solvable: boolean;
}

// ============================================================================
// NETWORK RPC TYPES
// ============================================================================

export interface NetworkInfo {
  version: number;
  subversion: string;
  protocolversion: number;
  localservices: string;
  localrelay: boolean;
  timeoffset: number;
  networkactive: boolean;
  connections: number;
  networks: Array<{
    name: string;
    limited: boolean;
    reachable: boolean;
    proxy: string;
    proxy_randomize_credentials: boolean;
  }>;
  relayfee: number;
  incrementalfee: number;
  localaddresses: Array<{
    address: string;
    port: number;
    score: number;
  }>;
  warnings: string;
}

export interface PeerInfo {
  id: number;
  addr: string;
  addrlocal: string;
  addrbind: string;
  services: string;
  servicesnames: string[];
  relaytxes: boolean;
  lastsend: number;
  lastrecv: number;
  bytessent: number;
  bytesrecv: number;
  conntime: number;
  timeoffset: number;
  pingtime: number;
  minping: number;
  version: number;
  subver: string;
  inbound: boolean;
  addnode: boolean;
  startingheight: number;
  banscore: number;
  synced_headers: number;
  synced_blocks: number;
  inflight: number[];
  whitelisted: boolean;
  bytessent_per_msg: Record<string, number>;
  bytesrecv_per_msg: Record<string, number>;
}

export interface NetTotals {
  totalbytesrecv: number;
  totalbytessent: number;
  timemillis: number;
  uploadtarget: {
    timeframe: number;
    target: number;
    target_reached: boolean;
    serve_historical_blocks: boolean;
    bytes_left_in_cycle: number;
    time_left_in_cycle: number;
  };
}

// ============================================================================
// VERUS IDENTITY RPC TYPES
// ============================================================================

export interface VerusIdentity {
  version: number;
  flags: number;
  primaryaddresses: string[];
  minimumsignatures: number;
  name: string;
  identityaddress: string;
  parent: string;
  systemid: string;
  contentmap: Record<string, string>;
  revocationauthority: string;
  recoveryauthority: string;
  privateaddress: string;
  timelock: number;
  registrationheight: number;
  revocationheight: number;
  recoveryheight: number;
  revocationtxid: string;
  recoverytxid: string;
  txid: string;
  height: number;
  confirmed: boolean;
  status: string;
  canrevoke: boolean;
  canrecover: boolean;
  blocktime: number;
}

export interface IdentityHistory {
  version: number;
  flags: number;
  primaryaddresses: string[];
  minimumsignatures: number;
  name: string;
  identityaddress: string;
  parent: string;
  systemid: string;
  contentmap: Record<string, string>;
  revocationauthority: string;
  recoveryauthority: string;
  privateaddress: string;
  timelock: number;
  registrationheight: number;
  revocationheight: number;
  recoveryheight: number;
  revocationtxid: string;
  recoverytxid: string;
  txid: string;
  height: number;
  confirmed: boolean;
  status: string;
  canrevoke: boolean;
  canrecover: boolean;
  blocktime: number;
}

export interface IdentityContent {
  name: string;
  content: string;
  txid: string;
  height: number;
  blocktime: number;
}

export interface IdentityTrust {
  identity: string;
  trustlevel: number;
  txid: string;
  height: number;
  blocktime: number;
}

// ============================================================================
// VERUS CURRENCY RPC TYPES
// ============================================================================

export interface VerusCurrency {
  version: number;
  name: string;
  currencyid: string;
  parent: string;
  systemid: string;
  notarizationprotocol: number;
  launchsystemid: string;
  startblock: number;
  endblock: number;
  currencies: string[];
  weights: number[];
  conversionfees: Array<{
    currency: string;
    fee: number;
  }>;
  minpreconversion: Array<{
    currency: string;
    amount: number;
  }>;
  initialcontributions: Array<{
    currency: string;
    amount: number;
  }>;
  initialsupply: Array<{
    currency: string;
    amount: number;
  }>;
  initialreserve: Array<{
    currency: string;
    amount: number;
  }>;
  prelaunchcarveout: number;
  prelaunchcarveoutlength: number;
  idregistrationfees: Array<{
    currency: string;
    amount: number;
  }>;
  idimportfees: Array<{
    currency: string;
    amount: number;
  }>;
  currencyregistrationfees: Array<{
    currency: string;
    amount: number;
  }>;
  currencyimportfees: Array<{
    currency: string;
    amount: number;
  }>;
  transactionimportfees: Array<{
    currency: string;
    amount: number;
  }>;
  exporttransactionsystemid: string;
  proofprotocols: number[];
  txid: string;
  height: number;
  confirmed: boolean;
  status: string;
  blocktime: number;
}

export interface CurrencyState {
  flags: number;
  version: number;
  currencyid: string;
  reservecurrencies: Array<{
    currencyid: string;
    weight: number;
    reserves: number;
    priceinreserve: number;
    feesinreserve: number;
    conversionfees: Array<{
      currency: string;
      fee: number;
    }>;
    initialcontributions: Array<{
      currency: string;
      amount: number;
    }>;
    preconvert: Array<{
      currency: string;
      amount: number;
    }>;
  }>;
  initialsupply: number;
  emitted: number;
  supply: number;
  currency: string;
  height: number;
  blocktime: number;
}

export interface CurrencyTrust {
  currency: string;
  trustlevel: number;
  txid: string;
  height: number;
  blocktime: number;
}

export interface ConversionEstimate {
  currency: string;
  amount: number;
  fee: number;
  total: number;
  price: number;
}

// ============================================================================
// VERUS MARKETPLACE RPC TYPES
// ============================================================================

export interface VerusOffer {
  version: number;
  offer: {
    currencyid: string;
    currency: string;
    amount: number;
    price: number;
    minimumsize: number;
    maximumsize: number;
    minimumprice: number;
    maximumprice: number;
    timelock: number;
    expiration: number;
    exclusive: boolean;
    identity: string;
    systemid: string;
  };
  accept: {
    currencyid: string;
    currency: string;
    amount: number;
    price: number;
    minimumsize: number;
    maximumsize: number;
    minimumprice: number;
    maximumprice: number;
    timelock: number;
    expiration: number;
    exclusive: boolean;
    identity: string;
    systemid: string;
  };
  txid: string;
  height: number;
  confirmed: boolean;
  status: string;
  blocktime: number;
}

// ============================================================================
// PBaaS RPC TYPES
// ============================================================================

export interface NotarizationData {
  version: number;
  currencyid: string;
  notarizationheight: number;
  blockhash: string;
  blocktime: number;
  txid: string;
  height: number;
  confirmed: boolean;
  status: string;
}

export interface LaunchInfo {
  version: number;
  name: string;
  currencyid: string;
  parent: string;
  systemid: string;
  launchsystemid: string;
  startblock: number;
  endblock: number;
  launch: {
    currencyid: string;
    name: string;
    parent: string;
    systemid: string;
    launchsystemid: string;
    startblock: number;
    endblock: number;
  };
  txid: string;
  height: number;
  confirmed: boolean;
  status: string;
  blocktime: number;
}

export interface ProofRoot {
  version: number;
  currencyid: string;
  height: number;
  blockhash: string;
  blocktime: number;
  txid: string;
  confirmed: boolean;
  status: string;
}

// ============================================================================
// RPC METHOD PARAMETER TYPES
// ============================================================================

export interface GetBlockParams {
  blockhash?: string;
  height?: number;
  verbosity?: 0 | 1 | 2;
}

export interface GetBlockHeaderParams {
  blockhash?: string;
  height?: number;
}

export interface GetRawTransactionParams {
  txid: string;
  verbose?: boolean;
  blockhash?: string;
}

export interface CreateRawTransactionParams {
  inputs: Array<{
    txid: string;
    vout: number;
  }>;
  outputs:
    | Record<string, number>
    | Array<{
        [address: string]: number;
      }>;
}

export interface SendRawTransactionParams {
  hexstring: string;
  allowhighfees?: boolean;
}

export interface SignRawTransactionParams {
  hexstring: string;
  prevtxs?: Array<{
    txid: string;
    vout: number;
    scriptPubKey: string;
    redeemScript?: string;
    amount: number;
  }>;
  privkeys?: string[];
  sighashtype?: string;
}

export interface GetIdentityParams {
  name: string;
  height?: number;
  txproof?: boolean;
  identityproof?: boolean;
}

export interface GetCurrencyParams {
  name: string;
  height?: number;
  txproof?: boolean;
  currencyproof?: boolean;
}

export interface ListIdentitiesParams {
  start?: number;
  count?: number;
  systemid?: string;
  parent?: string;
  timelockfrom?: number;
  timelockto?: number;
  fromheight?: number;
  toheight?: number;
  txproof?: boolean;
}

export interface ListCurrenciesParams {
  start?: number;
  count?: number;
  systemid?: string;
  parent?: string;
  fromheight?: number;
  toheight?: number;
  txproof?: boolean;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type RPCMethod =
  // Blockchain methods
  | 'getbestblockhash'
  | 'getblock'
  | 'getblockchaininfo'
  | 'getblockcount'
  | 'getblockdeltas'
  | 'getblockhash'
  | 'getblockhashes'
  | 'getblockheader'
  | 'getchaintips'
  | 'getdifficulty'
  | 'getmempoolinfo'
  | 'getrawmempool'
  | 'getspentinfo'
  | 'gettxout'
  | 'gettxoutsetinfo'
  | 'pruneblockchain'
  | 'verifychain'
  | 'gettxoutproof'
  | 'verifytxoutproof'
  // Transaction methods
  | 'createrawtransaction'
  | 'decoderawtransaction'
  | 'decodescript'
  | 'getrawtransaction'
  | 'sendrawtransaction'
  | 'signrawtransaction'
  // Mining methods
  | 'getblocktemplate'
  | 'getlocalsolps'
  | 'getmininginfo'
  | 'getnetworkhashps'
  | 'getnetworksolps'
  | 'prioritisetransaction'
  | 'submitblock'
  // Wallet methods
  | 'abandontransaction'
  | 'addmultisigaddress'
  | 'backupwallet'
  | 'dumpprivkey'
  | 'dumpwallet'
  | 'encryptwallet'
  | 'getaccount'
  | 'getaccountaddress'
  | 'getaddressesbyaccount'
  | 'getbalance'
  | 'getnewaddress'
  | 'getrawchangeaddress'
  | 'getreceivedbyaccount'
  | 'getreceivedbyaddress'
  | 'gettransaction'
  | 'getunconfirmedbalance'
  | 'getwalletinfo'
  | 'importaddress'
  | 'importprivkey'
  | 'importwallet'
  | 'keypoolrefill'
  | 'listaccounts'
  | 'listaddressgroupings'
  | 'listlockunspent'
  | 'listreceivedbyaccount'
  | 'listreceivedbyaddress'
  | 'listsinceblock'
  | 'listtransactions'
  | 'listunspent'
  | 'lockunspent'
  | 'getaddresstxids'
  | 'move'
  | 'resendwallettransactions'
  | 'sendfrom'
  | 'sendmany'
  | 'sendtoaddress'
  | 'setaccount'
  | 'settxfee'
  | 'signmessage'
  | 'walletlock'
  | 'walletpassphrase'
  | 'walletpassphrasechange'
  // Network methods
  | 'addnode'
  | 'disconnectnode'
  | 'getaddednodeinfo'
  | 'getconnectioncount'
  | 'getdeprecationinfo'
  | 'getnettotals'
  | 'getnetworkinfo'
  | 'getpeerinfo'
  | 'listbanned'
  | 'ping'
  | 'setban'
  | 'setnetworkactive'
  | 'clearbanned'
  | 'getinfo'
  | 'help'
  | 'stop'
  | 'uptime'
  // Identity methods
  | 'registernamecommitment'
  | 'registeridentity'
  | 'updateidentity'
  | 'revokeidentity'
  | 'setidentitytimelock'
  | 'recoveridentity'
  | 'getidentity'
  | 'getidentityhistory'
  | 'getidentitycontent'
  | 'listidentities'
  | 'getidentitieswithaddress'
  | 'getidentitieswithrevocation'
  | 'getidentitieswithrecovery'
  | 'setidentitytrust'
  | 'getidentitytrust'
  // Currency methods
  | 'setcurrencytrust'
  | 'getcurrencytrust'
  | 'estimateconversion'
  | 'definecurrency'
  | 'listcurrencies'
  | 'getcurrencyconverters'
  | 'getcurrency'
  | 'getreservedeposits'
  | 'getnotarizationdata'
  | 'getlaunchinfo'
  | 'getbestproofroot'
  | 'submitacceptednotarization'
  | 'submitchallenges'
  | 'getnotarizationproofs'
  | 'submitimports'
  | 'getinitialcurrencystate'
  | 'getcurrencystate'
  | 'getsaplingtree'
  | 'sendcurrency'
  | 'getpendingtransfers'
  | 'getexports'
  | 'getlastimportfrom'
  | 'getimports'
  | 'refundfailedlaunch'
  | 'addmergedblock'
  | 'submitmergedblock'
  // Marketplace methods
  | 'makeoffer'
  | 'takeoffer'
  | 'getoffers'
  | 'listopenoffers'
  | 'closeoffers';

export interface RPCCall {
  method: RPCMethod;
  params: any[];
  id?: string | number;
}

export interface RPCBatchCall {
  calls: RPCCall[];
}

// ============================================================================
// RATE LIMITING TYPES
// ============================================================================

export interface RateLimitConfig {
  maxRequestsPerSecond: number;
  maxRequestsPerMinute: number;
  maxRequestsPerHour: number;
  burstLimit: number;
  windowMs: number;
  retryAfterMs: number;
}

export interface RateLimitStatus {
  remaining: number;
  resetTime: number;
  retryAfter?: number;
  isLimited: boolean;
}

// ============================================================================
// CACHING TYPES
// ============================================================================

export interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  maxSize: number; // Maximum number of cached items
  strategy: 'lru' | 'fifo' | 'ttl';
}

export interface CacheEntry<T = any> {
  key: string;
  value: T;
  timestamp: number;
  ttl: number;
  hits: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}
