'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  formatDifficulty,
  formatHashRate,
} from '@/lib/utils/number-formatting';
import {
  Database,
  Activity,
  Clock,
  Hash,
  Coins,
  Network,
  TrendingUp,
  Zap,
  RefreshCw,
  AlertCircle,
  Globe,
  ArrowUpRight,
  ArrowDownLeft,
  Copy,
  Check,
  BarChart3,
} from 'lucide-react';

interface LiveStats {
  blocks: number;
  transactions: number;
  mempoolSize: number;
  networkHashRate: number;
  difficulty: number;
  chain: string;
  connections: number;
  lastUpdate: Date;
}

interface MempoolInfo {
  size: number;
  bytes: number;
  usage: number;
  maxmempool: number;
  mempoolminfee: number;
  minrelaytxfee: number;
}

interface LiveTransaction {
  txid: string;
  size: number;
  fee: number;
  time: number;
  height: number;
  inputs: number;
  outputs: number;
  value: number;
  type: 'incoming' | 'outgoing' | 'internal';
}

interface Block {
  hash: string;
  height: number;
  time: number;
  size: number;
  weight: number;
  version: number;
  nonce: number;
  bits: string;
  difficulty: number;
  chainwork: string;
  nTx: number;
  previousblockhash?: string;
  nextblockhash?: string;
  merkleroot: string;
  tx: string[];
}

export function LiveData() {
  const [activeSection, setActiveSection] = useState<
    'overview' | 'blocks' | 'transactions' | 'mempool'
  >('overview');
  const [stats, setStats] = useState<LiveStats | null>(null);
  const [mempoolInfo, setMempoolInfo] = useState<MempoolInfo | null>(null);
  const [transactions, setTransactions] = useState<LiveTransaction[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchLiveData = useCallback(async () => {
    try {
      const [
        blockchainRes,
        mempoolRes,
        networkRes,
        transactionsRes,
        blocksRes,
      ] = await Promise.all([
        fetch('/api/blockchain-info'),
        fetch('/api/mempool/size'),
        fetch('/api/network-info'),
        fetch('/api/latest-transactions?limit=20'),
        fetch('/api/latest-blocks?limit=10'),
      ]);

      // Process blockchain data
      if (blockchainRes.ok) {
        const blockchainData = await blockchainRes.json();
        if (blockchainData.success) {
          setStats({
            blocks: blockchainData.data.blocks || 0,
            transactions: blockchainData.data.txcount || 0,
            mempoolSize: 0, // Will be updated from mempool data
            networkHashRate: blockchainData.data.networkhashps || 0,
            difficulty: blockchainData.data.difficulty || 0,
            chain: blockchainData.data.chain || 'Unknown',
            connections: 0, // Will be updated from network data
            lastUpdate: new Date(),
          });
        }
      }

      // Process mempool data
      if (mempoolRes.ok) {
        const mempoolData = await mempoolRes.json();
        if (mempoolData.success) {
          setMempoolInfo(mempoolData.data);
          if (stats) {
            setStats(prev =>
              prev ? { ...prev, mempoolSize: mempoolData.data.size || 0 } : null
            );
          }
        }
      }

      // Process network data
      if (networkRes.ok) {
        const networkData = await networkRes.json();
        if (networkData.success) {
          if (stats) {
            setStats(prev =>
              prev
                ? { ...prev, connections: networkData.data.connections || 0 }
                : null
            );
          }
        }
      }

      // Process transactions data
      if (transactionsRes.ok) {
        const transactionsData = await transactionsRes.json();
        if (transactionsData.success) {
          const txData = transactionsData.data.transactions.map((tx: any) => ({
            txid: tx.txid,
            size: tx.size || 0,
            fee: tx.fee || 0,
            time: tx.time || Date.now() / 1000,
            height: tx.height || 0,
            inputs: tx.vin?.length || 0,
            outputs: tx.vout?.length || 0,
            value: tx.value || 0,
            type: determineTransactionType(tx),
          }));
          setTransactions(txData);
        }
      }

      // Process blocks data
      if (blocksRes.ok) {
        const blocksData = await blocksRes.json();
        if (blocksData.success) {
          setBlocks(blocksData.data.blocks || []);
        }
      }

      setError(null);
    } catch (err) {
      console.error('Error fetching live data:', err);
      setError('Failed to fetch live data');
    } finally {
      setLoading(false);
    }
  }, [stats]);

  const determineTransactionType = (
    tx: any
  ): 'incoming' | 'outgoing' | 'internal' => {
    if (tx.vin && tx.vout) {
      if (tx.vin.length === 1 && tx.vout.length === 1) {
        return 'internal';
      } else if (tx.vin.length > tx.vout.length) {
        return 'outgoing';
      } else {
        return 'incoming';
      }
    }
    return 'internal';
  };

  useEffect(() => {
    fetchLiveData();

    if (autoRefresh) {
      const interval = setInterval(fetchLiveData, 10000); // Poll every 10 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh, fetchLiveData]);

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatFee = (fee: number) => {
    return (fee / 100000000).toFixed(8) + ' VRSC';
  };

  // Using imported formatHashRate and formatDifficulty functions for consistent formatting with commas

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'incoming':
        return <ArrowDownLeft className="h-4 w-4 text-green-400" />;
      case 'outgoing':
        return <ArrowUpRight className="h-4 w-4 text-red-400" />;
      default:
        return <Activity className="h-4 w-4 text-blue-400" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'incoming':
        return 'text-green-400';
      case 'outgoing':
        return 'text-red-400';
      default:
        return 'text-blue-400';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-blue-200">Loading live data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6">
        <div className="flex items-center space-x-3">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <div>
            <div className="text-red-400 font-semibold">Error</div>
            <div className="text-red-300 text-sm">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-white">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Live Data</h2>
          <p className="text-blue-200 text-sm mt-1">
            Real-time blockchain monitoring and analytics
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              autoRefresh
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
            }`}
          >
            <RefreshCw
              className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`}
            />
            <span className="text-sm">
              {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
            </span>
          </button>
          <button
            onClick={fetchLiveData}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-500/30 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            <span className="text-sm">Refresh</span>
          </button>
        </div>
      </div>

      {/* Section Navigation */}
      <div className="flex space-x-4">
        {[
          { key: 'overview', label: 'Overview', icon: BarChart3 },
          { key: 'blocks', label: 'Recent Blocks', icon: Database },
          {
            key: 'transactions',
            label: 'Recent Transactions',
            icon: Activity,
          },
          { key: 'mempool', label: 'Mempool', icon: Clock },
        ].map(section => (
          <button
            key={section.key}
            onClick={() => setActiveSection(section.key as any)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              activeSection === section.key
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'bg-white/10 text-white/80 hover:bg-white/20'
            }`}
          >
            <section.icon className="h-4 w-4" />
            <span className="text-sm">{section.label}</span>
          </button>
        ))}
      </div>

      {/* Overview Section */}
      {activeSection === 'overview' && stats && (
        <div className="space-y-6">
          {/* Network Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="flex items-center space-x-3">
                <Database className="h-6 w-6 text-blue-400" />
                <div>
                  <div className="text-3xl font-bold text-white">
                    {stats.blocks.toLocaleString()}
                  </div>
                  <div className="text-blue-200 text-sm">Total Blocks</div>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="flex items-center space-x-3">
                <Activity className="h-6 w-6 text-green-400" />
                <div>
                  <div className="text-3xl font-bold text-white">
                    {stats.transactions.toLocaleString()}
                  </div>
                  <div className="text-blue-200 text-sm">
                    Total Transactions
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="flex items-center space-x-3">
                <Clock className="h-6 w-6 text-yellow-400" />
                <div>
                  <div className="text-3xl font-bold text-white">
                    {stats.mempoolSize.toLocaleString()}
                  </div>
                  <div className="text-blue-200 text-sm">Mempool Size</div>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="flex items-center space-x-3">
                <Network className="h-6 w-6 text-purple-400" />
                <div>
                  <div className="text-3xl font-bold text-white">
                    {stats.connections}
                  </div>
                  <div className="text-blue-200 text-sm">Connections</div>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="flex items-center space-x-3">
                <Hash className="h-6 w-6 text-orange-400" />
                <div>
                  <div className="text-3xl font-bold text-white">
                    {formatHashRate(stats.networkHashRate)}
                  </div>
                  <div className="text-blue-200 text-sm">Network Hash Rate</div>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="flex items-center space-x-3">
                <TrendingUp className="h-6 w-6 text-red-400" />
                <div>
                  <div className="text-3xl font-bold text-white">
                    {formatDifficulty(stats.difficulty)}
                  </div>
                  <div className="text-blue-200 text-sm">Difficulty</div>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="flex items-center space-x-3">
                <Globe className="h-6 w-6 text-cyan-400" />
                <div>
                  <div className="text-3xl font-bold text-white">
                    {stats.chain}
                  </div>
                  <div className="text-blue-200 text-sm">Network</div>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="flex items-center space-x-3">
                <Zap className="h-6 w-6 text-pink-400" />
                <div>
                  <div className="text-3xl font-bold text-white">
                    {stats.lastUpdate.toLocaleTimeString()}
                  </div>
                  <div className="text-blue-200 text-sm">Last Update</div>
                </div>
              </div>
            </div>
          </div>

          {/* Mempool Info */}
          {mempoolInfo && (
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <h3 className="text-xl font-bold text-white mb-4">
                Mempool Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-blue-200 text-sm">Size</div>
                  <div className="text-white font-semibold">
                    {mempoolInfo.size.toLocaleString()} transactions
                  </div>
                </div>
                <div>
                  <div className="text-blue-200 text-sm">Memory Usage</div>
                  <div className="text-white font-semibold">
                    {formatSize(mempoolInfo.usage)}
                  </div>
                </div>
                <div>
                  <div className="text-blue-200 text-sm">Min Fee</div>
                  <div className="text-white font-semibold">
                    {typeof mempoolInfo.mempoolminfee === 'number'
                      ? `${mempoolInfo.mempoolminfee.toFixed(8)} VRSC`
                      : 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="text-blue-200 text-sm">Max Size</div>
                  <div className="text-white font-semibold">
                    {formatSize(mempoolInfo.maxmempool)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Blocks Section */}
      {activeSection === 'blocks' && (
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
          <h3 className="text-xl font-bold text-white mb-4">Recent Blocks</h3>
          {blocks.length > 0 ? (
            <div className="space-y-4">
              {blocks.map((block, index) => (
                <div
                  key={`live-data-blocks-${block.hash}`}
                  className="bg-white/5 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="text-white font-semibold">
                        #{block.height}
                      </div>
                      <button
                        onClick={() =>
                          copyToClipboard(block.hash, `block-${index}`)
                        }
                        className="flex items-center space-x-1 px-2 py-1 bg-white/10 hover:bg-white/20 rounded transition-colors"
                      >
                        {copied === `block-${index}` ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                        <span className="text-xs">Copy Hash</span>
                      </button>
                    </div>
                    <div className="text-blue-200 text-sm">
                      {formatTime(block.time)}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-blue-200 mb-1">Hash</div>
                      <div className="text-white font-mono text-xs break-all">
                        {block.hash}
                      </div>
                    </div>
                    <div>
                      <div className="text-blue-200 mb-1">Transactions</div>
                      <div className="text-white">{block.nTx}</div>
                    </div>
                    <div>
                      <div className="text-blue-200 mb-1">Size</div>
                      <div className="text-white">{formatSize(block.size)}</div>
                    </div>
                    <div>
                      <div className="text-blue-200 mb-1">Difficulty</div>
                      <div className="text-white">
                        {formatDifficulty(block.difficulty)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-blue-200">
              No recent blocks available
            </div>
          )}
        </div>
      )}

      {/* Transactions Section */}
      {activeSection === 'transactions' && (
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
          <h3 className="text-xl font-bold text-white mb-4">
            Recent Transactions
          </h3>
          {transactions.length > 0 ? (
            <div className="space-y-3">
              {transactions.map((tx, index) => (
                <div
                  key={`live-data-transactions-${tx.txid}`}
                  className="bg-white/5 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      {getTransactionIcon(tx.type)}
                      <div className="text-white font-mono text-sm">
                        {tx.txid.substring(0, 16)}...
                      </div>
                      <button
                        onClick={() => copyToClipboard(tx.txid, `tx-${index}`)}
                        className="flex items-center space-x-1 px-2 py-1 bg-white/10 hover:bg-white/20 rounded transition-colors"
                      >
                        {copied === `tx-${index}` ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                        <span className="text-xs">Copy</span>
                      </button>
                    </div>
                    <div className="text-blue-200 text-sm">
                      {formatTime(tx.time)}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-sm">
                    <div>
                      <div className="text-blue-200 mb-1">Type</div>
                      <div
                        className={`${getTransactionColor(tx.type)} capitalize`}
                      >
                        {tx.type}
                      </div>
                    </div>
                    <div>
                      <div className="text-blue-200 mb-1">Size</div>
                      <div className="text-white">{formatSize(tx.size)}</div>
                    </div>
                    <div>
                      <div className="text-blue-200 mb-1">Fee</div>
                      <div className="text-white">{formatFee(tx.fee)}</div>
                    </div>
                    <div>
                      <div className="text-blue-200 mb-1">Inputs</div>
                      <div className="text-white">{tx.inputs}</div>
                    </div>
                    <div>
                      <div className="text-blue-200 mb-1">Outputs</div>
                      <div className="text-white">{tx.outputs}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-blue-200">
              No recent transactions available
            </div>
          )}
        </div>
      )}
    </div>
  );
}
