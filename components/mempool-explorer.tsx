'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Clock,
  Hash,
  Coins,
  Copy,
  Check,
  WarningCircle,
  ArrowsClockwise,
  DownloadSimple,
  ArrowUpDown,
  TrendUp,
  TrendDown,
  Activity,
  CurrencyDollar,
} from '@phosphor-icons/react';
import {
  formatFriendlyNumber,
  formatCryptoValue,
  formatFileSize,
  formatDuration,
} from '@/lib/utils/number-formatting';

interface MempoolTransaction {
  txid: string;
  size: number;
  fee: number;
  time: number;
  height: number;
  startingpriority: number;
  currentpriority: number;
  depends: string[];
  spentby: string[];
}

type SortField = 'time' | 'size' | 'fee' | 'priority';
type SortDirection = 'asc' | 'desc';

export function MempoolExplorer() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<MempoolTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('time');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [totalCount, setTotalCount] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchMempool = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/mempool/transactions?limit=100`);
      const result = await response.json();

      if (result.success && result.data) {
        setTransactions(result.data.transactions || []);
        setTotalCount(result.data.total || 0);
      } else {
        setError(result.error || 'Failed to fetch mempool');
      }
    } catch (err) {
      setError('Network error while fetching mempool');
      console.error('Error fetching mempool:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMempool();
  }, []);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchMempool();
    }, 10000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

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
    const now = Date.now() / 1000;
    const diff = now - timestamp;

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(timestamp * 1000).toLocaleString();
  };

  const formatShortHash = (hash: string, length: number = 8) => {
    if (!hash || hash.length <= length * 2) return hash;
    return `${hash.substring(0, length)}...${hash.substring(hash.length - length)}`;
  };

  const sortTransactions = (
    txs: MempoolTransaction[],
    field: SortField,
    direction: SortDirection
  ) => {
    return [...txs].sort((a, b) => {
      let aValue: number, bValue: number;

      switch (field) {
        case 'time':
          aValue = a.time;
          bValue = b.time;
          break;
        case 'size':
          aValue = a.size;
          bValue = b.size;
          break;
        case 'fee':
          aValue = a.fee;
          bValue = b.fee;
          break;
        case 'priority':
          aValue = a.currentpriority;
          bValue = b.currentpriority;
          break;
        default:
          aValue = a.time;
          bValue = b.time;
          break;
      }

      return direction === 'asc' ? aValue - bValue : bValue - aValue;
    });
  };

  const exportToJSON = () => {
    const sorted = sortTransactions(transactions, sortField, sortDirection);
    const jsonContent = JSON.stringify(sorted, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `verus-mempool-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading && transactions.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-blue-200">Loading mempool...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6">
        <div className="flex items-center space-x-3">
          <WarningCircle className="h-5 w-5 text-red-400" />
          <div>
            <div className="text-red-400 font-semibold">Error</div>
            <div className="text-red-300 text-sm">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  const sortedTransactions = sortTransactions(
    transactions,
    sortField,
    sortDirection
  );

  // Calculate statistics
  const totalFees = transactions.reduce((sum, tx) => sum + tx.fee, 0);
  const totalSize = transactions.reduce((sum, tx) => sum + tx.size, 0);
  const avgFee = transactions.length > 0 ? totalFees / transactions.length : 0;
  const avgSize = transactions.length > 0 ? totalSize / transactions.length : 0;

  return (
    <div className="space-y-6 text-white">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Mempool Explorer</h2>
          <p className="text-blue-200 text-sm mt-1">
            View pending transactions waiting to be confirmed
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              autoRefresh
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-white/10 text-gray-400 hover:bg-white/20'
            }`}
          >
            <Activity
              className={`h-4 w-4 ${autoRefresh ? 'animate-pulse' : ''}`}
            />
            <span className="text-sm">
              {autoRefresh ? 'Auto-Refresh ON' : 'Auto-Refresh OFF'}
            </span>
          </button>
          <button
            onClick={fetchMempool}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors disabled:opacity-50 text-sm"
          >
            <ArrowsClockwise
              className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
            />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Activity className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <div className="text-white font-semibold">Total Transactions</div>
              <div className="text-blue-200 text-sm">
                {formatFriendlyNumber(totalCount)}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-green-500/20">
              <CurrencyDollar className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <div className="text-white font-semibold">Total Fees</div>
              <div className="text-blue-200 text-sm">
                {formatCryptoValue(totalFees)}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-verus-blue/20">
              <Coins className="h-5 w-5 text-verus-blue" />
            </div>
            <div>
              <div className="text-white font-semibold">Total Size</div>
              <div className="text-blue-200 text-sm">
                {formatFileSize(totalSize)}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-verus-teal/20">
              <CurrencyDollar className="h-5 w-5 text-verus-teal" />
            </div>
            <div>
              <div className="text-white font-semibold">Average Fee</div>
              <div className="text-blue-200 text-sm">
                {formatCryptoValue(avgFee)}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-verus-cyan/20">
              <Hash className="h-5 w-5 text-verus-cyan" />
            </div>
            <div>
              <div className="text-white font-semibold">Average Size</div>
              <div className="text-blue-200 text-sm">
                {formatFileSize(avgSize)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">
            Pending Transactions ({transactions.length})
          </h3>

          {/* Controls */}
          <div className="flex items-center space-x-3">
            {/* Sort Controls */}
            <div className="flex items-center space-x-2">
              <ArrowUpDown className="h-4 w-4 text-blue-400" />
              <select
                value={sortField}
                onChange={e => setSortField(e.target.value as SortField)}
                className="bg-white/10 border border-white/20 rounded px-2 py-1 text-sm text-white"
              >
                <option value="time">Time</option>
                <option value="size">Size</option>
                <option value="fee">Fee</option>
                <option value="priority">Priority</option>
              </select>
              <button
                onClick={() =>
                  setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
                }
                className="p-1 bg-white/10 hover:bg-white/20 rounded transition-colors"
                title={`Sort ${sortDirection === 'asc' ? 'Descending' : 'Ascending'}`}
              >
                {sortDirection === 'asc' ? (
                  <TrendUp className="h-4 w-4" />
                ) : (
                  <TrendDown className="h-4 w-4" />
                )}
              </button>
            </div>

            {/* Export Controls */}
            <div className="flex items-center space-x-2">
              <DownloadSimple className="h-4 w-4 text-blue-400" />
              <button
                onClick={exportToJSON}
                className="px-2 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-xs rounded transition-colors"
              >
                JSON
              </button>
            </div>
          </div>
        </div>

        {sortedTransactions.length > 0 ? (
          <div className="space-y-4">
            {sortedTransactions.map((tx, index) => (
              <div
                key={`mempool-explorer-${tx.txid}`}
                className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    {/* Transaction ID */}
                    <div className="flex items-center space-x-3">
                      <Hash className="h-4 w-4 text-blue-400 flex-shrink-0" />
                      <div className="flex items-center space-x-2 flex-1">
                        <span className="text-gray-400 text-sm">TX ID:</span>
                        <code className="text-white font-mono text-sm">
                          {formatShortHash(tx.txid, 16)}
                        </code>
                        <button
                          onClick={() =>
                            copyToClipboard(tx.txid, `tx-${tx.txid}`)
                          }
                          className="p-1 hover:bg-white/20 rounded transition-colors"
                          title="Copy transaction ID"
                        >
                          {copied === `tx-${tx.txid}` ? (
                            <Check className="h-4 w-4 text-green-400" />
                          ) : (
                            <Copy className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                        <button
                          onClick={() => router.push(`/transaction/${tx.txid}`)}
                          className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
                        >
                          View Details →
                        </button>
                      </div>
                    </div>

                    {/* Transaction Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <div>
                          <div className="text-gray-400 text-xs">Time</div>
                          <div className="text-white text-sm">
                            {formatTime(tx.time)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Hash className="h-4 w-4 text-gray-400" />
                        <div>
                          <div className="text-gray-400 text-xs">Size</div>
                          <div className="text-white text-sm">
                            {formatFileSize(tx.size)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Coins className="h-4 w-4 text-gray-400" />
                        <div>
                          <div className="text-gray-400 text-xs">Fee</div>
                          <div className="text-white text-sm">
                            {formatCryptoValue(tx.fee)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Activity className="h-4 w-4 text-gray-400" />
                        <div>
                          <div className="text-gray-400 text-xs">Priority</div>
                          <div className="text-white text-sm">
                            {tx.currentpriority.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Dependencies */}
                    {tx.depends.length > 0 && (
                      <div className="text-verus-teal text-xs">
                        ⚠️ Depends on {tx.depends.length} transaction
                        {tx.depends.length > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-400">No transactions in mempool</p>
          </div>
        )}
      </div>
    </div>
  );
}
