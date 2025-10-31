'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import {
  Hash,
  Clock,
  Coins,
  ArrowRight,
  ArrowSquareOut,
  ArrowsClockwise,
  CaretRight,
  Pulse,
  TrendUp,
  X,
  Sparkle,
  Lightning,
  Bell,
  Shield,
  Hammer,
  Network,
  CurrencyDollar,
} from '@phosphor-icons/react';
import Link from 'next/link';
import './animations/new-block-animations.css';
import {
  formatDifficulty,
  formatHashRate,
  formatCryptoValue,
  formatFileSize,
} from '@/lib/utils/number-formatting';
import { logger } from '@/lib/utils/logger';

interface Block {
  hash: string;
  height: number;
  time: number;
  size: number;
  nTx: number;
  difficulty: number;
  blocktype?: string;
  validationtype?: string;
  confirmations?: number;
  reward?: number;
  rewardType?: string;
  previousblockhash?: string;
  nextblockhash?: string;
  merkleroot?: string;
  nonce?: string;
  bits?: string;
  chainwork?: string;
  solution?: string;
  valuePools?: Array<{
    id: string;
    monitored: boolean;
    chainValue: number;
    chainValueZat: number;
    valueDelta: number;
    valueDeltaZat: number;
  }>;
  anchor?: string;
  chainstake?: string;
  postarget?: string;
  poshashbh?: string;
  poshashtx?: string;
  possourcetxid?: string;
  possourcevoutnum?: number;
  segid?: number;
  finalsaplingroot?: string;
  version?: number;
  versionHex?: string;
  mediantime?: number;
  proofroot?: {
    version: number;
    type: number;
    systemid: string;
    height: number;
    stateroot: string;
    blockhash: string;
    power: string;
  };
}

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

interface UnifiedLiveCardProps {
  className?: string;
}

export function UnifiedLiveCard({
  className = '',
}: UnifiedLiveCardProps) {
  const tCommon = useTranslations('common');
  const tTime = useTranslations('time');
  const tBlocks = useTranslations('blocks');
  const tNetwork = useTranslations('network');
  const tStaking = useTranslations('staking');
  // Tab state
  const [activeTab, setActiveTab] = useState<'blocks' | 'mempool'>('blocks');

  // Blocks state
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [blocksLoading, setBlocksLoading] = useState(true);
  const [blocksError, setBlocksError] = useState<string | null>(null);
  const [blocksLastUpdate, setBlocksLastUpdate] = useState<Date | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);
  const [newBlockNotification, setNewBlockNotification] =
    useState<Block | null>(null);
  const [isNewBlock, setIsNewBlock] = useState(false);
  const [blockPulseAnimation, setBlockPulseAnimation] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{
    verificationProgress: number;
    isSynced: boolean;
    syncPercentage: number;
  } | null>(null);

  // Mempool state
  const [transactions, setTransactions] = useState<MempoolTransaction[]>([]);
  const [mempoolLoading, setMempoolLoading] = useState(true);
  const [mempoolError, setMempoolError] = useState<string | null>(null);
  const [mempoolLastUpdate, setMempoolLastUpdate] = useState<Date | null>(null);
  const [selectedTransaction, setSelectedTransaction] =
    useState<MempoolTransaction | null>(null);
  const [newTransactionNotification, setNewTransactionNotification] =
    useState<MempoolTransaction | null>(null);
  const [isNewTransaction, setIsNewTransaction] = useState(false);
  const [mempoolPulseAnimation, setMempoolPulseAnimation] = useState(false);

  // Refs for tracking previous data
  const previousBlocksRef = useRef<Block[]>([]);
  const previousTransactionsRef = useRef<MempoolTransaction[]>([]);
  const blockNotificationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const transactionNotificationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch blocks
  const fetchLatestBlocks = async () => {
    try {
      setBlocksLoading(true);
      setBlocksError(null);

      const response = await fetch('/api/latest-blocks?limit=8');
      const result = await response.json();

      if (result.success && result.data && result.data.blocks) {
        const newBlocks = result.data.blocks;
        const syncStatus = result.data.syncStatus;

        setSyncStatus(syncStatus);

        if (syncStatus && !syncStatus.isSynced) {
          logger.warn(
            `Blockchain sync: ${syncStatus.syncPercentage}% - blocks may not be current`
          );
        }

        // Check for new blocks
        if (previousBlocksRef.current.length > 0) {
          const latestPreviousBlock = previousBlocksRef.current[0];
          const latestNewBlock = newBlocks[0];

          if (
            latestNewBlock &&
            latestPreviousBlock &&
            latestNewBlock.hash !== latestPreviousBlock.hash
          ) {
            // New block detected!
            setNewBlockNotification(latestNewBlock);
            setIsNewBlock(true);
            setBlockPulseAnimation(true);

            if (blockNotificationTimeoutRef.current) {
              clearTimeout(blockNotificationTimeoutRef.current);
            }

            blockNotificationTimeoutRef.current = setTimeout(() => {
              setNewBlockNotification(null);
              setIsNewBlock(false);
              setBlockPulseAnimation(false);
            }, 4000);
          }
        }

        setBlocks(newBlocks);
        previousBlocksRef.current = newBlocks;
        setBlocksLastUpdate(new Date());
      } else {
        setBlocksError('Failed to fetch blocks');
      }
    } catch (err) {
      setBlocksError('Network error');
      logger.error('Error fetching blocks:', err);
    } finally {
      setBlocksLoading(false);
    }
  };

  // Fetch mempool transactions
  const fetchMempoolTransactions = async () => {
    try {
      setMempoolLoading(true);
      setMempoolError(null);

      const response = await fetch('/api/mempool/transactions?limit=8');
      const result = await response.json();

      if (result.success && result.data && result.data.transactions) {
        const newTransactions = result.data.transactions;

        // Check for new transactions
        if (previousTransactionsRef.current.length > 0) {
          const latestPreviousTransaction = previousTransactionsRef.current[0];
          const latestNewTransaction = newTransactions[0];

          if (
            latestNewTransaction &&
            latestPreviousTransaction &&
            latestNewTransaction.txid !== latestPreviousTransaction.txid
          ) {
            // New transaction detected!
            setNewTransactionNotification(latestNewTransaction);
            setIsNewTransaction(true);
            setMempoolPulseAnimation(true);

            if (transactionNotificationTimeoutRef.current) {
              clearTimeout(transactionNotificationTimeoutRef.current);
            }

            transactionNotificationTimeoutRef.current = setTimeout(() => {
              setNewTransactionNotification(null);
              setIsNewTransaction(false);
              setMempoolPulseAnimation(false);
            }, 4000);
          }
        }

        setTransactions(newTransactions);
        previousTransactionsRef.current = newTransactions;
        setMempoolLastUpdate(new Date());
      } else {
        setMempoolError('Failed to fetch mempool transactions');
      }
    } catch (err) {
      setMempoolError('Network error');
      logger.error('Error fetching mempool transactions:', err);
    } finally {
      setMempoolLoading(false);
    }
  };

  // Setup intervals
  useEffect(() => {
    fetchLatestBlocks();
    fetchMempoolTransactions();

    const blocksInterval = setInterval(fetchLatestBlocks, 60000); // 60 seconds
    const mempoolInterval = setInterval(fetchMempoolTransactions, 45000); // 45 seconds

    return () => {
      clearInterval(blocksInterval);
      clearInterval(mempoolInterval);
      if (blockNotificationTimeoutRef.current) {
        clearTimeout(blockNotificationTimeoutRef.current);
      }
      if (transactionNotificationTimeoutRef.current) {
        clearTimeout(transactionNotificationTimeoutRef.current);
      }
      previousBlocksRef.current = [];
      previousTransactionsRef.current = [];
    };
  }, []);

  // Utility functions
  const formatTime = (timestamp: number) => {
    const now = Date.now() / 1000;
    const diff = now - timestamp;

    if (diff < 60) return `${Math.floor(diff)}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatShortHash = (hash: string, length: number = 8) => {
    if (!hash || hash.length <= length * 2) return hash;
    return `${hash.substring(0, length)}...${hash.substring(hash.length - length)}`;
  };

  const getBlockTypeColor = (blocktype?: string, validationtype?: string) => {
    if (validationtype === 'stake' || blocktype === 'minted') {
      return 'text-green-400 bg-green-500/10 border-green-500/20';
    }
    return 'text-blue-400 bg-verus-cyan/10 border-verus-cyan/20';
  };

  const getBlockTypeIcon = (blocktype?: string, validationtype?: string) => {
    if (validationtype === 'stake' || blocktype === 'minted') {
      return <Shield className="h-3 w-3" />;
    }
    return <Hammer className="h-3 w-3" />;
  };

  const getPriorityColor = (priority: number) => {
    if (priority > 1000)
      return 'text-green-400 bg-green-500/10 border-green-500/20';
    if (priority > 100)
      return 'text-green-400 bg-green-500/10 border-green-500/20';
    return 'text-verus-blue bg-verus-blue/10 border-verus-blue/40';
  };

  // Get current state based on active tab
  const currentLoading =
    activeTab === 'blocks' ? blocksLoading : mempoolLoading;
  const currentError = activeTab === 'blocks' ? blocksError : mempoolError;
  const currentLastUpdate =
    activeTab === 'blocks' ? blocksLastUpdate : mempoolLastUpdate;

  // Error state
  if (currentError) {
    return (
      <div
        className={`bg-red-500/10 border border-red-500/20 rounded-xl p-6 ${className}`}
      >
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-red-500/20">
            <Pulse className="h-5 w-5 text-red-400" />
          </div>
          <div>
            <div className="text-red-400 font-semibold">
              Error Loading {activeTab === 'blocks' ? 'Blocks' : 'Mempool'}
            </div>
            <div className="text-red-300 text-sm">{currentError}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-white dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-700 p-6 transition-all duration-500 ease-in-out ${className}`}
    >
      {/* Enhanced New Block Notification */}
      {activeTab === 'blocks' && newBlockNotification && (
        <div className="notification-toast-in mb-4 p-4 bg-slate-800 border border-verus-green/40 rounded-lg relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none" />
          <div className="flex items-center space-x-3 relative z-10">
            <div className="p-2 rounded-full bg-green-500/20 sparkle-icon">
              <Sparkle className="h-4 w-4 text-green-400 transition-all duration-300 ease-in-out" />
            </div>
            <div className="flex-1">
              <div className="text-green-400 font-semibold text-sm">
                New Block Mined!
              </div>
              <div className="text-white text-xs">
                Block #{newBlockNotification.height} •{' '}
                {formatTime(newBlockNotification.time)}
              </div>
            </div>
            <button
              onClick={() => {
                setNewBlockNotification(null);
                setIsNewBlock(false);
                setBlockPulseAnimation(false);
                if (blockNotificationTimeoutRef.current) {
                  clearTimeout(blockNotificationTimeoutRef.current);
                }
              }}
              className="p-1 rounded-full hover:bg-white/10 transition-all duration-300 ease-in-out hover:scale-110"
            >
              <X className="h-3 w-3 text-gray-400 transition-all duration-300 ease-in-out" />
            </button>
          </div>
        </div>
      )}

      {/* Enhanced New Transaction Notification */}
      {activeTab === 'mempool' && newTransactionNotification && (
        <div className="notification-toast-in mb-4 p-4 bg-slate-800 border border-verus-blue/40 rounded-lg relative overflow-hidden">
          <div className="absolute inset-0 new-block-shimmer pointer-events-none" />
          <div className="flex items-center space-x-3 relative z-10">
            <div className="p-2 rounded-full bg-blue-500/20 sparkle-icon">
              <Sparkle className="h-4 w-4 text-blue-400 transition-all duration-300 ease-in-out" />
            </div>
            <div className="flex-1">
              <div className="text-blue-400 font-semibold text-sm">
                New Transaction!
              </div>
              <div className="text-white text-xs">
                {formatShortHash(newTransactionNotification.txid, 12)} •{' '}
                {formatTime(newTransactionNotification.time)}
              </div>
            </div>
            <button
              onClick={() => {
                setNewTransactionNotification(null);
                setIsNewTransaction(false);
                setMempoolPulseAnimation(false);
                if (transactionNotificationTimeoutRef.current) {
                  clearTimeout(transactionNotificationTimeoutRef.current);
                }
              }}
              className="p-1 rounded-full hover:bg-white/10 transition-all duration-300 ease-in-out hover:scale-110"
            >
              <X className="h-3 w-3 text-gray-400 transition-all duration-300 ease-in-out" />
            </button>
          </div>
        </div>
      )}

      {/* Tab Switcher */}
      <div className="flex space-x-2 mb-6">
        <button
          onClick={() => setActiveTab('blocks')}
          className={`px-4 py-2 rounded-lg transition-all duration-300 ease-in-out ${
            activeTab === 'blocks'
              ? 'bg-verus-blue text-white border border-verus-blue-light'
              : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 border border-slate-700'
          }`}
        >
          Latest Blocks
        </button>
        <button
          onClick={() => setActiveTab('mempool')}
          className={`px-4 py-2 rounded-lg transition-all duration-300 ease-in-out ${
            activeTab === 'mempool'
              ? 'bg-verus-blue text-white border border-verus-blue-light'
              : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 border border-slate-700'
          }`}
        >
          Mempool
        </button>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-blue-500/20 transition-all duration-500 ease-in-out hover:bg-blue-500/30">
            {activeTab === 'blocks' ? (
              <Hash className="h-5 w-5 text-blue-400 transition-all duration-300 ease-in-out" />
            ) : (
              <Network className="h-5 w-5 text-blue-400 transition-all duration-300 ease-in-out" />
            )}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-lg font-semibold text-white transition-all duration-300 ease-in-out">
                {activeTab === 'blocks' ? 'Latest Blocks' : 'Live Mempool'}
              </h3>
              {((activeTab === 'blocks' && isNewBlock) ||
                (activeTab === 'mempool' && isNewTransaction)) && (
                <div className="flex items-center space-x-1 opacity-0 animate-[fadeIn_0.5s_ease-out_0.2s_forwards]">
                  <Bell className="h-4 w-4 text-blue-400 transition-all duration-300 ease-in-out" />
                  <span className="text-blue-400 text-xs font-medium transition-all duration-300 ease-in-out">
                    LIVE
                  </span>
                </div>
              )}
            </div>
            <div className="text-blue-200 text-sm">
              {currentLastUpdate
                ? `Updated ${formatTime(Math.floor(currentLastUpdate.getTime() / 1000))}`
                : tCommon("loading")}
              {activeTab === 'blocks' && syncStatus && !syncStatus.isSynced && (
                <div className="text-blue-400 text-xs mt-1">
                  ⚠️ Blockchain syncing: {syncStatus.syncPercentage}%
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={
              activeTab === 'blocks'
                ? fetchLatestBlocks
                : fetchMempoolTransactions
            }
            disabled={currentLoading}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all duration-300 ease-in-out hover:scale-105 disabled:opacity-50"
          >
            <ArrowsClockwise
              className={`h-4 w-4 text-blue-400 transition-all duration-300 ease-in-out ${currentLoading ? 'animate-spin' : ''}`}
            />
          </button>
          <Link
            href={activeTab === 'blocks' ? '/blocks' : '/mempool'}
            className="p-2 rounded-lg bg-verus-blue/10 hover:bg-verus-blue/20 border border-verus-blue/40 transition-all duration-300 ease-in-out hover:scale-105"
          >
            <ArrowSquareOut className="h-4 w-4 text-blue-400 transition-all duration-300 ease-in-out" />
          </Link>
        </div>
      </div>

      {/* Content based on active tab */}
      <div className="space-y-3">
        {activeTab === 'blocks' ? (
          // Blocks List
          blocks && blocks.length > 0 ? (
            blocks.map((block, index) => {
              const isNewestBlock = index === 0 && isNewBlock;
              return (
                <div
                  key={`live-blocks-${block.hash}`}
                  className={`group bg-slate-800 hover:bg-slate-700 rounded-lg p-4 transition-all duration-300 ease-in-out cursor-pointer border border-slate-700 hover:border-verus-blue/60 hover:scale-[1.02] gpu-accelerated ${
                    isNewestBlock
                      ? 'new-block-enhanced-glow new-block-slide-in new-block-shimmer'
                      : 'block-item-slide'
                  }`}
                  onClick={() => setSelectedBlock(block)}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      {/* Block Type Indicator */}
                      <div
                        className={`p-1.5 rounded-md transition-all duration-500 ease-in-out ${getBlockTypeColor(block.blocktype, block.validationtype)} ${isNewestBlock ? 'new-block-bounce' : ''}`}
                      >
                        {isNewestBlock ? (
                          <Lightning className="h-3 w-3 transition-all duration-300 ease-in-out sparkle-icon" />
                        ) : (
                          getBlockTypeIcon(
                            block.blocktype,
                            block.validationtype
                          )
                        )}
                      </div>

                      {/* Block Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`font-semibold transition-all duration-300 ease-in-out ${isNewestBlock ? 'text-green-400' : 'text-white'}`}
                          >
                            #{block.height.toLocaleString()}
                          </span>
                          {isNewestBlock && (
                            <span className="text-green-400 text-xs font-medium opacity-0 animate-[fadeIn_0.5s_ease-out_0.3s_forwards] new-block-scale-in">
                              NEW
                            </span>
                          )}
                          <span className="text-blue-200 text-xs">
                            {block.validationtype === 'stake' ||
                            block.blocktype === 'minted'
                              ? 'PoS'
                              : 'PoW'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 text-xs text-gray-400 mt-1">
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>{formatTime(block.time)}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Pulse className="h-3 w-3" />
                            <span>{block.nTx} tx</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <TrendUp className="h-3 w-3" />
                            <span>{formatDifficulty(block.difficulty)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Size and Actions */}
                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <div className="text-white text-sm font-medium">
                          {formatSize(block.size)}
                        </div>
                        {block.reward && (
                          <div className="text-green-400 text-xs">
                            {block.reward.toFixed(2)} VRSC
                          </div>
                        )}
                      </div>
                      <CaretRight className="h-4 w-4 text-gray-400 group-hover:text-white transition-all duration-300 ease-in-out group-hover:translate-x-1" />
                    </div>
                  </div>

                  {/* Hash (collapsed by default) */}
                  <div className="mt-2 text-xs text-gray-400 font-mono break-all">
                    {block.hash.substring(0, 20)}...
                    {block.hash.substring(block.hash.length - 8)}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8">
              <div className="text-gray-400 text-sm">No blocks available</div>
            </div>
          )
        ) : // Mempool List
        transactions && transactions.length > 0 ? (
          transactions.map((tx, index) => {
            const isNewestTransaction = index === 0 && isNewTransaction;
            return (
              <div
                key={`live-mempool-${tx.txid}`}
                className={`group bg-slate-800 hover:bg-slate-700 rounded-lg p-4 transition-all duration-300 ease-in-out cursor-pointer border border-slate-700 hover:border-verus-blue/60 hover:scale-[1.02] gpu-accelerated ${
                  isNewestTransaction
                    ? 'new-block-enhanced-glow new-block-slide-in new-block-shimmer'
                    : 'block-item-slide'
                }`}
                onClick={() => setSelectedTransaction(tx)}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    {/* Priority Indicator */}
                    <div
                      className={`p-1.5 rounded-md transition-all duration-500 ease-in-out ${getPriorityColor(tx.currentpriority)} ${isNewestTransaction ? 'new-block-bounce' : ''}`}
                    >
                      {isNewestTransaction ? (
                        <Lightning className="h-3 w-3 transition-all duration-300 ease-in-out sparkle-icon" />
                      ) : (
                        <Pulse className="h-3 w-3" />
                      )}
                    </div>

                    {/* Transaction Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`font-semibold transition-all duration-300 ease-in-out ${isNewestTransaction ? 'text-blue-500 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}
                        >
                          {formatShortHash(tx.txid, 12)}
                        </span>
                        {isNewestTransaction && (
                          <span className="text-blue-400 text-xs font-medium opacity-0 animate-[fadeIn_0.5s_ease-out_0.3s_forwards] new-block-scale-in">
                            NEW
                          </span>
                        )}
                        <span className="text-blue-200 text-xs">
                          Priority: {tx.currentpriority.toFixed(1)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 text-xs text-gray-400 mt-1">
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatTime(tx.time)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Hash className="h-3 w-3" />
                          <span>{formatFileSize(tx.size)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Coins className="h-3 w-3" />
                          <span>{formatCryptoValue(tx.fee)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Fee and Actions */}
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <div className="text-white text-sm font-medium">
                        {formatCryptoValue(tx.fee)}
                      </div>
                      <div className="text-green-400 text-xs">Fee</div>
                    </div>
                    <CaretRight className="h-4 w-4 text-gray-400 group-hover:text-white transition-all duration-300 ease-in-out group-hover:translate-x-1" />
                  </div>
                </div>

                {/* Dependencies */}
                {tx.depends.length > 0 && (
                  <div className="mt-2 text-xs text-green-400">
                    ⚠️ Depends on {tx.depends.length} transaction
                    {tx.depends.length > 1 ? 's' : ''}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center py-8">
            <div className="text-gray-400 text-sm">
              No transactions in mempool
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-white/10">
        <Link
          href="/?tab=explorer"
          className="flex items-center justify-center space-x-2 text-verus-blue hover:text-verus-blue-light transition-all duration-300 ease-in-out group hover:scale-105"
        >
          <span className="text-sm font-medium transition-all duration-300 ease-in-out">
            Search {activeTab === 'blocks' ? 'Blocks' : tBlocks("transactions")}
          </span>
          <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-all duration-300 ease-in-out" />
        </Link>
      </div>

      {/* Block Detail Modal */}
      {selectedBlock && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/80 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-900 border border-slate-300 dark:border-gray-600 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto transform transition-all duration-500 ease-out animate-in zoom-in-95">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Block #{selectedBlock.height}
                </h3>
                <button
                  onClick={() => setSelectedBlock(null)}
                  className="p-2 rounded-lg bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 border border-gray-300 dark:border-slate-700 transition-all duration-300 ease-in-out hover:scale-110"
                >
                  <X className="h-5 w-5 text-gray-600 dark:text-gray-400 transition-all duration-300 ease-in-out" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-blue-200 text-sm">Hash</div>
                    <div className="text-white font-mono text-sm break-all">
                      {selectedBlock.hash}
                    </div>
                  </div>
                  <div>
                    <div className="text-blue-200 text-sm">Time</div>
                    <div className="text-white">
                      {new Date(selectedBlock.time * 1000).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-blue-200 text-sm">{tBlocks("size")}</div>
                    <div className="text-white">
                      {formatSize(selectedBlock.size)}
                    </div>
                  </div>
                  <div>
                    <div className="text-blue-200 text-sm">{tBlocks("transactions")}</div>
                    <div className="text-white">{selectedBlock.nTx}</div>
                  </div>
                  <div>
                    <div className="text-blue-200 text-sm">{tBlocks("difficulty")}</div>
                    <div className="text-white">
                      {formatDifficulty(selectedBlock.difficulty)}
                    </div>
                  </div>
                  <div>
                    <div className="text-blue-200 text-sm">Type</div>
                    <div className="text-white">
                      {selectedBlock.validationtype === 'stake' ||
                      selectedBlock.blocktype === 'minted'
                        ? 'Proof of Stake'
                        : 'Proof of Work'}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10">
                  <Link
                    href={`/block/${selectedBlock.hash}`}
                    className="inline-flex items-center space-x-2 bg-verus-blue/10 hover:bg-verus-blue/20 text-verus-blue px-4 py-2 rounded-lg border border-verus-blue/40 transition-all duration-300 ease-in-out hover:scale-105"
                  >
                    <span className="transition-all duration-300 ease-in-out">
                      View Full Details
                    </span>
                    <ArrowSquareOut className="h-4 w-4 transition-all duration-300 ease-in-out" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Detail Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-900 border border-slate-300 dark:border-gray-600 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto transform transition-all duration-500 ease-out animate-in zoom-in-95">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-white">
                  Transaction Details
                </h3>
                <button
                  onClick={() => setSelectedTransaction(null)}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all duration-300 ease-in-out hover:scale-110"
                >
                  <X className="h-5 w-5 text-gray-400 transition-all duration-300 ease-in-out" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-blue-200 text-sm">Transaction ID</div>
                    <div className="text-white font-mono text-sm break-all">
                      {selectedTransaction.txid}
                    </div>
                  </div>
                  <div>
                    <div className="text-blue-200 text-sm">Time</div>
                    <div className="text-white">
                      {new Date(
                        selectedTransaction.time * 1000
                      ).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-blue-200 text-sm">{tBlocks("size")}</div>
                    <div className="text-white">
                      {formatFileSize(selectedTransaction.size)}
                    </div>
                  </div>
                  <div>
                    <div className="text-blue-200 text-sm">Fee</div>
                    <div className="text-white">
                      {formatCryptoValue(selectedTransaction.fee)}
                    </div>
                  </div>
                  <div>
                    <div className="text-blue-200 text-sm">Priority</div>
                    <div className="text-white">
                      {selectedTransaction.currentpriority.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-blue-200 text-sm">Dependencies</div>
                    <div className="text-white">
                      {selectedTransaction.depends.length}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10">
                  <Link
                    href={`/transaction/${selectedTransaction.txid}`}
                    className="inline-flex items-center space-x-2 bg-verus-blue/10 hover:bg-verus-blue/20 text-verus-blue px-4 py-2 rounded-lg border border-verus-blue/40 transition-all duration-300 ease-in-out hover:scale-105"
                  >
                    <span className="transition-all duration-300 ease-in-out">
                      View Full Details
                    </span>
                    <ArrowSquareOut className="h-4 w-4 transition-all duration-300 ease-in-out" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
