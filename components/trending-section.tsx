'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  TrendUp,
  Fire,
  Eye,
  MagnifyingGlass,
  UsersThreeThree,
  Database,
  Activity,
  ArrowUpRight,
  Clock,
  Hash,
  CurrencyDollar,
  CaretRight,
  Sparkle,
} from '@phosphor-icons/react';
import Link from 'next/link';
import { useLocalStorageCache } from '@/lib/hooks/use-local-storage-cache';
import { logger } from '@/lib/utils/logger';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { TrendingItemSkeleton } from './skeleton-loader';

interface TrendingItem {
  id: string;
  type: 'block' | 'verusid' | 'address' | 'search' | 'transaction';
  name: string;
  value: string | number;
  trend: number; // Percentage change
  views?: number;
  link: string;
  metadata?: any;
}

interface TrendingSectionProps {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

// Trending Card Component
function TrendingCard({ item, rank }: { item: TrendingItem; rank: number }) {
  const getTypeConfig = () => {
    switch (item.type) {
      case 'block':
        return {
          icon: Database,
          color: 'text-blue-400',
          bgColor: 'bg-blue-500/10',
          borderColor: 'border-blue-500/20',
        };
      case 'verusid':
        return {
          icon: UsersThree,
          color: 'text-blue-400',
          bgColor: 'bg-blue-500/10',
          borderColor: 'border-blue-500/20',
        };
      case 'address':
        return {
          icon: Hash,
          color: 'text-green-400',
          bgColor: 'bg-green-500/10',
          borderColor: 'border-green-500/20',
        };
      case 'transaction':
        return {
          icon: Activity,
          color: 'text-blue-400',
          bgColor: 'bg-blue-500/10',
          borderColor: 'border-blue-500/20',
        };
      case 'search':
        return {
          icon: MagnifyingGlass,
          color: 'text-green-400',
          bgColor: 'bg-green-500/10',
          borderColor: 'border-green-500/20',
        };
      default:
        return {
          icon: Activity,
          color: 'text-gray-400',
          bgColor: 'bg-gray-500/10',
          borderColor: 'border-gray-500/20',
        };
    }
  };

  const config = getTypeConfig();
  const Icon = config.icon;
  const isTopThree = rank <= 3;

  return (
    <Link
      href={item.link}
      className={`group relative bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-verus-blue/60 rounded-xl p-4 border transition-all duration-300 ${config.borderColor} hover:border-white/30 ${
        isTopThree ? 'ring-1 ring-orange-400/30' : ''
      }`}
    >
      {/* Rank Badge */}
      <div
        className={`absolute -top-3 -left-3 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-lg ${
          rank === 1
            ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-black'
            : rank === 2
              ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-white'
              : rank === 3
                ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white'
                : 'bg-verus-blue text-white border border-verus-blue-light'
        }`}
      >
        {rank}
      </div>

      {/* Hot Badge for Top Item */}
      {rank === 1 && (
        <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full font-bold flex items-center gap-1 animate-pulse">
          <Fire className="h-3 w-3" />
          HOT
        </div>
      )}

      <div className="flex items-start gap-4">
        {/* Icon */}
        <div
          className={`p-3 rounded-lg ${config.bgColor} group-hover:scale-110 transition-transform`}
        >
          <Icon className={`h-5 w-5 ${config.color}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-white font-semibold truncate flex items-center gap-2">
              {item.name}
              <ArrowUpRight className="h-4 w-4 text-gray-400 group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
            </h4>
          </div>

          <div className="flex items-center gap-4 text-sm mb-2">
            <span className={`font-medium ${config.color}`}>{item.value}</span>
            {item.views && (
              <span className="flex items-center gap-1 text-gray-400">
                <Eye className="h-3 w-3" />
                {item.views.toLocaleString()} views
              </span>
            )}
          </div>

          {/* Trend Indicator */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <TrendUp
                className={`h-4 w-4 ${item.trend > 50 ? 'text-green-400' : 'text-blue-400'}`}
              />
              <span
                className={`text-sm font-bold ${item.trend > 50 ? 'text-green-400' : 'text-blue-400'}`}
              >
                +{item.trend}%
              </span>
            </div>
            <span className="text-xs text-gray-400">trending</span>

            {/* Metadata */}
            {item.metadata && (
              <div className="text-xs text-gray-400 ml-auto">
                {item.metadata.height &&
                  `Height: ${item.metadata.height.toLocaleString()}`}
                {item.metadata.stakes && `${item.metadata.stakes} stakes`}
                {item.metadata.rank && `Rank #${item.metadata.rank}`}
              </div>
            )}
          </div>

          {/* Progress Bar (Trend Visualization) */}
          <div className="mt-3 h-1 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${
                item.trend > 50
                  ? 'bg-gradient-to-r from-green-400 to-emerald-500'
                  : 'bg-gradient-to-r from-yellow-400 to-orange-500'
              }`}
              style={{ width: `${Math.min(item.trend, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}

export function TrendingSection({
  autoRefresh = true,
  refreshInterval = 60000, // 1 minute
}: TrendingSectionProps) {
  const [activeTab, setActiveTab] = useState<
    'all' | 'blocks' | 'verusids' | 'addresses'
  >('all');
  const [trendingData, setTrendingData] = useState<{
    blocks: TrendingItem[];
    verusids: TrendingItem[];
    addresses: TrendingItem[];
    searches: TrendingItem[];
  }>({
    blocks: [],
    verusids: [],
    addresses: [],
    searches: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  // Cache for trending data
  const { cachedData, saveToCache } = useLocalStorageCache<typeof trendingData>(
    'trending_data',
    { ttl: 60000, version: '1.0' } // 1 minute cache
  );

  // Fetch trending data
  const fetchTrendingData = useCallback(async () => {
    try {
      setIsLoading(true);

      // Fetch latest blocks (most viewed would require analytics)
      const blocksRes = await fetch('/api/latest-blocks?limit=10');
      const blocksData = await blocksRes.json();

      // Fetch top VerusIDs
      const verusidsRes = await fetch(
        '/api/verusids/staking-leaderboard?limit=8'
      );
      const verusidsData = await verusidsRes.json();

      // Process blocks for trending
      const trendingBlocks: TrendingItem[] = (blocksData?.data?.blocks || [])
        .filter((block: any) => block.nTx > 2) // Blocks with more transactions
        .slice(0, 5)
        .map((block: any, index: number) => ({
          id: block.hash,
          type: 'block' as const,
          name: `Block #${block.height.toLocaleString()}`,
          value: `${block.nTx} transactions`,
          trend: Math.floor(Math.random() * 50) + 10, // Mock trend
          views: Math.floor(Math.random() * 500) + 100,
          link: `/block/${block.hash}`,
          metadata: {
            height: block.height,
            time: block.time,
            size: block.size,
            miner: block.hasStakeReward ? 'Staked' : 'Mined',
          },
        }));

      // Process VerusIDs for trending
      const trendingVerusIDs: TrendingItem[] = (
        verusidsData?.data?.leaderboard || []
      )
        .slice(0, 5)
        .map((id: any, index: number) => ({
          id: id.address || id.identityaddress || id.iaddress,
          type: 'verusid' as const,
          name:
            id.friendlyName ||
            id.displayName ||
            id.friendlyname ||
            `${id.name}@`,
          value: `${(id.totalRewardsVRSC || id.total_rewards || id.totalRewards || 0).toFixed(2)} VRSC`,
          trend: 75 - index * 10, // Higher for top rankers
          views: 1000 - index * 100,
          link: `/verusid/${id.address || id.identityaddress || id.iaddress}`,
          metadata: {
            stakes: id.totalStakes || id.total_stakes || 0,
            rank: id.rank || id.networkRank || index + 1,
          },
        }));

      // Mock trending addresses (in production, track from analytics)
      const trendingAddresses: TrendingItem[] = [
        {
          id: 'addr1',
          type: 'address',
          name: 'RTop...Wallet',
          value: '45,000 VRSC',
          trend: 85,
          views: 850,
          link: '/address/RTop...Wallet',
        },
        {
          id: 'addr2',
          type: 'address',
          name: 'RAct...Address',
          value: '128 transactions',
          trend: 65,
          views: 620,
          link: '/address/RAct...Address',
        },
      ];

      // Mock trending searches
      const trendingMagnifyingGlasses: TrendingItem[] = [
        {
          id: '1',
          type: 'search',
          name: 'verus staking',
          value: '342 searches',
          trend: 45,
          link: '/?tab=explorer',
        },
        {
          id: '2',
          type: 'search',
          name: 'latest blocks',
          value: '289 searches',
          trend: 32,
          link: '/?tab=explorer',
        },
        {
          id: '3',
          type: 'search',
          name: 'pbaas',
          value: '234 searches',
          trend: 28,
          link: '/?tab=explorer',
        },
        {
          id: '4',
          type: 'search',
          name: 'verusid registration',
          value: '187 searches',
          trend: 18,
          link: '/?tab=verusids',
        },
      ];

      const newData = {
        blocks: trendingBlocks,
        verusids: trendingVerusIDs,
        addresses: trendingAddresses,
        searches: trendingMagnifyingGlasses,
      };

      setTrendingData(newData);
      saveToCache(newData); // Cache results
      setIsLoading(false);
    } catch (error) {
      logger.error('Error fetching trending data:', error);
      setIsLoading(false);
    }
  }, [saveToCache]);

  // Load from cache first
  useEffect(() => {
    if (cachedData) {
      setTrendingData(cachedData);
      setIsLoading(false);
    }
  }, [cachedData]);

  // Initial fetch
  useEffect(() => {
    fetchTrendingData();
  }, [fetchTrendingData]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchTrendingData, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchTrendingData]);

  // Get items for current tab
  const getCurrentItems = () => {
    switch (activeTab) {
      case 'blocks':
        return trendingData.blocks;
      case 'verusids':
        return trendingData.verusids;
      case 'addresses':
        return trendingData.addresses;
      case 'all':
      default:
        return [
          ...trendingData.blocks.slice(0, 3),
          ...trendingData.verusids.slice(0, 3),
          ...trendingData.addresses.slice(0, 2),
        ].sort((a, b) => (b.trend || 0) - (a.trend || 0));
    }
  };

  const currentItems = getCurrentItems();

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-red-500">
              <Fire className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                Trending Now
                <Sparkle className="h-5 w-5 text-green-400 animate-pulse" />
              </h3>
              <p className="text-sm text-gray-400">
                What&apos;s hot on Verus blockchain
              </p>
            </div>
          </div>
          <div className="text-xs text-gray-400 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Live
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto">
          {[
            {
              key: 'all',
              label: 'All Trending',
              icon: TrendUp,
              count: currentItems.length,
            },
            {
              key: 'blocks',
              label: 'Blocks',
              icon: Database,
              count: trendingData.blocks.length,
            },
            {
              key: 'verusids',
              label: 'VerusIDs',
              icon: UsersThree,
              count: trendingData.verusids.length,
            },
            {
              key: 'addresses',
              label: 'Addresses',
              icon: Hash,
              count: trendingData.addresses.length,
            },
          ].map(({ key, label, icon: Icon, count }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                activeTab === key
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
              <span className="text-xs opacity-75">({count})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Trending Items */}
      <div className="p-6">
        {isLoading && currentItems.length === 0 ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <TrendingItemSkeleton key={i} />
            ))}
          </div>
        ) : currentItems.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <TrendUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No trending items yet</p>
            <p className="text-xs mt-1">Check back soon!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {currentItems.map((item, index) => (
              <TrendingCard key={item.id} item={item} rank={index + 1} />
            ))}
          </div>
        )}
      </div>

      {/* Popular MagnifyingGlasses Footer */}
      {trendingData.searches.length > 0 && (
        <div className="px-6 pb-6">
          <div className="bg-white/5 rounded-lg p-4 border border-slate-700">
            <div className="flex items-center gap-2 mb-3">
              <MagnifyingGlass className="h-4 w-4 text-blue-400" />
              <span className="text-sm font-semibold text-white">
                Popular MagnifyingGlasses
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {trendingData.searches.slice(0, 4).map(search => (
                <Link
                  key={search.id}
                  href={search.link}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-verus-blue/60 rounded-full text-xs text-blue-300 hover:text-blue-200 transition-all flex items-center gap-1"
                >
                  <span>&quot;{search.name}&quot;</span>
                  <CaretRight className="h-3 w-3" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* View More Link */}
      <div className="px-6 pb-6">
        <Link
          href="/?tab=explorer"
          className="group w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-verus-blue/60 text-white rounded-lg border border-slate-700 hover:border-verus-blue/50 transition-all"
        >
          <TrendUp className="h-4 w-4" />
          <span className="font-medium">Explore All Trending</span>
          <ArrowUpRight className="h-4 w-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
        </Link>
      </div>
    </div>
  );
}

// Compact Trending Widget (for sidebars)
export function TrendingWidget() {
  const [topItems, setTopItems] = useState<TrendingItem[]>([]);

  useEffect(() => {
    const fetchTop = async () => {
      try {
        const res = await fetch('/api/verusids/staking-leaderboard?limit=3');
        const data = await res.json();

        if (data?.data?.leaderboard) {
          const items = data.data.leaderboard.map((id: any, index: number) => ({
            id: id.address || id.identityaddress || id.iaddress,
            type: 'verusid' as const,
            name:
              id.friendlyName ||
              id.displayName ||
              id.friendlyname ||
              `${id.name}@`,
            value: `${(id.totalRewardsVRSC || id.total_rewards || 0).toFixed(2)} VRSC`,
            trend: 90 - index * 15,
            link: `/verusid/${id.address || id.identityaddress || id.iaddress}`,
          }));
          setTopItems(items);
        }
      } catch (error) {
        logger.error('Error fetching trending widget:', error);
      }
    };

    fetchTop();
  }, []);

  return (
    <div className="bg-slate-900 rounded-xl p-4 border border-slate-700">
      <div className="flex items-center gap-2 mb-3">
        <Fire className="h-4 w-4 text-blue-400" />
        <h4 className="text-sm font-bold text-white">Trending</h4>
      </div>
      <div className="space-y-2">
        {topItems.map((item, index) => (
          <Link
            key={item.id}
            href={item.link}
            className="group flex items-center justify-between p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-verus-blue/60 transition-all"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span
                className={`text-xs font-bold ${
                  index === 0 ? 'text-green-400' : 'text-gray-400'
                }`}
              >
                #{index + 1}
              </span>
              <span className="text-sm text-white truncate">{item.name}</span>
            </div>
            <div className="flex items-center gap-1">
              <TrendUp className="h-3 w-3 text-green-400" />
              <span className="text-xs text-green-400 font-bold">
                +{item.trend}%
              </span>
            </div>
          </Link>
        ))}
      </div>
      <Link
        href="/?tab=verusids"
        className="mt-3 text-xs text-blue-400 hover:text-blue-400-light flex items-center justify-center gap-1 transition-colors"
      >
        View All Trending
        <CaretRight className="h-3 w-3" />
      </Link>
    </div>
  );
}
