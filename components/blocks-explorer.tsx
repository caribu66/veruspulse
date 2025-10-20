'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useNavigationHistory } from '@/lib/hooks/use-navigation-history';
import {
  Database,
  Clock,
  Hash,
  Coins,
  ArrowRight,
  Copy,
  Check,
  WarningCircle,
  Shield,
  Hammer,
  Info,
  CaretLeft,
  CaretRight,
  Funnel,
  DownloadSimple,
  ArrowsDownUp,
  TrendUp,
  TrendDown,
} from '@phosphor-icons/react';
import {
  formatFriendlyNumber,
  formatCryptoValue,
  formatFileSize,
  formatDifficulty,
  formatDuration,
  formatBlockHeight,
  formatTransactionCount,
} from '@/lib/utils/number-formatting';

interface ValuePool {
  id: string;
  monitored: boolean;
  chainValue: number;
  chainValueZat: number;
  valueDelta: number;
  valueDeltaZat: number;
}

interface Vin {
  coinbase?: string;
  txid?: string;
  vout?: number;
  scriptSig?: {
    asm: string;
    hex: string;
  };
  sequence: number;
}

interface ScriptPubKey {
  asm: string;
  hex: string;
  reqSigs: number;
  type: string;
  addresses: string[];
}

interface Vout {
  value: number;
  n: number;
  scriptPubKey: ScriptPubKey;
}

interface Transaction {
  txid: string;
  version: number;
  locktime: number;
  vin: Vin[];
  vout: Vout[];
}

interface Block {
  hash: string;
  height: number;
  time: number;
  size: number;
  weight: number;
  version: number;
  nonce: number | string;
  bits: string;
  difficulty: number;
  chainwork: string;
  nTx: number;
  previousblockhash?: string;
  nextblockhash?: string;
  merkleroot: string;
  tx: Transaction[];
  modifier?: string;
  confirmations?: number;
  solution?: string;
  valuePools?: ValuePool[];
  anchor?: string;
  blocktype?: string;
  postarget?: string;
  chainstake?: string;
  reward?: number;
  rewardType?: string;
  stakeRewardInfo?: {
    isStakeReward: boolean;
    stakeAmount?: number;
    rewardAmount?: number;
    stakedInputs?: number;
    rewardOutputs?: number;
    stakeAge?: number;
    blockHeight?: number;
    blockType?: 'pos' | 'pow';
  };
  hasStakeReward?: boolean;
  stakeAmount?: number;
  stakeRewardAmount?: number;
  stakeAge?: number;
}

type SortField = 'time' | 'size' | 'nTx' | 'reward' | 'height';
type SortDirection = 'asc' | 'desc';
type FilterType = 'all' | 'pow' | 'pos';

export function BlocksExplorer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToHistory } = useNavigationHistory();
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalBlocks, setTotalBlocks] = useState(0);
  const [sortField, setSortField] = useState<SortField>('height');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [heavyMetrics, setHeavyMetrics] = useState(false);

  // Initialize page from URL parameters
  useEffect(() => {
    const pageParam = searchParams.get('page');
    if (pageParam) {
      const page = parseInt(pageParam, 10);
      if (!isNaN(page) && page >= 0) {
        setCurrentPage(page);
      }
    }
  }, [searchParams]);

  // Update URL when page changes
  const updatePage = useCallback(
    (newPage: number) => {
      setCurrentPage(newPage);
      const params = new URLSearchParams(searchParams.toString());
      if (newPage === 0) {
        params.delete('page');
      } else {
        params.set('page', newPage.toString());
      }
      const newUrl = params.toString() ? `?${params.toString()}` : '';
      router.replace(newUrl, { scroll: false });
    },
    [searchParams, router]
  );

  const fetchBlocks = useCallback(
    async (page: number = 0) => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `/api/latest-blocks?limit=20&offset=${page * 20}${heavyMetrics ? '&metrics=1' : ''}`
        );
        const result = await response.json();

        if (result.success && result.data) {
          setBlocks(result.data.blocks || []);
          setTotalBlocks(result.data.totalBlocks || 0);
        } else {
          setError(result.error || 'Failed to fetch blocks');
        }
      } catch (err) {
        setError('Network error while fetching blocks');
      } finally {
        setLoading(false);
      }
    },
    [heavyMetrics]
  );

  useEffect(() => {
    fetchBlocks(currentPage);
  }, [fetchBlocks, currentPage]);

  // Calculate total pages based on available blocks, not total blockchain height
  const totalPages = Math.max(1, Math.ceil(totalBlocks / 20));

  // Reset to first page when filters change
  useEffect(() => {
    if (currentPage > 0) {
      updatePage(0);
    }
  }, [filterType, sortField, sortDirection, currentPage, updatePage]);

  // Add keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return; // Don't interfere with form inputs
      }

      if (e.key === 'ArrowLeft' && currentPage > 0) {
        updatePage(currentPage - 1);
      } else if (e.key === 'ArrowRight' && currentPage < totalPages - 1) {
        updatePage(currentPage + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, totalPages, updatePage]);

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

  const formatShortHex = (hex: string, length: number = 8) => {
    if (!hex || hex.length <= length * 2) return hex;
    return `${hex.substring(0, length)}...${hex.substring(hex.length - length)}`;
  };

  const formatWU = (weight: number) => {
    if (weight === 0) return '0 WU';
    const k = 1000;
    const sizes = ['WU', 'KWU', 'MWU'];
    const i = Math.floor(Math.log(weight) / Math.log(k));
    return parseFloat((weight / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const analyzeTransactions = (tx: Transaction[]) => {
    if (!tx || tx.length === 0) {
      return {
        coinbaseCount: 0,
        nonCoinbaseCount: 0,
        transparentOutputs: 0,
        shieldedOutputs: 0,
        opReturnCount: 0,
        totalOutputs: 0,
        uniqueAddresses: new Set(),
        totalValue: 0,
        recipientAddresses: new Map(),
      };
    }

    let coinbaseCount = 0;
    let nonCoinbaseCount = 0;
    let transparentOutputs = 0;
    let shieldedOutputs = 0;
    let opReturnCount = 0;
    let totalOutputs = 0;
    const uniqueAddresses = new Set<string>();
    let totalValue = 0;
    const recipientAddresses = new Map<string, number>();

    tx.forEach(transaction => {
      // Check if coinbase transaction
      const isCoinbase =
        transaction.vin && transaction.vin.some(input => input.coinbase);
      if (isCoinbase) {
        coinbaseCount++;
      } else {
        nonCoinbaseCount++;
      }

      // Analyze outputs
      if (transaction.vout) {
        transaction.vout.forEach(output => {
          totalOutputs++;
          totalValue += output.value || 0;

          // Check for OP_RETURN (usually has no addresses and specific script types)
          if (output.scriptPubKey) {
            if (
              output.scriptPubKey.type === 'nulldata' ||
              (output.scriptPubKey.asm &&
                output.scriptPubKey.asm.includes('OP_RETURN'))
            ) {
              opReturnCount++;
            }

            // Count addresses
            if (
              output.scriptPubKey.addresses &&
              output.scriptPubKey.addresses.length > 0
            ) {
              transparentOutputs++;
              output.scriptPubKey.addresses.forEach(addr => {
                uniqueAddresses.add(addr);
                recipientAddresses.set(
                  addr,
                  (recipientAddresses.get(addr) || 0) + (output.value || 0)
                );
              });
            } else {
              // Likely shielded output (no addresses)
              shieldedOutputs++;
            }
          }
        });
      }
    });

    return {
      coinbaseCount,
      nonCoinbaseCount,
      transparentOutputs,
      shieldedOutputs,
      opReturnCount,
      totalOutputs,
      uniqueAddresses,
      totalValue,
      recipientAddresses,
    };
  };

  const getTopRecipients = (
    recipientMap: Map<string, number>,
    count: number = 2
  ) => {
    return Array.from(recipientMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, count)
      .map(([addr, value]) => ({ addr, value }));
  };

  const calculateTemporalMetrics = (
    currentBlock: Block,
    previousBlock: Block | null
  ) => {
    if (!previousBlock) {
      return {
        timeSincePrevious: null,
        intervalDelta: null,
        difficultyDelta: null,
      };
    }

    const timeSincePrevious = currentBlock.time - previousBlock.time;
    const intervalDelta = timeSincePrevious - 120; // 120s target
    const difficultyDelta =
      previousBlock.difficulty > 0
        ? ((currentBlock.difficulty - previousBlock.difficulty) /
            previousBlock.difficulty) *
          100
        : 0;

    return {
      timeSincePrevious,
      intervalDelta,
      difficultyDelta,
    };
  };

  const sortBlocks = (
    blocks: Block[],
    field: SortField,
    direction: SortDirection
  ) => {
    return [...blocks].sort((a, b) => {
      let aValue: number;
      let bValue: number;

      switch (field) {
        case 'time':
          aValue = a.time;
          bValue = b.time;
          break;
        case 'size':
          aValue = a.size;
          bValue = b.size;
          break;
        case 'nTx':
          aValue = a.nTx;
          bValue = b.nTx;
          break;
        case 'reward':
          aValue = a.reward || 0;
          bValue = b.reward || 0;
          break;
        case 'height':
        default:
          aValue = a.height;
          bValue = b.height;
          break;
      }

      return direction === 'asc' ? aValue - bValue : bValue - aValue;
    });
  };

  const filterBlocks = (blocks: Block[], filter: FilterType) => {
    if (filter === 'all') return blocks;

    return blocks.filter(block => {
      const isPoS = block.rewardType === 'pos' || block.blocktype === 'minted';
      return filter === 'pos' ? isPoS : !isPoS;
    });
  };

  const exportToCSV = () => {
    const filteredBlocks = filterBlocks(blocks, filterType);
    const sortedBlocks = sortBlocks(filteredBlocks, sortField, sortDirection);

    const headers = [
      'Height',
      'Hash',
      'Time',
      'Size',
      'Transactions',
      'Reward',
      'Type',
      'Difficulty',
    ];
    const csvContent = [
      headers.join(','),
      ...sortedBlocks.map(block =>
        [
          block.height,
          block.hash,
          new Date(block.time * 1000).toISOString(),
          block.size,
          block.nTx,
          block.reward || 0,
          block.rewardType === 'pos' || block.blocktype === 'minted'
            ? 'PoS'
            : 'PoW',
          block.difficulty,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `verus-blocks-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToJSON = () => {
    const filteredBlocks = filterBlocks(blocks, filterType);
    const sortedBlocks = sortBlocks(filteredBlocks, sortField, sortDirection);

    const jsonContent = JSON.stringify(sortedBlocks, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `verus-blocks-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading && blocks.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-blue-200">Loading blocks...</span>
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
    <div className="space-y-6 text-gray-900 dark:text-white">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Blocks Explorer</h2>
          <p className="text-blue-200 dark:text-blue-200 text-blue-600 text-sm mt-1">
            Explore the Verus blockchain blocks and transactions
          </p>
        </div>
        <div className="text-blue-200 dark:text-blue-200 text-blue-600 text-sm">
          Total Blocks: {formatBlockHeight(totalBlocks)}
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-slate-300 dark:border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Database className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <div className="text-gray-900 dark:text-white font-semibold">Total Blocks</div>
              <div className="text-blue-600 dark:text-blue-200 text-sm">
                {formatBlockHeight(totalBlocks)}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-slate-300 dark:border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-green-500/20">
              <Hash className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <div className="text-gray-900 dark:text-white font-semibold">Average Size</div>
              <div className="text-blue-600 dark:text-blue-200 text-sm">
                {blocks.length > 0
                  ? formatFileSize(
                      blocks.reduce((sum, block) => sum + block.size, 0) /
                        blocks.length
                    )
                  : '0 B'}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-slate-300 dark:border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-verus-blue/20">
              <Coins className="h-5 w-5 text-verus-blue" />
            </div>
            <div>
              <div className="text-gray-900 dark:text-white font-semibold">Total Size</div>
              <div className="text-blue-600 dark:text-blue-200 text-sm">
                {blocks.length > 0
                  ? formatFileSize(
                      blocks.reduce((sum, block) => sum + block.size, 0)
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
              <div className="text-gray-900 dark:text-white font-semibold">Latest Block</div>
              <div className="text-blue-600 dark:text-blue-200 text-sm">
                {blocks.length > 0 ? formatTime(blocks[0]?.time || 0) : 'N/A'}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-slate-300 dark:border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-verus-teal/20">
              <Coins className="h-5 w-5 text-verus-teal" />
            </div>
            <div>
              <div className="text-gray-900 dark:text-white font-semibold">Total Rewards</div>
              <div className="text-blue-600 dark:text-blue-200 text-sm">
                {blocks.length > 0
                  ? `${blocks
                      .filter(b => b.reward && b.reward > 0)
                      .reduce((sum, block) => sum + (block.reward || 0), 0)
                      .toFixed(8)} VRSC`
                  : '0 VRSC'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Blocks Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-300 dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Recent Blocks</h3>

          {/* Controls */}
          <div className="flex items-center space-x-3">
            {/* Funnel Toggle */}
            <div className="flex items-center space-x-2">
              <Funnel className="h-4 w-4 text-blue-400" />
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value as FilterType)}
                className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-sm text-gray-900 dark:text-white"
              >
                <option value="all">All Blocks</option>
                <option value="pow">PoW Only</option>
                <option value="pos">PoS Only</option>
              </select>
            </div>

            {/* Sort Controls */}
            <div className="flex items-center space-x-2">
              <ArrowsDownUp className="h-4 w-4 text-blue-400" />
              <select
                value={sortField}
                onChange={e => setSortField(e.target.value as SortField)}
                className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-sm text-gray-900 dark:text-white"
              >
                <option value="height">Height</option>
                <option value="time">Time</option>
                <option value="size">Size</option>
                <option value="nTx">Transactions</option>
                <option value="reward">Reward</option>
              </select>
              <button
                onClick={() =>
                  setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
                }
                className="p-1 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded transition-colors"
                title={`Sort ${sortDirection === 'asc' ? 'Descending' : 'Ascending'}`}
              >
                {sortDirection === 'asc' ? (
                  <TrendUp className="h-4 w-4" />
                ) : (
                  <TrendDown className="h-4 w-4" />
                )}
              </button>
            </div>

            {/* Heavy Metrics Toggle */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setHeavyMetrics(!heavyMetrics)}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  heavyMetrics
                    ? 'bg-verus-blue/20 text-verus-blue border border-verus-blue/30'
                    : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700'
                }`}
                title="Enable heavy metrics (fees, miner identity, etc.)"
              >
                {heavyMetrics ? 'Heavy Metrics ON' : 'Heavy Metrics'}
              </button>
            </div>

            {/* Export Controls */}
            <div className="flex items-center space-x-2">
              <DownloadSimple className="h-4 w-4 text-blue-400" />
              <button
                onClick={exportToCSV}
                className="px-2 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 text-xs rounded transition-colors"
              >
                CSV
              </button>
              <button
                onClick={exportToJSON}
                className="px-2 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-xs rounded transition-colors"
              >
                JSON
              </button>
            </div>
          </div>
        </div>

        {blocks.length > 0 ? (
          <div className="space-y-4">
            {(() => {
              const filteredBlocks = filterBlocks(blocks, filterType);
              const sortedBlocks = sortBlocks(
                filteredBlocks,
                sortField,
                sortDirection
              );

              return sortedBlocks.map((block, index) => {
                const previousBlock =
                  index < sortedBlocks.length - 1
                    ? sortedBlocks[index + 1]
                    : null;
                const temporalMetrics = calculateTemporalMetrics(
                  block,
                  previousBlock
                );

                return (
                  <div
                    key={`blocks-explorer-${block.hash}`}
                    className="bg-white dark:bg-slate-800 rounded-lg p-4 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 hover:border-verus-blue/60"
                    onClick={() => {
                      // Add current page to navigation history before navigating
                      const currentUrl = window.location.pathname + window.location.search;
                      addToHistory(currentUrl);
                      router.push(`/block/${block.hash}`);
                    }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        {/* Navigation Arrows */}
                        <div className="flex items-center space-x-1">
                          {index < sortedBlocks.length - 1 && (
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                const prevBlock = sortedBlocks[index + 1];
                                if (prevBlock) {
                                  const currentUrl = window.location.pathname + window.location.search;
                                  addToHistory(currentUrl);
                                  router.push(`/block/${prevBlock.hash}`);
                                }
                              }}
                              className="p-1 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded transition-colors"
                              title={`Previous Block #${sortedBlocks[index + 1]?.height}`}
                            >
                              <CaretLeft className="h-3 w-3" />
                            </button>
                          )}
                          <div className="text-gray-900 dark:text-white font-semibold">
                            #{block.height}
                          </div>
                          {index > 0 && (
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                const nextBlock = sortedBlocks[index - 1];
                                if (nextBlock) {
                                  const currentUrl = window.location.pathname + window.location.search;
                                  addToHistory(currentUrl);
                                  router.push(`/block/${nextBlock.hash}`);
                                }
                              }}
                              className="p-1 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded transition-colors"
                              title={`Next Block #${sortedBlocks[index - 1]?.height}`}
                            >
                              <CaretRight className="h-3 w-3" />
                            </button>
                          )}
                        </div>

                        {/* PoS/PoW Badge */}
                        {(block.rewardType || block.blocktype) && (
                          <div
                            className={`flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium ${
                              block.rewardType === 'pos' ||
                              block.blocktype === 'minted'
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                : 'bg-verus-cyan/20 text-verus-cyan border border-orange-500/30'
                            }`}
                          >
                            {block.rewardType === 'pos' ||
                            block.blocktype === 'minted' ? (
                              <Shield className="h-3 w-3" />
                            ) : (
                              <Hammer className="h-3 w-3" />
                            )}
                            <span>
                              {block.rewardType === 'pos' ||
                              block.blocktype === 'minted'
                                ? 'PoS'
                                : 'PoW'}
                            </span>
                          </div>
                        )}

                        {/* Quick Copy Buttons */}
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              copyToClipboard(
                                block.height.toString(),
                                `height-${index}`
                              );
                            }}
                            className="flex items-center space-x-1 px-2 py-1 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded transition-colors"
                            title="Copy Height"
                          >
                            {copied === `height-${index}` ? (
                              <Check className="h-3 w-3" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                            <span className="text-xs">H</span>
                          </button>
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              copyToClipboard(block.hash, `hash-${index}`);
                            }}
                            className="flex items-center space-x-1 px-2 py-1 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded transition-colors"
                            title="Copy Hash"
                          >
                            {copied === `hash-${index}` ? (
                              <Check className="h-3 w-3" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                            <span className="text-xs">Hash</span>
                          </button>
                        </div>
                      </div>
                      <div className="text-blue-200 text-sm">
                        {formatTime(block.time)}
                      </div>
                    </div>

                    {/* Compact Metadata Sub-row */}
                    <div className="flex items-center space-x-4 text-xs text-gray-400 mb-3 pb-2 border-b border-white/5">
                      {block.confirmations !== undefined && (
                        <div className="flex items-center space-x-1">
                          <Info className="h-3 w-3" />
                          <span>
                            {block.confirmations.toLocaleString()} conf
                          </span>
                        </div>
                      )}
                      {block.weight !== undefined && (
                        <div className="flex items-center space-x-1">
                          <span>Weight: {formatWU(block.weight)}</span>
                        </div>
                      )}
                      <div className="flex items-center space-x-1">
                        <span>v{block.version}</span>
                      </div>
                      {block.chainwork && (
                        <div
                          className="flex items-center space-x-1 cursor-help"
                          title={`Chainwork: ${block.chainwork}`}
                        >
                          <span>
                            Work: {formatShortHex(block.chainwork, 6)}
                          </span>
                        </div>
                      )}
                      {block.bits && (
                        <div
                          className="flex items-center space-x-1 cursor-help"
                          title={`Bits: ${block.bits}`}
                        >
                          <span>Bits: {formatShortHex(block.bits, 4)}</span>
                        </div>
                      )}
                      {block.nonce && (
                        <div
                          className="flex items-center space-x-1 cursor-help"
                          title={`Nonce: ${block.nonce}`}
                        >
                          <span>
                            Nonce:{' '}
                            {typeof block.nonce === 'string'
                              ? formatShortHex(block.nonce, 4)
                              : block.nonce}
                          </span>
                        </div>
                      )}

                      {/* Temporal Metrics */}
                      {temporalMetrics.timeSincePrevious !== null && (
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span
                            className={
                              temporalMetrics.intervalDelta &&
                              temporalMetrics.intervalDelta > 0
                                ? 'text-red-400'
                                : 'text-green-400'
                            }
                          >
                            {temporalMetrics.timeSincePrevious}s
                            {temporalMetrics.intervalDelta !== null && (
                              <span className="text-gray-500">
                                ({temporalMetrics.intervalDelta > 0 ? '+' : ''}
                                {temporalMetrics.intervalDelta.toFixed(0)}s)
                              </span>
                            )}
                          </span>
                        </div>
                      )}

                      {/* Difficulty Delta */}
                      {temporalMetrics.difficultyDelta !== null && (
                        <div className="flex items-center space-x-1">
                          {temporalMetrics.difficultyDelta > 0 ? (
                            <TrendUp className="h-3 w-3 text-red-400" />
                          ) : (
                            <TrendDown className="h-3 w-3 text-green-400" />
                          )}
                          <span
                            className={
                              temporalMetrics.difficultyDelta > 0
                                ? 'text-red-400'
                                : 'text-green-400'
                            }
                          >
                            {temporalMetrics.difficultyDelta > 0 ? '+' : ''}
                            {temporalMetrics.difficultyDelta.toFixed(1)}%
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Value Pool Deltas */}
                    {block.valuePools && block.valuePools.length > 0 && (
                      <div className="flex items-center space-x-2 mb-3">
                        <span className="text-xs text-blue-200">Pools:</span>
                        {block.valuePools.map(pool => (
                          <div
                            key={pool.id}
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              pool.valueDelta > 0
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                : pool.valueDelta < 0
                                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                  : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                            }`}
                            title={`${pool.id} pool: ${pool.valueDelta > 0 ? '+' : ''}${pool.valueDelta.toFixed(8)} VRSC`}
                          >
                            {pool.id === 'sprout'
                              ? 'S'
                              : pool.id === 'sapling'
                                ? 'Z'
                                : 'T'}
                            : {pool.valueDelta > 0 ? '+' : ''}
                            {pool.valueDelta.toFixed(2)}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Heavy Metrics */}
                    {heavyMetrics && (block as any).feeTotal !== undefined && (
                      <div className="flex items-center space-x-2 mb-3">
                        <span className="text-xs text-blue-200">
                          Heavy Metrics:
                        </span>
                        <div className="flex items-center space-x-1 px-2 py-1 bg-verus-blue/20 text-verus-blue text-xs rounded">
                          <span>
                            Fees: {(block as any).feeTotal?.toFixed(6) || '0'}{' '}
                            VRSC
                          </span>
                        </div>
                        <div className="flex items-center space-x-1 px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">
                          <span>
                            Fee/Byte:{' '}
                            {(
                              (block as any).feePerByteAvg * 100000000
                            )?.toFixed(0) || '0'}{' '}
                            sat/B
                          </span>
                        </div>
                        {(block as any).coinbasePayout && (
                          <div className="flex items-center space-x-1 px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">
                            <span>
                              {(block as any).minerType === 'staker'
                                ? '🛡️'
                                : '⛏️'}
                            </span>
                            <span>
                              {(block as any).isShieldedPayout
                                ? 'Shielded'
                                : `${(block as any).coinbasePayout?.substring(0, 8)}...${(block as any).coinbasePayout?.substring((block as any).coinbasePayout.length - 4)}`}
                            </span>
                          </div>
                        )}
                        {(block as any).feeApproximate && (
                          <div className="flex items-center space-x-1 px-2 py-1 bg-verus-teal/20 text-verus-teal text-xs rounded">
                            <span>~</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Transaction Analysis */}
                    {block.tx &&
                      block.tx.length > 0 &&
                      (() => {
                        const analysis = analyzeTransactions(block.tx);
                        const topRecipients = getTopRecipients(
                          analysis.recipientAddresses,
                          2
                        );
                        const avgTxSize = block.size / block.tx.length;
                        const txDensity = (
                          block.tx.length /
                          (block.size / 1024)
                        ).toFixed(1);

                        return (
                          <div className="space-y-2 mb-3">
                            {/* Transaction Mix */}
                            <div className="flex items-center space-x-4 text-xs text-gray-400">
                              <div className="flex items-center space-x-1">
                                <span>Tx Mix:</span>
                                <span className="text-blue-300">
                                  {analysis.coinbaseCount} CB
                                </span>
                                <span className="text-gray-500">•</span>
                                <span className="text-gray-900 dark:text-white">
                                  {analysis.nonCoinbaseCount} reg
                                </span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <span>Outputs:</span>
                                <span className="text-green-300">
                                  {analysis.transparentOutputs} T
                                </span>
                                <span className="text-gray-500">•</span>
                                <span className="text-purple-300">
                                  {analysis.shieldedOutputs} Z
                                </span>
                              </div>
                              {analysis.opReturnCount > 0 && (
                                <div className="flex items-center space-x-1">
                                  <span className="text-orange-300">
                                    {analysis.opReturnCount} OP_RETURN
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Block Sizing Metrics */}
                            <div className="flex items-center space-x-4 text-xs text-gray-400">
                              <div className="flex items-center space-x-1">
                                <span>Density:</span>
                                <span className="text-gray-900 dark:text-white">
                                  {txDensity} tx/kB
                                </span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <span>Avg Tx Size:</span>
                                <span className="text-gray-900 dark:text-white">
                                  {formatFileSize(avgTxSize)}
                                </span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <span>Unique Addr:</span>
                                <span className="text-gray-900 dark:text-white">
                                  {analysis.uniqueAddresses.size}
                                </span>
                              </div>
                            </div>

                            {/* Top Recipients */}
                            {topRecipients.length > 0 && (
                              <div className="flex items-center space-x-2 text-xs">
                                <span className="text-blue-200">
                                  Top Recipients:
                                </span>
                                {topRecipients.map((recipient, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-center space-x-1"
                                  >
                                    <span className="text-white font-mono">
                                      {recipient.addr.substring(0, 8)}...
                                      {recipient.addr.substring(
                                        recipient.addr.length - 4
                                      )}
                                    </span>
                                    <span className="text-green-300">
                                      ({recipient.value.toFixed(2)} VRSC)
                                    </span>
                                    {idx < topRecipients.length - 1 && (
                                      <span className="text-gray-500">•</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-sm">
                      <div>
                        <div className="text-blue-600 dark:text-blue-200 mb-1">Hash</div>
                        <div className="text-gray-900 dark:text-white font-mono text-xs break-all">
                          {block.hash}
                        </div>
                      </div>

                      <div>
                        <div className="text-blue-600 dark:text-blue-200 mb-1">Transactions</div>
                        <div className="text-gray-900 dark:text-white">
                          {formatTransactionCount(block.nTx)}
                        </div>
                      </div>

                      <div>
                        <div className="text-blue-600 dark:text-blue-200 mb-1">Block Reward</div>
                        <div className="text-gray-900 dark:text-white">
                          {block.reward !== undefined && block.reward > 0 ? (
                            <div className="flex flex-col space-y-1">
                              <div className="flex items-center space-x-1">
                                <Coins className="h-4 w-4 text-verus-teal" />
                                <span className="font-semibold text-verus-teal">
                                  {block.reward.toFixed(8)} VRSC
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-1 text-gray-400">
                              <Coins className="h-3 w-3" />
                              <span className="text-xs">No reward data</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="text-blue-600 dark:text-blue-200 mb-1">Size</div>
                        <div className="text-gray-900 dark:text-white">
                          {formatFileSize(block.size)}
                        </div>
                      </div>

                      <div>
                        <div className="text-blue-600 dark:text-blue-200 mb-1">Difficulty</div>
                        <div className="text-gray-900 dark:text-white">
                          {formatDifficulty(block.difficulty)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        ) : (
          <div className="text-center py-8 text-blue-200">No blocks found</div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => updatePage(0)}
                disabled={currentPage === 0}
                className="flex items-center space-x-2 px-3 py-2 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm text-gray-900 dark:text-white"
                title="Go to first page (latest blocks)"
              >
                <span>First</span>
              </button>
              <button
                onClick={() => updatePage(Math.max(0, currentPage - 1))}
                disabled={currentPage === 0}
                className="flex items-center space-x-2 px-3 py-2 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm text-gray-900 dark:text-white"
              >
                <ArrowRight className="h-4 w-4 rotate-180" />
                <span>Previous</span>
              </button>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-blue-200 text-sm">
                Page {currentPage + 1} of {totalPages}
              </div>

              {/* Page numbers for better navigation */}
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i;
                  } else if (currentPage < 2) {
                    pageNum = i;
                  } else if (currentPage >= totalPages - 3) {
                    pageNum = totalPages - 5 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => updatePage(pageNum)}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        currentPage === pageNum
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {pageNum + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() =>
                  updatePage(Math.min(totalPages - 1, currentPage + 1))
                }
                disabled={currentPage >= totalPages - 1}
                className="flex items-center space-x-2 px-3 py-2 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm text-gray-900 dark:text-white"
              >
                <span>Next</span>
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => updatePage(totalPages - 1)}
                disabled={currentPage >= totalPages - 1}
                className="flex items-center space-x-2 px-3 py-2 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm text-gray-900 dark:text-white"
                title="Go to last page (earliest blocks including genesis)"
              >
                <span>Last</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
