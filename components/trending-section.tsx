'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  TrendUp,
  Fire,
  Eye,
  MagnifyingGlass,
  UsersThree,
  Database,
  Pulse,
  ArrowUpRight,
  Clock,
  Hash,
  CurrencyDollar,
  CaretRight,
  Sparkle,
  User,
} from '@phosphor-icons/react';
import Link from 'next/link';
import { useLocalStorageCache } from '@/lib/hooks/use-local-storage-cache';
import { logger } from '@/lib/utils/logger';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { TrendingItemSkeleton } from './skeleton-loader';
import { sanitizeInput, validateRequestSize } from '@/lib/utils/validation';

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
          color: 'text-slate-300',
          bgColor: 'bg-slate-600/10',
          borderColor: 'border-slate-500/20',
        };
      case 'verusid':
        return {
          icon: User,
          color: 'text-verus-blue',
          bgColor: 'bg-verus-blue/10',
          borderColor: 'border-verus-blue/20',
        };
      case 'address':
        return {
          icon: Hash,
          color: 'text-slate-200',
          bgColor: 'bg-slate-500/10',
          borderColor: 'border-slate-400/20',
        };
      case 'transaction':
        return {
          icon: Pulse,
          color: 'text-slate-300',
          bgColor: 'bg-slate-600/10',
          borderColor: 'border-slate-500/20',
        };
      case 'search':
        return {
          icon: MagnifyingGlass,
          color: 'text-slate-200',
          bgColor: 'bg-slate-500/10',
          borderColor: 'border-slate-400/20',
        };
      default:
        return {
          icon: Pulse,
          color: 'text-slate-400',
          bgColor: 'bg-slate-600/10',
          borderColor: 'border-slate-500/20',
        };
    }
  };

  const config = getTypeConfig();
  const Icon = config.icon;
  const isTopThree = rank <= 3;

  // Track view when card is clicked (simplified - no authentication needed)
  const handleClick = async () => {
    if (item.type === 'verusid') {
      try {
        // Simple analytics tracking without authentication
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Sanitize the VerusID address for security
        const sanitizedAddress = sanitizeInput(item.id, 255);

        await fetch('/api/analytics/views', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            verusidAddress: sanitizedAddress,
            sessionId: sessionId,
          }),
        });
      } catch (error) {
        // Silent fail for view tracking
        console.debug('View tracking failed:', error);
      }
    }
  };

  return (
    <Link
      href={item.link}
      onClick={handleClick}
      className={`group relative bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:border-verus-blue/60 rounded-xl p-4 transition-all duration-300 hover:shadow-lg ${
        isTopThree ? 'ring-1 ring-verus-blue/30' : ''
      }`}
    >
      {/* Hot Badge for Top Item */}
      {rank === 1 && (
        <div className="absolute -top-2 -right-2 bg-gray-800 text-white text-xs px-2 py-1 rounded-full font-bold flex items-center gap-1 shadow-lg">
          <Fire className="h-3 w-3" />
          HOT
        </div>
      )}

      <div className="flex items-center gap-4">
        {/* Rank Badge */}
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-lg flex-shrink-0 ${
            rank === 1
              ? 'bg-gray-800 text-white'
              : rank === 2
                ? 'bg-gray-700 text-white'
                : rank === 3
                  ? 'bg-gray-600 text-white'
                  : 'bg-gray-500 text-white'
          }`}
        >
          {rank}
        </div>

        {/* Icon */}
        <div
          className={`p-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 group-hover:scale-105 transition-transform flex-shrink-0`}
        >
          <Icon className={`h-4 w-4 text-slate-600 dark:text-slate-300`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-gray-900 dark:text-white font-semibold truncate flex items-center gap-2">
              {item.name}
              <ArrowUpRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
            </h4>
          </div>

          <div className="flex items-center gap-4 text-sm mb-2">
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {item.value}
            </span>
            {item.views && (
              <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                <Eye className="h-3 w-3" />
                {item.views.toLocaleString()} views
              </span>
            )}
          </div>

          {/* Trend Indicator */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <TrendUp
                className={`h-4 w-4 ${
                  item.trend > 0
                    ? 'text-gray-600 dark:text-gray-400'
                    : item.trend < 0
                      ? 'text-gray-500 dark:text-gray-500'
                      : 'text-gray-400 dark:text-gray-500'
                }`}
              />
              <span
                className={`text-sm font-bold ${
                  item.trend > 0
                    ? 'text-gray-600 dark:text-gray-400'
                    : item.trend < 0
                      ? 'text-gray-500 dark:text-gray-500'
                      : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                {item.trend > 0 ? '+' : ''}
                {item.trend}%
              </span>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              trending
            </span>

            {/* Metadata */}
            {item.metadata && (
              <div className="text-xs text-gray-500 dark:text-gray-400 ml-auto flex items-center gap-2">
                {item.type === 'verusid' && (
                  <>
                    {item.metadata.apy > 0 && (
                      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full border border-gray-200 dark:border-gray-700">
                        {item.metadata.apy.toFixed(1)}% APY
                      </span>
                    )}
                    {item.metadata.efficiency > 0 && (
                      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full border border-gray-200 dark:border-gray-700">
                        {(item.metadata.efficiency * 100).toFixed(0)}% Eff
                      </span>
                    )}
                    {item.metadata.stakes > 0 && (
                      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full border border-gray-200 dark:border-gray-700">
                        {item.metadata.stakes} stakes
                      </span>
                    )}
                  </>
                )}
                {item.type === 'block' && item.metadata.height && (
                  <span>Height: {item.metadata.height.toLocaleString()}</span>
                )}
                {item.metadata.rank && <span>Rank #{item.metadata.rank}</span>}
              </div>
            )}
          </div>

          {/* Progress Bar (Performance Visualization) */}
          <div className="mt-3 h-1 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${
                item.type === 'verusid'
                  ? item.metadata?.efficiency > 0.8
                    ? 'bg-gray-600'
                    : item.metadata?.efficiency > 0.6
                      ? 'bg-gray-500'
                      : 'bg-gray-400'
                  : item.trend > 0
                    ? 'bg-gray-600'
                    : item.trend < 0
                      ? 'bg-gray-400'
                      : 'bg-gray-500'
              }`}
              style={{
                width:
                  item.type === 'verusid' && item.metadata?.efficiency > 0
                    ? `${Math.min(item.metadata.efficiency * 100, 100)}%`
                    : `${Math.min(Math.abs(item.trend), 100)}%`,
              }}
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

      // Fetch top VerusIDs (already filtered by API to only include direct I-address stakers)
      const verusidsRes = await fetch(
        '/api/verusids/staking-leaderboard?limit=10'
      );
      const verusidsData = await verusidsRes.json();

      // Process blocks for trending (using real data)
      const trendingBlocks: TrendingItem[] = (blocksData?.data?.blocks || [])
        .filter((block: any) => block.nTx > 2) // Blocks with more transactions
        .slice(0, 5)
        .map((block: any, index: number) => ({
          id: block.hash,
          type: 'block' as const,
          name: `Block #${block.height.toLocaleString()}`,
          value: `${block.nTx} transactions`,
          trend: 0, // Will be filled by analytics when available
          views: 0, // Will be filled by analytics when available
          link: `/block/${block.hash}`,
          metadata: {
            height: block.height,
            time: block.time,
            size: block.size,
            miner: block.hasStakeReward ? 'Staked' : 'Mined',
          },
        }));

      // Process VerusIDs for trending (using real data)
      // Only show VerusIDs that earned their stakes with their I-address
      // This implements the I-Address Staking Rule: VerusIDs that received staking help
      // from other addresses (R-addresses) are filtered out and won't appear in trending
      const trendingVerusIDs: TrendingItem[] = (
        verusidsData?.data?.leaderboard || []
      )
        .filter((id: any) => (id.totalStakes || id.total_stakes || 0) > 0) // Only VerusIDs with direct I-address stakes
        .slice(0, 10)
        .map((id: any, index: number) => {
          // Prioritize friendlyName from the database
          const friendlyName =
            id.friendlyName || id.displayName || id.friendlyname;

          // Calculate trend percentage (use overall trend score or fallback to 0)
          const trendPercent = Math.round(id.overallTrendScore || 0);

          // Calculate views (use recent views or fallback to 0)
          const views = id.recentViews7d || 0;

          return {
            id: id.address || id.identityaddress || id.iaddress,
            type: 'verusid' as const,
            name: friendlyName || id.address || 'Unknown',
            value: `${(id.totalRewardsVRSC || id.total_rewards || id.totalRewards || 0).toFixed(2)} VRSC`,
            trend: Math.max(0, trendPercent), // Ensure non-negative trend
            views: views,
            link: `/verusid/${id.address || id.identityaddress || id.iaddress}`,
            metadata: {
              stakes: id.totalStakes || id.total_stakes || 0,
              rank: id.rank || id.networkRank || index + 1,
              apy: id.apy30d || id.apyAllTime || 0,
              efficiency: id.stakingEfficiency || 0,
              recentStakes: id.recentStakes7d || 0,
              recentRewards: id.recentRewards7d || 0,
              stakeTrend: id.stakeTrendPercent || 0,
              rewardTrend: id.rewardTrendPercent || 0,
              viewTrend: id.viewTrendPercent || 0,
            },
          };
        });

      // Fetch real trending addresses from recent transactions
      let trendingAddresses: TrendingItem[] = [];
      try {
        const addressesRes = await fetch('/api/latest-transactions?limit=20');
        const addressesData = await addressesRes.json();

        if (addressesData?.data?.transactions) {
          // Count address activity from recent transactions
          const addressCounts = new Map<
            string,
            { count: number; totalValue: number; name: string }
          >();

          addressesData.data.transactions.forEach((tx: any) => {
            // Count input addresses
            tx.vin?.forEach((input: any) => {
              if (input.addresses) {
                input.addresses.forEach((addr: string) => {
                  if (!addressCounts.has(addr)) {
                    addressCounts.set(addr, {
                      count: 0,
                      totalValue: 0,
                      name: addr,
                    });
                  }
                  const data = addressCounts.get(addr)!;
                  data.count++;
                  data.totalValue += input.value || 0;
                });
              }
            });

            // Count output addresses
            tx.vout?.forEach((output: any) => {
              if (output.scriptPubKey?.addresses) {
                output.scriptPubKey.addresses.forEach((addr: string) => {
                  if (!addressCounts.has(addr)) {
                    addressCounts.set(addr, {
                      count: 0,
                      totalValue: 0,
                      name: addr,
                    });
                  }
                  const data = addressCounts.get(addr)!;
                  data.count++;
                  data.totalValue += output.value || 0;
                });
              }
            });
          });

          // Convert to trending items, sorted by activity
          trendingAddresses = Array.from(addressCounts.entries())
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 3)
            .map(([address, data], index) => ({
              id: address,
              type: 'address' as const,
              name: `${address.slice(0, 6)}...${address.slice(-4)}`,
              value:
                data.totalValue > 1000
                  ? `${(data.totalValue / 1000).toFixed(0)}K VRSC`
                  : `${data.totalValue.toFixed(0)} VRSC`,
              trend: 0, // Will be filled by analytics when available
              views: 0, // Will be filled by analytics when available
              link: `/address/${address}`,
              metadata: { address, transactionCount: data.count },
            }));
        }
      } catch (error) {
        logger.warn('Failed to fetch trending addresses:', error);
        // Fallback to empty array if API fails
        trendingAddresses = [];
      }

      // Popular search terms - empty for now, will be populated by analytics
      const trendingMagnifyingGlasses: TrendingItem[] = [];

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
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-300 dark:border-slate-700 overflow-hidden shadow-lg">
      {/* Header */}
      <div className="p-6 border-b border-slate-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700">
              <Fire className="h-6 w-6 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                Trending Now
                <Sparkle className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                What&apos;s hot on Verus blockchain
              </p>
            </div>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
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
                  ? 'bg-gray-800 text-white shadow-md'
                  : 'bg-white dark:bg-slate-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-600 hover:text-gray-900 dark:hover:text-white border border-slate-300 dark:border-slate-600'
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
          <div className="bg-gray-50 dark:bg-white/5 rounded-lg p-4 border border-slate-300 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-3">
              <MagnifyingGlass className="h-4 w-4 text-slate-300 dark:text-slate-300" />
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                Popular MagnifyingGlasses
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {trendingData.searches.slice(0, 4).map(search => (
                <Link
                  key={search.id}
                  href={search.link}
                  className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500/60 rounded-full text-xs text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-200 transition-all flex items-center gap-1"
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
          className="group w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-600 text-white rounded-lg transition-all shadow-md hover:shadow-lg"
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
          const items = data.data.leaderboard.map((id: any, index: number) => {
            // Use friendlyName from database
            const friendlyName =
              id.friendlyName || id.displayName || id.friendlyname;

            // Use real trend data or fallback to calculated trend
            const trendPercent = Math.round(
              id.overallTrendScore || Math.max(10, 85 - index * 20)
            );

            return {
              id: id.address || id.identityaddress || id.iaddress,
              type: 'verusid' as const,
              name: friendlyName || id.address || 'Unknown',
              value: `${(id.totalRewardsVRSC || id.total_rewards || 0).toFixed(2)} VRSC`,
              trend: Math.max(0, trendPercent),
              link: `/verusid/${id.address || id.identityaddress || id.iaddress}`,
            };
          });
          setTopItems(items);
        }
      } catch (error) {
        logger.error('Error fetching trending widget:', error);
      }
    };

    fetchTop();
  }, []);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-300 dark:border-slate-700 shadow-md">
      <div className="flex items-center gap-2 mb-3">
        <Fire className="h-4 w-4 text-gray-600 dark:text-gray-400" />
        <h4 className="text-sm font-bold text-gray-900 dark:text-white">
          Trending
        </h4>
      </div>
      <div className="space-y-2">
        {topItems.map((item, index) => (
          <Link
            key={item.id}
            href={item.link}
            className="group flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-600 hover:border-gray-400 dark:hover:border-gray-500 transition-all"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span
                className={`text-xs font-bold ${
                  index === 0
                    ? 'text-gray-800 dark:text-gray-200'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                #{index + 1}
              </span>
              <span className="text-sm text-gray-900 dark:text-white truncate">
                {item.name}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <TrendUp className="h-3 w-3 text-gray-600 dark:text-gray-400" />
              <span className="text-xs text-gray-600 dark:text-gray-400 font-bold">
                +{item.trend}%
              </span>
            </div>
          </Link>
        ))}
      </div>
      <Link
        href="/?tab=explorer"
        className="mt-3 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 flex items-center justify-center gap-2 transition-colors font-medium"
      >
        Explore All Data
        <ArrowUpRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
