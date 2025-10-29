'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Database,
  GridFour,
  SortAscending,
  SortDescending,
  ArrowsClockwise,
  WarningCircle,
  UsersThree,
  Eye,
  Table,
} from '@phosphor-icons/react';
import { VerusIDFilters } from './verusid-filters';
import { VerusIDCardGrid } from './verusid-card-grid';
import { VerusIDTableView } from './verusid-table-view';
import {
  VerusIDBrowseData,
  FilterState,
  SortOptions,
  ViewMode,
} from '@/lib/types/verusid-browse-types';
import {
  filterIdentitiesByStakeRange,
  filterIdentitiesByAPYRange,
  filterIdentitiesByActivity,
  searchIdentities,
  sortIdentities,
  searchVerusIDViaRPC,
} from '@/lib/utils/verusid-utils';
import { useApiFetch } from '@/lib/hooks/use-retryable-fetch';
import { useMobileOptimizations } from './mobile-optimizations';

const ITEMS_PER_PAGE = 50;

export function BrowseAllVerusIDs() {
  const router = useRouter();
  const { isMobile } = useMobileOptimizations();

  // State management
  const [identities, setIdentities] = useState<VerusIDBrowseData[]>([]);
  const [rpcSearchResults, setRpcSearchResults] = useState<VerusIDBrowseData[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode['mode']>('cards');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOptions, setSortOptions] = useState<SortOptions>({
    sortBy: 'stakes',
    sortOrder: 'desc',
  });
  const [filters, setFilters] = useState<FilterState>({
    stakeRange: [0, 100000], // Increased max to include more identities
    apyRange: [0, 1000], // Increased max to include more identities
    activityStatus: 'all',
    searchQuery: '',
    top100Only: false,
  });

  const { apiFetch } = useApiFetch();

  // Force card view on mobile
  const effectiveViewMode = isMobile ? 'cards' : viewMode;

  const loadIdentities = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await apiFetch('/api/verusids/browse?limit=100', {
        method: 'GET',
      });

      if (result?.success && result.data) {
        // Map the browse API response to our expected format
        const mappedIdentities = result.data.identities.map(
          (identity: any) => ({
            address: identity.address,
            baseName: identity.name,
            friendlyName: identity.friendlyName,
            displayName: identity.displayName,
            firstSeenBlock: identity.firstSeenBlock,
            lastScannedBlock: identity.lastScannedBlock,
            lastRefreshed: identity.lastRefreshed,
            totalStakes: identity.totalStakes,
            totalRewardsVRSC: identity.totalRewardsVRSC,
            firstStakeTime: null,
            lastStakeTime: identity.lastStake,
            apyAllTime: identity.apyAllTime,
            apyYearly: null,
            apy90d: null,
            apy30d: null,
            apy7d: null,
            roiAllTime: null,
            stakingEfficiency: null,
            avgStakeAge: null,
            networkRank: identity.networkRank,
            networkPercentile: null,
            eligibleUtxos: 0,
            currentUtxos: 0,
            cooldownUtxos: 0,
            totalValueVRSC: identity.totalValueVRSC || 0, // Use actual balance data
            eligibleValueVRSC: 0,
            largestUtxoVRSC: 0,
            smallestEligibleVRSC: 0,
            highestRewardVRSC: 0,
            lowestRewardVRSC: 0,
            lastCalculated: null,
            dataCompleteness: 100,
            activityStatus: identity.activityStatus || 'inactive',
            daysSinceLastStake: identity.daysSinceLastStake || null,
          })
        );
        setIdentities(mappedIdentities);
      } else {
        setError(result?.error || 'Failed to load identities');
      }
    } catch (err) {
      setError('Network error while loading identities');
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  // Load identities on mount
  useEffect(() => {
    loadIdentities();
  }, [loadIdentities]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Escape key to show all identities
      if (event.key === 'Escape') {
        setFilters({
          stakeRange: [0, 100000],
          apyRange: [0, 1000],
          activityStatus: 'all',
          searchQuery: '',
          top100Only: false,
        });
        setCurrentPage(1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Apply filters and sorting
  const filteredAndSortedIdentities = useMemo(() => {
    // Combine database identities with RPC search results
    let allIdentities = [...identities, ...rpcSearchResults];

    // Remove duplicates based on address
    const uniqueIdentities = allIdentities.filter(
      (identity, index, self) =>
        index === self.findIndex(id => id.address === identity.address)
    );

    let filtered = uniqueIdentities;

    // Apply search
    if (filters.searchQuery) {
      filtered = searchIdentities(filtered, filters.searchQuery);
    }

    // Apply stake range filter
    filtered = filterIdentitiesByStakeRange(
      filtered,
      filters.stakeRange[0],
      filters.stakeRange[1]
    );

    // Apply APY range filter
    filtered = filterIdentitiesByAPYRange(
      filtered,
      filters.apyRange[0],
      filters.apyRange[1]
    );

    // Apply activity filter
    filtered = filterIdentitiesByActivity(filtered, filters.activityStatus);

    // Apply "Top 100" filter if enabled
    if (filters.top100Only) {
      filtered = filtered.filter(id => id.networkRank && id.networkRank <= 100);
    }

    // Apply sorting
    filtered = sortIdentities(
      filtered,
      sortOptions.sortBy,
      sortOptions.sortOrder
    );

    return filtered;
  }, [identities, rpcSearchResults, filters, sortOptions]);

  // Pagination
  const totalPages = Math.ceil(
    filteredAndSortedIdentities.length / ITEMS_PER_PAGE
  );
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedIdentities = filteredAndSortedIdentities.slice(
    startIndex,
    endIndex
  );

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, sortOptions]);

  const handleSort = (sortBy: SortOptions['sortBy']) => {
    setSortOptions(prev => ({
      sortBy,
      sortOrder:
        prev.sortBy === sortBy && prev.sortOrder === 'asc' ? 'desc' : 'asc',
    }));
  };

  const toggleSortOrder = () => {
    setSortOptions(prev => ({
      ...prev,
      sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc',
    }));
  };

  // Search RPC for identities not in database
  const searchRPCForIdentity = async (query: string) => {
    if (!query.trim()) {
      setRpcSearchResults([]);
      return;
    }

    try {
      const rpcResult = await searchVerusIDViaRPC(query);
      if (rpcResult) {
        setRpcSearchResults([rpcResult]);

        // 🚀 PRIORITY SCANNING: Trigger priority scan for found VerusID
        if (rpcResult.address) {
          try {
            await fetch('/api/verusid/priority-scan', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ identityAddress: rpcResult.address }),
            });
          } catch (error) {
            // Silent error handling for priority scan
          }
        }
      } else {
        setRpcSearchResults([]);
      }
    } catch (error) {
      setRpcSearchResults([]);
    }
  };

  // Update RPC search when search query changes
  useEffect(() => {
    if (filters.searchQuery) {
      searchRPCForIdentity(filters.searchQuery);
    } else {
      setRpcSearchResults([]);
    }
  }, [filters.searchQuery]);

  const handleQuickFilter = (presetKey: string) => {
    // Apply quick filter by setting appropriate filter values
    switch (presetKey) {
      case 'top-100':
        setFilters(prev => ({
          ...prev,
          top100Only: !prev.top100Only, // Toggle the Top 100 filter
          stakeRange: [0, 100000],
          apyRange: [0, 1000],
          activityStatus: 'all',
        }));
        break;
      case 'high-apy':
        setFilters(prev => ({
          ...prev,
          apyRange: [50, 1000], // APY > 50%
          stakeRange: [0, 100000],
          activityStatus: 'all',
        }));
        break;
      case 'active-stakers':
        setFilters(prev => ({
          ...prev,
          activityStatus: 'active-7d', // Active in last 7 days
          stakeRange: [0, 100000],
          apyRange: [0, 1000],
        }));
        break;
      case 'high-stakes':
        setFilters(prev => ({
          ...prev,
          stakeRange: [1000, 100000], // > 1000 stakes
          apyRange: [0, 1000],
          activityStatus: 'all',
        }));
        break;
      default:
        // Reset all filters
        setFilters({
          stakeRange: [0, 100000],
          apyRange: [0, 1000],
          activityStatus: 'all',
          searchQuery: '',
          top100Only: false,
        });
    }
  };

  const handleIdentityClick = (identity: VerusIDBrowseData) => {
    // Open VerusID detail page in a new tab for better UX
    // Use I-address for reliable lookups (baseName might be "unknown")
    const url = `/verusid/${encodeURIComponent(identity.address)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (
      <div className="max-w-[1800px] mx-auto space-y-6">
        {/* Header Skeleton */}
        <div className="bg-slate-900 rounded-2xl p-8 border border-slate-700">
          <div className="animate-pulse">
            <div className="h-8 bg-slate-700 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-slate-700 rounded w-1/2"></div>
          </div>
        </div>

        {/* Filters Skeleton */}
        <div className="bg-slate-900 rounded-2xl p-6 border border-slate-700">
          <div className="animate-pulse">
            <div className="h-6 bg-slate-700 rounded w-1/4 mb-4"></div>
            <div className="h-10 bg-slate-700 rounded w-full"></div>
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="bg-slate-800 border border-slate-700 rounded-lg p-4"
            >
              <div className="animate-pulse">
                <div className="h-4 bg-slate-700 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-slate-700 rounded w-1/2 mb-4"></div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="h-8 bg-slate-700 rounded"></div>
                  <div className="h-8 bg-slate-700 rounded"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-[1800px] mx-auto">
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8">
          <div className="flex items-start space-x-3">
            <WarningCircle className="h-6 w-6 text-red-400 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="text-red-400 font-semibold text-lg mb-2">
                Error Loading Identities
              </h3>
              <p className="text-red-300 text-sm mb-4">{error}</p>
              <button
                onClick={loadIdentities}
                className="flex items-center space-x-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm transition-colors"
              >
                <ArrowsClockwise className="h-4 w-4" />
                <span>Try Again</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1800px] mx-auto space-y-6 px-4 md:px-0">
      {/* Header */}
      <div className="bg-slate-900 rounded-2xl p-4 md:p-8 border border-slate-700">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <Database className="h-6 w-6 md:h-8 md:w-8 text-blue-400" />
              <h1 className="text-xl md:text-3xl font-bold text-white">
                Browse All VerusIDs
              </h1>
            </div>
            <p className="text-sm md:text-base text-blue-200">
              Explore all registered VerusID identities with comprehensive
              staking analytics
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            {/* View Toggle - Hidden on mobile (auto card view) */}
            {!isMobile && (
              <div className="bg-gray-100 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl p-1">
                <button
                  onClick={() => setViewMode('cards')}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                    viewMode === 'cards'
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-600 dark:text-white/70 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10'
                  }`}
                >
                  <GridFour className="h-4 w-4" />
                  <span className="hidden sm:inline">Cards</span>
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                    viewMode === 'table'
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-600 dark:text-white/70 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10'
                  }`}
                >
                  <Table className="h-4 w-4" />
                  <span className="hidden sm:inline">Table</span>
                </button>
              </div>
            )}

            {/* Show All Button */}
            <button
              onClick={() => {
                setFilters({
                  stakeRange: [0, 100000],
                  apyRange: [0, 1000],
                  activityStatus: 'all',
                  searchQuery: '',
                  top100Only: false,
                });
                setCurrentPage(1);
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 hover:border-green-500/50 rounded-lg transition-colors"
            >
              <UsersThree className="h-4 w-4" />
              <span>Show All</span>
            </button>

            {/* Refresh Button */}
            <button
              onClick={loadIdentities}
              className="flex items-center space-x-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            >
              <ArrowsClockwise className="h-4 w-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/10 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-1">
              <UsersThree className="h-4 w-4 text-blue-300" />
              <span className="text-sm text-blue-200">Total Identities</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {identities.length}
            </div>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-1">
              <Eye className="h-4 w-4 text-green-300" />
              <span className="text-sm text-blue-200">Showing</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {filteredAndSortedIdentities.length}
            </div>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-1">
              <Database className="h-4 w-4 text-purple-300" />
              <span className="text-sm text-blue-200">
                Page {currentPage} of {totalPages}
              </span>
            </div>
            <div className="text-2xl font-bold text-white">
              {startIndex + 1}-
              {Math.min(endIndex, filteredAndSortedIdentities.length)}
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <VerusIDFilters
        filters={filters}
        onFiltersChange={setFilters}
        onQuickFilter={handleQuickFilter}
        totalIdentities={identities.length}
        filteredCount={filteredAndSortedIdentities.length}
      />

      {/* Sort Controls */}
      <div className="bg-slate-900 rounded-2xl border border-slate-700 p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <span className="text-sm text-blue-200">Sort by:</span>
          <div className="flex flex-wrap items-center gap-2">
            {[
              { key: 'name', label: 'Name' },
              { key: 'stakes', label: 'Stakes' },
              { key: 'rewards', label: 'Rewards' },
              { key: 'apy', label: 'APY' },
              { key: 'rank', label: 'Rank' },
              { key: 'recent', label: 'Recent' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => handleSort(key as SortOptions['sortBy'])}
                className={`flex items-center space-x-1 px-3 py-2 min-h-[44px] rounded-lg text-sm transition-colors ${
                  sortOptions.sortBy === key
                    ? 'bg-blue-500 text-white'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <span>{label}</span>
                {sortOptions.sortBy === key &&
                  (sortOptions.sortOrder === 'asc' ? (
                    <SortAscending className="h-3 w-3" />
                  ) : (
                    <SortDescending className="h-3 w-3" />
                  ))}
              </button>
            ))}
            {/* Reverse Order Button */}
            <div className="w-px h-6 bg-slate-700 mx-1" /> {/* Divider */}
            <button
              onClick={toggleSortOrder}
              className="flex items-center space-x-2 px-4 py-2 min-h-[44px] bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors border border-slate-600"
              title={`Reverse order (currently ${sortOptions.sortOrder === 'asc' ? 'ascending' : 'descending'})`}
            >
              {sortOptions.sortOrder === 'asc' ? (
                <>
                  <SortAscending className="h-4 w-4" />
                  <span className="hidden sm:inline">First to Last</span>
                  <span className="sm:hidden">↑</span>
                </>
              ) : (
                <>
                  <SortDescending className="h-4 w-4" />
                  <span className="hidden sm:inline">Last to First</span>
                  <span className="sm:hidden">↓</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {effectiveViewMode === 'cards' ? (
        <VerusIDCardGrid
          identities={paginatedIdentities}
          onIdentityClick={handleIdentityClick}
        />
      ) : (
        <VerusIDTableView
          identities={paginatedIdentities}
          sortOptions={sortOptions}
          onSort={handleSort}
          onIdentityClick={handleIdentityClick}
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-slate-900 rounded-2xl border border-slate-700 p-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-blue-200">
              Showing {startIndex + 1} to{' '}
              {Math.min(endIndex, filteredAndSortedIdentities.length)} of{' '}
              {filteredAndSortedIdentities.length} identities
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                Previous
              </button>

              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-2 rounded-lg transition-colors ${
                        currentPage === pageNum
                          ? 'bg-blue-500 text-white'
                          : 'text-white/70 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                {totalPages > 5 && (
                  <>
                    <span className="text-white/50">...</span>
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      className={`px-3 py-2 rounded-lg transition-colors ${
                        currentPage === totalPages
                          ? 'bg-blue-500 text-white'
                          : 'text-white/70 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {totalPages}
                    </button>
                  </>
                )}
              </div>

              <button
                onClick={() =>
                  setCurrentPage(prev => Math.min(totalPages, prev + 1))
                }
                disabled={currentPage === totalPages}
                className="px-3 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
