'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Hash,
  Clock,
  Coins,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  ChevronRight,
  Activity,
  TrendingUp,
  X,
  Sparkles,
  Zap,
  Bell,
  Shield,
  Hammer,
} from 'lucide-react';
import Link from 'next/link';
import './animations/new-block-animations.css';

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

interface LiveBlocksCardProps {
  className?: string;
}

export function EnhancedLiveBlocksCard({
  className = '',
}: LiveBlocksCardProps) {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);
  const [newBlockNotification, setNewBlockNotification] =
    useState<Block | null>(null);
  const [isNewBlock, setIsNewBlock] = useState(false);
  const [pulseAnimation, setPulseAnimation] = useState(false);
  const [showParticles, setShowParticles] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{
    verificationProgress: number;
    isSynced: boolean;
    syncPercentage: number;
  } | null>(null);
  const previousBlocksRef = useRef<Block[]>([]);
  const notificationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const particleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchLatestBlocks = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/latest-blocks?limit=8');
      const result = await response.json();

      if (result.success && result.data && result.data.blocks) {
        const newBlocks = result.data.blocks;
        const syncStatus = result.data.syncStatus;

        // Update sync status
        setSyncStatus(syncStatus);

        // Log sync status for debugging
        if (syncStatus && !syncStatus.isSynced) {
          console.warn(
            `Blockchain sync: ${syncStatus.syncPercentage}% - blocks may not be current`
          );
        }

        // Check for new blocks with enhanced detection
        if (previousBlocksRef.current.length > 0) {
          const latestPreviousBlock = previousBlocksRef.current[0];
          const latestNewBlock = newBlocks[0];

          if (
            latestNewBlock &&
            latestPreviousBlock &&
            latestNewBlock.hash !== latestPreviousBlock.hash
          ) {
            // New block detected! Enhanced animation sequence
            setNewBlockNotification(latestNewBlock);
            setIsNewBlock(true);
            setPulseAnimation(true);
            setShowParticles(true);

            // Clear previous timeouts
            if (notificationTimeoutRef.current) {
              clearTimeout(notificationTimeoutRef.current);
            }
            if (particleTimeoutRef.current) {
              clearTimeout(particleTimeoutRef.current);
            }

            // Auto-hide notification after 5 seconds
            notificationTimeoutRef.current = setTimeout(() => {
              setNewBlockNotification(null);
              setIsNewBlock(false);
              setPulseAnimation(false);
            }, 5000);

            // Hide particles after 3 seconds
            particleTimeoutRef.current = setTimeout(() => {
              setShowParticles(false);
            }, 3000);
          }
        }

        setBlocks(newBlocks);
        previousBlocksRef.current = newBlocks;
        setLastUpdate(new Date());
      } else {
        setError('Failed to fetch blocks');
      }
    } catch (err) {
      setError('Network error');
      console.error('Error fetching blocks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLatestBlocks();
    const interval = setInterval(fetchLatestBlocks, 15000);
    return () => {
      clearInterval(interval);
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
      }
      if (particleTimeoutRef.current) {
        clearTimeout(particleTimeoutRef.current);
      }
    };
  }, []);

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

  const formatDifficulty = (difficulty: number) => {
    return (
      (difficulty / 1e6).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }) + ' M'
    );
  };

  const getBlockTypeColor = (blocktype?: string, validationtype?: string) => {
    if (validationtype === 'stake' || blocktype === 'minted') {
      return 'text-green-400 bg-green-500/10 border-green-500/20';
    }
    return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
  };

  const getBlockTypeIcon = (blocktype?: string, validationtype?: string) => {
    if (validationtype === 'stake' || blocktype === 'minted') {
      return <Shield className="h-3 w-3" />;
    }
    return <Hammer className="h-3 w-3" />;
  };

  const createParticles = () => {
    const particles = [];
    for (let i = 0; i < 8; i++) {
      const delay = i * 100;
      const left = Math.random() * 100;
      particles.push(
        <div
          key={i}
          className="particle"
          style={{
            left: `${left}%`,
            animationDelay: `${delay}ms`,
          }}
        />
      );
    }
    return particles;
  };

  if (error) {
    return (
      <div
        className={`bg-red-500/10 border border-red-500/20 rounded-xl p-6 ${className}`}
      >
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-red-500/20">
            <Activity className="h-5 w-5 text-red-400" />
          </div>
          <div>
            <div className="text-red-400 font-semibold">
              Error Loading Blocks
            </div>
            <div className="text-red-300 text-sm">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 transition-all duration-500 ease-in-out gpu-accelerated ${className}`}
    >
      {/* Enhanced New Block Notification */}
      {newBlockNotification && (
        <div className="notification-toast-in mb-4 p-4 bg-gradient-to-r from-green-500/20 to-blue-500/20 border border-green-500/30 rounded-lg relative overflow-hidden">
          {/* Shimmer Effect */}
          <div className="absolute inset-0 new-block-shimmer pointer-events-none" />

          <div className="flex items-center space-x-3 relative z-10">
            <div className="p-2 rounded-full bg-green-500/20 sparkle-icon">
              <Sparkles className="h-4 w-4 text-green-400" />
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
                setPulseAnimation(false);
                setShowParticles(false);
                if (notificationTimeoutRef.current) {
                  clearTimeout(notificationTimeoutRef.current);
                }
                if (particleTimeoutRef.current) {
                  clearTimeout(particleTimeoutRef.current);
                }
              }}
              className="p-1 rounded-full hover:bg-white/10 transition-all duration-300 ease-in-out hover:scale-110"
            >
              <X className="h-3 w-3 text-gray-400 transition-all duration-300 ease-in-out" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div
            className={`p-2 rounded-lg bg-blue-500/20 transition-all duration-500 ease-in-out hover:bg-blue-500/30 ${pulseAnimation ? 'new-block-glow' : ''}`}
          >
            <Hash className="h-5 w-5 text-blue-400 transition-all duration-300 ease-in-out" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-lg font-semibold text-white transition-all duration-300 ease-in-out">
                Latest Blocks
              </h3>
              {isNewBlock && (
                <div className="flex items-center space-x-1 opacity-0 animate-[fadeIn_0.5s_ease-out_0.2s_forwards]">
                  <Bell className="h-4 w-4 text-green-400 transition-all duration-300 ease-in-out" />
                  <span className="text-green-400 text-xs font-medium transition-all duration-300 ease-in-out">
                    LIVE
                  </span>
                </div>
              )}
            </div>
            <div className="text-blue-200 text-sm">
              {lastUpdate
                ? `Updated ${formatTime(Math.floor(lastUpdate.getTime() / 1000))}`
                : 'Loading...'}
              {syncStatus && !syncStatus.isSynced && (
                <div className="text-orange-400 text-xs mt-1">
                  ⚠️ Blockchain syncing: {syncStatus.syncPercentage}%
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={fetchLatestBlocks}
            disabled={loading}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-300 ease-in-out hover:scale-105 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 text-blue-400 transition-all duration-300 ease-in-out ${loading ? 'animate-spin' : ''}`}
            />
          </button>
          <Link
            href="/blocks"
            className="p-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 transition-all duration-300 ease-in-out hover:scale-105"
          >
            <ExternalLink className="h-4 w-4 text-blue-400 transition-all duration-300 ease-in-out" />
          </Link>
        </div>
      </div>

      {/* Blocks List with Enhanced Animations */}
      <div className="space-y-3 relative">
        {/* Particle Effects */}
        {showParticles && (
          <div className="absolute inset-0 pointer-events-none z-10">
            {createParticles()}
          </div>
        )}

        {blocks && blocks.length > 0 ? (
          blocks.map((block, index) => {
            const isNewestBlock = index === 0 && isNewBlock;
            const isNewlyAdded = index === 0 && isNewBlock;

            return (
              <div
                key={`enhanced-live-blocks-${block.hash}`}
                className={`group bg-white/5 hover:bg-white/10 rounded-lg p-4 transition-all duration-500 ease-in-out cursor-pointer border border-transparent hover:border-white/10 hover:scale-[1.02] gpu-accelerated ${
                  isNewestBlock ? 'new-block-enhanced-glow' : ''
                } ${
                  isNewlyAdded
                    ? 'new-block-slide-in new-block-shimmer'
                    : 'block-item-slide'
                }`}
                onClick={() => setSelectedBlock(block)}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    {/* Enhanced Block Type Indicator */}
                    <div
                      className={`p-1.5 rounded-md transition-all duration-500 ease-in-out ${getBlockTypeColor(block.blocktype, block.validationtype)} ${isNewestBlock ? 'new-block-bounce' : ''}`}
                    >
                      {isNewestBlock ? (
                        <Zap className="h-3 w-3 transition-all duration-300 ease-in-out sparkle-icon" />
                      ) : (
                        getBlockTypeIcon(block.blocktype, block.validationtype)
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
                          <Activity className="h-3 w-3" />
                          <span>{block.nTx} tx</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <TrendingUp className="h-3 w-3" />
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
                    <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-white transition-all duration-300 ease-in-out group-hover:translate-x-1" />
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
        )}
      </div>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-white/10">
        <Link
          href="/blocks"
          className="flex items-center justify-center space-x-2 text-blue-400 hover:text-blue-300 transition-all duration-300 ease-in-out group hover:scale-105"
        >
          <span className="text-sm font-medium transition-all duration-300 ease-in-out">
            View All Blocks
          </span>
          <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-all duration-300 ease-in-out" />
        </Link>
      </div>

      {/* Enhanced Block Detail Modal */}
      {selectedBlock && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-gray-900 border border-gray-600 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto transform transition-all duration-500 ease-out animate-in zoom-in-95 new-block-scale-in">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-white">
                  Block #{selectedBlock.height}
                </h3>
                <button
                  onClick={() => setSelectedBlock(null)}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-300 ease-in-out hover:scale-110"
                >
                  <X className="h-5 w-5 text-gray-400 transition-all duration-300 ease-in-out" />
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
                    <div className="text-blue-200 text-sm">Size</div>
                    <div className="text-white">
                      {formatSize(selectedBlock.size)}
                    </div>
                  </div>
                  <div>
                    <div className="text-blue-200 text-sm">Transactions</div>
                    <div className="text-white">{selectedBlock.nTx}</div>
                  </div>
                  <div>
                    <div className="text-blue-200 text-sm">Difficulty</div>
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
                    className="inline-flex items-center space-x-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 px-4 py-2 rounded-lg transition-all duration-300 ease-in-out hover:scale-105"
                  >
                    <span className="transition-all duration-300 ease-in-out">
                      View Full Details
                    </span>
                    <ExternalLink className="h-4 w-4 transition-all duration-300 ease-in-out" />
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
