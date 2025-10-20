'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Database,
  TrendUp,
  User,
  CurrencyDollar,
  Clock,
  Pulse,
  Lightning,
  Hash,
  ArrowUpRight,
  Circle,
} from '@phosphor-icons/react';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { useLocalStorageCache } from '@/lib/hooks/use-local-storage-cache';
import { useThrottle } from '@/lib/hooks/use-throttle';
import { ActivityCardSkeleton } from './skeleton-loader';
import { logger } from '@/lib/utils/logger';

// Event Types
type EventType = 'block' | 'transaction' | 'verusid' | 'staking';

interface ActivityEvent {
  id: string;
  type: EventType;
  timestamp: Date;
  data: any;
  highlighted?: boolean;
}

interface LiveActivityFeedProps {
  maxEvents?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function LiveActivityFeed({
  maxEvents = 20,
  autoRefresh = true,
  refreshInterval = 30000, // 30 seconds
}: LiveActivityFeedProps) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [nextBlockCountdown, setNextBlockCountdown] = useState(60);
  const [isLive, setIsLive] = useState(true);
  const [filter, setFilter] = useState<EventType | 'all'>('all');
  const [isLoading, setIsLoading] = useState(true);

  // Cache for events
  const { cachedData, saveToCache, isFromCache } = useLocalStorageCache<
    ActivityEvent[]
  >('live_activity_events', { ttl: 30000, version: '1.0' });

  // Throttled fetch to prevent spam
  const fetchEvents = useThrottle(
    useCallback(async () => {
      try {
        setIsLoading(true);
        // Fetch latest blocks
        const blocksRes = await fetch('/api/latest-blocks?limit=5');
        const blocksData = await blocksRes.json();

        // Fetch latest transactions (we'll need to create this or use blocks data)
        const txsRes = await fetch('/api/latest-transactions?limit=10').catch(
          () => null
        );
        const txsData = txsRes ? await txsRes.json() : null;

        // Create events from blocks
        const blockEvents: ActivityEvent[] = (
          blocksData?.data?.blocks || []
        ).map((block: any) => ({
          id: `block-${block.hash}`,
          type: 'block' as EventType,
          timestamp: new Date(block.time * 1000),
          data: {
            height: block.height,
            hash: block.hash,
            txCount: block.nTx,
            miner: block.hasStakeReward ? 'Staked' : 'Mined',
            reward: block.stakeRewardAmount || block.reward,
          },
        }));

        // Create events from transactions (large ones)
        const txEvents: ActivityEvent[] = [];
        if (txsData?.data?.transactions) {
          txsData.data.transactions
            .filter((tx: any) => {
              // Filter for large transactions (>1000 VRSC)
              const totalOut =
                tx.vout?.reduce(
                  (sum: number, out: any) => sum + (out.value || 0),
                  0
                ) || 0;
              return totalOut > 1000;
            })
            .forEach((tx: any) => {
              const totalOut =
                tx.vout?.reduce(
                  (sum: number, out: any) => sum + (out.value || 0),
                  0
                ) || 0;
              txEvents.push({
                id: `tx-${tx.txid}`,
                type: 'transaction' as EventType,
                timestamp: new Date(tx.time * 1000),
                data: {
                  txid: tx.txid,
                  amount: totalOut,
                  type: tx.type || 'transfer',
                },
                highlighted: totalOut > 10000, // Highlight very large transactions
              });
            });
        }

        // Fetch recent VerusID events
        const verusIdEvents: ActivityEvent[] = [];
        try {
          const verusIdRes = await fetch(
            '/api/verusids/browse?sort=recent&limit=5'
          );
          const verusIdData = await verusIdRes.json();

          if (verusIdData?.success && verusIdData.data?.identities) {
            verusIdData.data.identities.forEach((identity: any) => {
              // Only include recently registered VerusIDs (within last 24 hours)
              const firstSeenTime = identity.firstSeenBlock
                ? new Date(Date.now() - identity.firstSeenBlock * 60 * 1000) // Approximate block time
                : new Date();

              const hoursSinceRegistration =
                (Date.now() - firstSeenTime.getTime()) / (1000 * 60 * 60);

              if (hoursSinceRegistration <= 24) {
                // Only show VerusIDs registered in last 24 hours
                verusIdEvents.push({
                  id: `verusid-${identity.address}`,
                  type: 'verusid' as EventType,
                  timestamp: firstSeenTime,
                  data: {
                    name: identity.name,
                    friendlyName: identity.friendlyName,
                    address: identity.address,
                    firstSeenBlock: identity.firstSeenBlock,
                  },
                  highlighted: hoursSinceRegistration <= 1, // Highlight if registered within last hour
                });
              }
            });
          }
        } catch (error) {
          logger.warn('Failed to fetch VerusID events:', error);
        }

        // Mock staking rewards (from blocks)
        const stakingEvents: ActivityEvent[] = blockEvents
          .filter(e => e.data.miner === 'Staked')
          .map(e => ({
            id: `stake-${e.id}`,
            type: 'staking' as EventType,
            timestamp: e.timestamp,
            data: {
              blockHeight: e.data.height,
              reward: e.data.reward,
            },
          }));

        // Combine and sort by timestamp
        const allEvents = [
          ...blockEvents,
          ...txEvents,
          ...verusIdEvents,
          ...stakingEvents,
        ]
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
          .slice(0, maxEvents);

        setEvents(allEvents);
        saveToCache(allEvents); // Cache for quick reload
        setIsLoading(false);
      } catch (error) {
        logger.error('Error fetching activity events:', error);
        setIsLoading(false);
      }
    }, [maxEvents, saveToCache]),
    2000
  ); // Throttle to max once per 2 seconds

  // Load cached data first for instant display
  useEffect(() => {
    if (cachedData && cachedData.length > 0) {
      setEvents(cachedData);
      setIsLoading(false);
    }
  }, [cachedData]);

  // Initial fetch
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchEvents, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchEvents]);

  // Block countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setNextBlockCountdown(prev => {
        if (prev <= 1) {
          fetchEvents(); // Fetch new events when countdown reaches 0
          return 60; // Reset to 60 seconds
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [fetchEvents]);

  // Filter events
  const filteredEvents =
    filter === 'all' ? events : events.filter(e => e.type === filter);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-300 dark:border-slate-700 overflow-hidden flex flex-col h-full max-h-[800px]">
      {/* Header */}
      <div className="border-b border-slate-300 dark:border-white/10">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Pulse className="h-5 w-5 text-blue-400" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Live Activity</h3>
              <div className="flex items-center gap-1">
                <Circle
                  className={`h-2 w-2 ${isLive ? 'fill-verus-green text-verus-green' : 'fill-slate-400 text-slate-400'} animate-pulse`}
                />
                <span className="text-xs text-gray-600 dark:text-slate-400">
                  {isLive ? 'LIVE' : 'PAUSED'}
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsLive(!isLive)}
              className="text-xs px-2 py-1 rounded bg-gray-200 dark:bg-slate-800 hover:bg-gray-300 dark:hover:bg-slate-700 transition-colors border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-white"
            >
              {isLive ? 'Pause' : 'Resume'}
            </button>
          </div>

          {/* Next Block Countdown */}
          <div className="bg-gray-100 dark:bg-slate-800 rounded-lg p-3 border border-gray-300 dark:border-verus-blue/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-400" />
                <span className="text-sm text-blue-600 dark:text-blue-200">Next Block</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">
                  {nextBlockCountdown}s
                </span>
              </div>
            </div>
            <div className="mt-2 h-1 bg-gray-300 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-verus-blue transition-all duration-1000"
                style={{ width: `${(nextBlockCountdown / 60) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Filters - Full Width Container with Horizontal Scroll */}
        <div className="px-2 pb-4">
          <div className="flex gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent hover:scrollbar-thumb-slate-500 pb-2">
            {[
              { key: 'all', label: 'All', icon: Pulse },
              { key: 'block', label: 'Blocks', icon: Database },
              { key: 'transaction', label: 'Transactions', icon: CurrencyDollar },
              { key: 'verusid', label: 'VerusIDs', icon: User },
              { key: 'staking', label: 'Staking', icon: TrendUp },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setFilter(key as any)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap flex-shrink-0 min-w-fit ${
                  filter === key
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-300 dark:hover:bg-slate-700 border border-gray-300 dark:border-slate-700'
                }`}
              >
                <Icon className="h-3 w-3" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Events List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
        {isLoading && events.length === 0 ? (
          // Show skeletons while loading
          <>
            {[1, 2, 3, 4, 5].map(i => (
              <ActivityCardSkeleton key={i} />
            ))}
          </>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-8 text-gray-600 dark:text-gray-400">
            <Pulse className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No recent activity</p>
            <p className="text-xs mt-1">New events will appear here</p>
          </div>
        ) : (
          filteredEvents.map((event, index) => (
            <EventCard key={event.id} event={event} index={index} />
          ))
        )}
      </div>

      {/* Footer Stats */}
      <div className="p-3 border-t border-slate-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
        <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
          <span>{filteredEvents.length} events</span>
          <span>
            Updated {formatDistanceToNow(new Date(), { addSuffix: true })}
          </span>
        </div>
      </div>
    </div>
  );
}

// Event Card Component
function EventCard({ event, index }: { event: ActivityEvent; index: number }) {
  const getEventConfig = () => {
    switch (event.type) {
      case 'block':
        return {
          icon: Database,
          color: 'text-blue-600 dark:text-blue-400 bg-white dark:bg-blue-500/10 border-slate-300 dark:border-blue-500/20',
          label: event.data.miner === 'Staked' ? 'Block Staked' : 'Block Mined',
        };
      case 'transaction':
        return {
          icon: CurrencyDollar,
          color: 'text-green-600 dark:text-green-400 bg-white dark:bg-green-500/10 border-slate-300 dark:border-green-500/20',
          label: 'Large Transaction',
        };
      case 'verusid':
        return {
          icon: User,
          color: 'text-blue-600 dark:text-blue-400 bg-white dark:bg-blue-500/10 border-slate-300 dark:border-blue-500/20',
          label: 'VerusID Registered',
        };
      case 'staking':
        return {
          icon: TrendUp,
          color: 'text-green-600 dark:text-green-400 bg-white dark:bg-green-500/10 border-slate-300 dark:border-green-500/20',
          label: 'Staking Reward',
        };
      default:
        return {
          icon: Pulse,
          color: 'text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-500/10 border-slate-300 dark:border-gray-500/20',
          label: 'Activity',
        };
    }
  };

  const config = getEventConfig();
  const Icon = config.icon;

  return (
    <div
      className={`group relative bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg p-3 border transition-all duration-300 cursor-pointer ${config.color} ${
        event.highlighted ? 'ring-2 ring-yellow-400/50' : ''
      }`}
      style={{
        animation: `fadeInSlide 0.5s ease-out ${index * 0.05}s both`,
      }}
    >
      {/* Highlight Badge */}
      {event.highlighted && (
        <div className="absolute -top-2 -right-2 bg-green-500 text-black text-xs px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
          <Lightning className="h-3 w-3" />
          HOT
        </div>
      )}

      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 group-hover:scale-110 transition-transform">
          <Icon className="h-4 w-4" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {config.label}
            </span>
            <span className="text-xs text-gray-600 dark:text-gray-400">
              {formatDistanceToNow(event.timestamp, { addSuffix: true })}
            </span>
          </div>

          {/* Event-specific details */}
          {event.type === 'block' && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-600 dark:text-gray-400">Height:</span>
                <Link
                  href={`/block/${event.data.hash}`}
                  className="text-blue-400 hover:text-blue-300 font-mono flex items-center gap-1"
                >
                  #{event.data.height.toLocaleString()}
                  <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                <span>{event.data.txCount} txs</span>
                <span>{event.data.reward.toFixed(2)} VRSC</span>
              </div>
            </div>
          )}

          {event.type === 'transaction' && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-600 dark:text-gray-400">Amount:</span>
                <span className="text-green-400 font-bold">
                  {event.data.amount.toLocaleString()} VRSC
                </span>
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 font-mono truncate">
                {event.data.txid.slice(0, 16)}...
              </div>
            </div>
          )}

          {event.type === 'staking' && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-600 dark:text-gray-400">Block:</span>
                <span className="text-gray-900 dark:text-white font-mono">
                  #{event.data.blockHeight}
                </span>
              </div>
              <div className="text-sm text-green-400 font-bold">
                +{event.data.reward.toFixed(2)} VRSC
              </div>
            </div>
          )}

          {event.type === 'verusid' && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-600 dark:text-gray-400">Name:</span>
                <Link
                  href={`/verusid/${event.data.address}`}
                  className="text-blue-400 hover:text-blue-400-light font-bold flex items-center gap-1"
                >
                  {event.data.friendlyName}
                  <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Block #{event.data.firstSeenBlock?.toLocaleString() || 'N/A'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Add animations via CSS-in-JS
const styleSheet = `
  @keyframes fadeInSlide {
    from {
      opacity: 0;
      transform: translateX(20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }

  .custom-scrollbar::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 3px;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 3px;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.3);
  }
`;

if (
  typeof document !== 'undefined' &&
  !document.getElementById('live-activity-styles')
) {
  const style = document.createElement('style');
  style.id = 'live-activity-styles';
  style.textContent = styleSheet;
  document.head.appendChild(style);
}
