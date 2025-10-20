'use client';

import { useState, useEffect } from 'react';
import {
  Pulse,
  Clock,
  Hash,
  Coins,
  ArrowRight,
  Copy,
  Check,
  ArrowSquareOut,
  WarningCircle,
  Info,
  ArrowLeft,
  ArrowDown,
} from '@phosphor-icons/react';
import {
  formatFriendlyNumber,
  formatCryptoValue,
  formatFileSize,
  formatTransactionCount,
} from '@/lib/utils/number-formatting';

interface Transaction {
  txid: string;
  hash: string;
  version: number;
  size: number;
  vsize: number;
  weight: number;
  locktime: number;
  vin: Array<{
    txid?: string;
    vout?: number;
    scriptSig?: {
      asm: string;
      hex: string;
    };
    coinbase?: string;
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
      addresses?: string[];
    };
  }>;
  hex: string;
  blockhash?: string;
  confirmations?: number;
  time?: number;
  blocktime?: number;
}

export function TransactionsExplorer() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalTransactions, setTotalTransactions] = useState(0);

  const fetchTransactions = async (page: number = 0) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/latest-transactions?limit=20&offset=${page * 20}`
      );
      const result = await response.json();

      if (result.success && result.data) {
        setTransactions(result.data.transactions || []);
        setTotalTransactions(result.data.totalTransactions || 0);
      } else {
        setError(result.error || 'Failed to fetch transactions');
      }
    } catch (err) {
      setError('Network error while fetching transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions(currentPage);
  }, [currentPage]);

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      // Silent error handling for clipboard
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  // Using imported formatting functions from utils

  const calculateTotalValue = (tx: Transaction) => {
    return tx.vout.reduce((sum, output) => sum + output.value, 0);
  };

  const getTransactionType = (tx: Transaction) => {
    if (tx.vin[0]?.coinbase) return 'Coinbase';
    if (tx.vout.length === 0) return 'Burn';
    // Check if this is a stake reward (from enhanced transaction data)
    if ((tx as any).stakeRewardInfo?.isStakeReward) return 'Stake Reward';
    return 'Transfer';
  };

  const getScriptTypeColor = (type: string) => {
    switch (type) {
      case 'pubkeyhash':
        return 'bg-blue-500/20 text-blue-400';
      case 'scripthash':
        return 'bg-green-500/20 text-green-400';
      case 'witness_v0_keyhash':
        return 'bg-verus-blue/20 text-verus-blue';
      case 'witness_v0_scripthash':
        return 'bg-verus-teal/20 text-verus-teal';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'Coinbase':
        return 'bg-verus-teal/20 text-verus-teal';
      case 'Stake Reward':
        return 'bg-green-500/20 text-green-400';
      case 'Burn':
        return 'bg-red-500/20 text-red-400';
      case 'Transfer':
        return 'bg-blue-500/20 text-blue-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const totalPages = Math.ceil(totalTransactions / 20);

  if (loading && transactions.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-blue-200">Loading transactions...</span>
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

  return (
    <div className="space-y-6 text-white dark:text-white text-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Transactions Explorer</h2>
          <p className="text-blue-200 dark:text-blue-200 text-blue-600 text-sm mt-1">
            Explore Verus blockchain transactions and UTXO movements
          </p>
        </div>
        <div className="text-blue-200 dark:text-blue-200 text-blue-600 text-sm">
          Total Transactions: {formatTransactionCount(totalTransactions)}
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-slate-300 dark:border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Pulse className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <div className="text-white font-semibold">Total Transactions</div>
              <div className="text-blue-200 text-sm">
                {formatTransactionCount(totalTransactions)}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-slate-300 dark:border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-green-500/20">
              <Coins className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <div className="text-white font-semibold">Average Value</div>
              <div className="text-blue-200 text-sm">
                {transactions.length > 0
                  ? formatCryptoValue(
                      transactions.reduce(
                        (sum, tx) => sum + calculateTotalValue(tx),
                        0
                      ) / transactions.length
                    )
                  : '0 VRSC'}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-slate-300 dark:border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-verus-blue/20">
              <Hash className="h-5 w-5 text-verus-blue" />
            </div>
            <div>
              <div className="text-white font-semibold">Average Size</div>
              <div className="text-blue-200 text-sm">
                {transactions.length > 0
                  ? formatFileSize(
                      transactions.reduce((sum, tx) => sum + tx.size, 0) /
                        transactions.length
                    )
                  : '0 B'}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-slate-300 dark:border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-verus-teal/20">
              <Clock className="h-5 w-5 text-verus-teal" />
            </div>
            <div>
              <div className="text-white font-semibold">Latest Transaction</div>
              <div className="text-blue-200 text-sm">
                {transactions.length > 0
                  ? formatTime(transactions[0]?.time || 0)
                  : 'N/A'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-300 dark:border-slate-700">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Recent Transactions
        </h3>

        {transactions.length > 0 ? (
          <div className="space-y-4">
            {transactions.map((tx, index) => (
              <div
                key={`transactions-explorer-${tx.txid}`}
                className="bg-slate-800 rounded-lg p-4 border border-slate-700"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`px-2 py-1 rounded text-xs font-medium ${getTransactionTypeColor(getTransactionType(tx))}`}
                    >
                      {getTransactionType(tx)}
                    </div>
                    <button
                      onClick={() => copyToClipboard(tx.txid, `tx-${index}`)}
                      className="flex items-center space-x-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded transition-colors"
                    >
                      {copied === `tx-${index}` ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                      <span className="text-xs">Copy TXID</span>
                    </button>
                  </div>
                  <div className="text-blue-200 text-sm">
                    {formatTime(tx.time || 0)}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm mb-3">
                  <div>
                    <div className="text-blue-200 mb-1">Transaction ID</div>
                    <div className="text-white font-mono text-xs break-all">
                      {tx.txid}
                    </div>
                  </div>

                  <div>
                    <div className="text-blue-200 mb-1">Value</div>
                    <div className="text-white">
                      {formatCryptoValue(calculateTotalValue(tx))}
                    </div>
                  </div>

                  <div>
                    <div className="text-blue-200 mb-1">Size</div>
                    <div className="text-white">{formatFileSize(tx.size)}</div>
                  </div>

                  <div>
                    <div className="text-blue-200 mb-1">Confirmations</div>
                    <div className="text-white">{tx.confirmations || 0}</div>
                  </div>
                </div>

                {/* Stake Reward Information */}
                {(tx as any).stakeRewardInfo?.isStakeReward && (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 mb-3">
                    <div className="flex items-center space-x-2 mb-2">
                      <Coins className="h-4 w-4 text-green-400" />
                      <span className="text-green-400 font-semibold text-sm">
                        Stake Reward
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                      <div>
                        <div className="text-green-200 mb-1">Stake Amount</div>
                        <div className="text-white">
                          {formatCryptoValue(
                            (tx as any).stakeRewardInfo.stakeAmount || 0
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-green-200 mb-1">Reward Amount</div>
                        <div className="text-white">
                          {formatCryptoValue(
                            (tx as any).stakeRewardInfo.rewardAmount || 0
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-green-200 mb-1">Stake Age</div>
                        <div className="text-white">
                          {(
                            (tx as any).stakeRewardInfo.stakeAge || 0
                          ).toLocaleString()}{' '}
                          blocks
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Inputs and Outputs Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-blue-200 mb-1 flex items-center">
                      <ArrowLeft className="h-3 w-3 mr-1" />
                      Inputs ({tx.vin.length})
                    </div>
                    <div className="text-white text-xs">
                      {tx.vin.slice(0, 3).map((input, i) => (
                        <div key={i} className="font-mono break-all">
                          {input.coinbase
                            ? 'Coinbase'
                            : input.txid
                              ? `${input.txid.substring(0, 16)}...:${input.vout}`
                              : 'Unknown Input'}
                        </div>
                      ))}
                      {tx.vin.length > 3 && (
                        <div className="text-blue-300">
                          ... and {tx.vin.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="text-blue-200 mb-1 flex items-center">
                      <ArrowDown className="h-3 w-3 mr-1" />
                      Outputs ({tx.vout.length})
                    </div>
                    <div className="text-white text-xs">
                      {tx.vout.slice(0, 3).map((output, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between"
                        >
                          <span className="font-mono">
                            {output.scriptPubKey.addresses?.[0]?.substring(
                              0,
                              16
                            ) || 'Unknown'}
                            ...
                          </span>
                          <span className="text-green-400">
                            {formatCryptoValue(output.value)}
                          </span>
                        </div>
                      ))}
                      {tx.vout.length > 3 && (
                        <div className="text-blue-300">
                          ... and {tx.vout.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-blue-200">
            No transactions found
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <button
              onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
              className="flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowRight className="h-4 w-4 rotate-180" />
              <span>Previous</span>
            </button>

            <div className="text-blue-200 text-sm">
              Page {currentPage + 1} of {totalPages}
            </div>

            <button
              onClick={() =>
                setCurrentPage(Math.min(totalPages - 1, currentPage + 1))
              }
              disabled={currentPage >= totalPages - 1}
              className="flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>Next</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
