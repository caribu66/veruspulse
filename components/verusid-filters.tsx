'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  MagnifyingGlass,
  Funnel,
  X,
  SlidersHorizontal,
  Clock,
  TrendUp,
  Star,
  Pulse,
} from '@phosphor-icons/react';
import { type FilterState } from '@/lib/types/verusid-browse-types';
import { getQuickFilterPresets } from '@/lib/utils/verusid-utils';

interface VerusIDFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onQuickFilter: (presetKey: string) => void;
  totalIdentities: number;
  filteredCount: number;
}

export function VerusIDFilters({
  filters,
  onFiltersChange,
  onQuickFilter,
  totalIdentities,
  filteredCount,
}: VerusIDFiltersProps) {
  const tCommon = useTranslations('common');
  const tBlocks = useTranslations('blocks');
  const tVerusId = useTranslations('verusid');
  const tStaking = useTranslations('staking');
  const [isExpanded, setIsExpanded] = useState(false);
  const [localFilters, setLocalFilters] = useState(filters);

  // Update local filters when props change
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleFilterChange = (key: keyof FilterState, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const resetFilters = () => {
    const defaultFilters: FilterState = {
      stakeRange: [0, 100000],
      apyRange: [0, 1000],
      activityStatus: 'all',
      searchQuery: '',
      top100Only: false,
    };
    setLocalFilters(defaultFilters);
    onFiltersChange(defaultFilters);
  };

  const applyQuickFilter = (presetKey: string) => {
    onQuickFilter(presetKey);
  };

  const activeFilterCount = [
    filters.searchQuery,
    filters.stakeRange[0] > 0 || filters.stakeRange[1] < 100000,
    filters.apyRange[0] > 0 || filters.apyRange[1] < 1000,
    filters.activityStatus !== 'all',
    filters.top100Only,
  ].filter(Boolean).length;

  const presets = getQuickFilterPresets();

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-300 dark:border-slate-700 p-6">
      {/* Filter Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <Funnel className="h-5 w-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">{tCommon("filter")}</h3>
          {activeFilterCount > 0 && (
            <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full">
              {activeFilterCount} active
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-blue-200">
            {filteredCount} of {totalIdentities}
          </span>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center space-x-1 px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span className="text-sm">{isExpanded ? 'Less' : 'More'}</span>
          </button>
        </div>
      </div>

      {/* Search Bar - Modern Design */}
      <div className="mb-6">
        <div className="relative group">
          {/* Search Icon with Animation */}
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-verus-blue transition-all duration-300 group-focus-within:scale-110">
            <MagnifyingGlass className="h-5 w-5" weight="bold" />
          </div>

          {/* Input Field with Gradient Border */}
          <input
            type="text"
            placeholder="Search by name (e.g., VerusPulse@) or I-address..."
            value={localFilters.searchQuery}
            onChange={e => handleFilterChange('searchQuery', e.target.value)}
            className="w-full pl-12 pr-12 py-4
              bg-gradient-to-br from-slate-800/80 to-slate-900/80
              backdrop-blur-xl
              border-2 border-slate-700/50
              rounded-2xl
              text-white text-base
              placeholder-slate-400
              shadow-lg shadow-black/10
              transition-all duration-300
              focus:outline-none
              focus:border-verus-blue/60
              focus:shadow-xl focus:shadow-verus-blue/20
              focus:bg-gradient-to-br focus:from-slate-800/90 focus:to-slate-900/90
              hover:border-slate-600/60"
          />

          {/* Clear Button with Hover Effect */}
          {localFilters.searchQuery && (
            <button
              onClick={() => handleFilterChange('searchQuery', '')}
              className="absolute right-4 top-1/2 transform -translate-y-1/2
                text-slate-400 hover:text-white
                bg-slate-700/50 hover:bg-red-500/80
                rounded-full p-1.5
                transition-all duration-200
                hover:scale-110 hover:rotate-90"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" weight="bold" />
            </button>
          )}

          {/* Subtle Glow Effect on Focus */}
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-verus-blue/10 via-purple-500/10 to-verus-blue/10 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
        </div>
      </div>

      {/* Quick Filters */}
      <div className="mb-4">
        <div className="flex flex-wrap gap-2">
          {/* Show All Button */}
          <button
            onClick={() => {
              const defaultFilters: FilterState = {
                stakeRange: [0, 100000],
                apyRange: [0, 1000],
                activityStatus: 'all',
                searchQuery: '',
                top100Only: false,
              };
              setLocalFilters(defaultFilters);
              onFiltersChange(defaultFilters);
            }}
            className={`flex items-center space-x-1 px-3 py-1 border rounded-lg text-sm transition-all ${
              !filters.searchQuery &&
              filters.stakeRange[0] === 0 &&
              filters.stakeRange[1] === 100000 &&
              filters.apyRange[0] === 0 &&
              filters.apyRange[1] === 1000 &&
              filters.activityStatus === 'all' &&
              !filters.top100Only
                ? 'bg-green-500/30 border-green-500/50 text-white'
                : 'bg-white/10 hover:bg-green-500/30 border-slate-300 dark:border-slate-700 hover:border-green-500/50 text-blue-100 hover:text-white'
            }`}
            title="Show all identities without any filters"
          >
            <span>Show All</span>
          </button>

          {Object.entries(presets).map(([key, preset]) => {
            const isActive =
              (key === 'top-100' && filters.top100Only) ||
              (key === 'high-apy' && filters.apyRange[0] >= 50) ||
              (key === 'active-stakers' &&
                filters.activityStatus === 'active-7d') ||
              (key === 'high-stakes' && filters.stakeRange[0] >= 1000);

            return (
              <button
                key={key}
                onClick={() => applyQuickFilter(key)}
                className={`flex items-center space-x-1 px-3 py-1 border rounded-lg text-sm transition-all ${
                  isActive
                    ? 'bg-blue-500/30 border-blue-500/50 text-white'
                    : 'bg-white/10 hover:bg-blue-500/30 border-slate-300 dark:border-slate-700 hover:border-blue-500/50 text-blue-100 hover:text-white'
                }`}
                title={preset.description}
              >
                {key === 'top-100' && <Star className="h-3 w-3" />}
                {key === 'high-apy' && <TrendUp className="h-3 w-3" />}
                {key === 'active-stakers' && <Pulse className="h-3 w-3" />}
                {key === 'high-stakes' && <TrendUp className="h-3 w-3" />}
                <span>{preset.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Expanded Filters */}
      {isExpanded && (
        <div className="space-y-4 border-t border-slate-300 dark:border-slate-700 pt-4">
          {/* Stake Range */}
          <div>
            <label className="block text-sm font-medium text-blue-200 mb-2">
              Total Stakes: {localFilters.stakeRange[0]} -{' '}
              {localFilters.stakeRange[1]}
            </label>
            <div className="flex items-center space-x-4">
              <input
                type="range"
                min="0"
                max="10000"
                step="100"
                value={localFilters.stakeRange[0]}
                onChange={e =>
                  handleFilterChange('stakeRange', [
                    parseInt(e.target.value),
                    localFilters.stakeRange[1],
                  ])
                }
                className="flex-1"
              />
              <input
                type="range"
                min="0"
                max="10000"
                step="100"
                value={localFilters.stakeRange[1]}
                onChange={e =>
                  handleFilterChange('stakeRange', [
                    localFilters.stakeRange[0],
                    parseInt(e.target.value),
                  ])
                }
                className="flex-1"
              />
            </div>
          </div>

          {/* APY Range */}
          <div>
            <label className="block text-sm font-medium text-blue-200 mb-2">
              APY Range: {localFilters.apyRange[0]}% -{' '}
              {localFilters.apyRange[1]}%
            </label>
            <div className="flex items-center space-x-4">
              <input
                type="range"
                min="0"
                max="200"
                step="5"
                value={localFilters.apyRange[0]}
                onChange={e =>
                  handleFilterChange('apyRange', [
                    parseInt(e.target.value),
                    localFilters.apyRange[1],
                  ])
                }
                className="flex-1"
              />
              <input
                type="range"
                min="0"
                max="200"
                step="5"
                value={localFilters.apyRange[1]}
                onChange={e =>
                  handleFilterChange('apyRange', [
                    localFilters.apyRange[0],
                    parseInt(e.target.value),
                  ])
                }
                className="flex-1"
              />
            </div>
          </div>

          {/* Activity Status */}
          <div>
            <label className="block text-sm font-medium text-blue-200 mb-2">
              Activity Status
            </label>
            <select
              value={localFilters.activityStatus}
              onChange={e =>
                handleFilterChange('activityStatus', e.target.value)
              }
              className="w-full px-3 py-2 bg-white/10 border border-slate-300 dark:border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Identities</option>
              <option value="active-7d">Active (last 7 days)</option>
              <option value="active-30d">Active (last 30 days)</option>
              <option value="inactive">Inactive (30+ days)</option>
            </select>
          </div>
        </div>
      )}

      {/* Filter Actions */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-300 dark:border-slate-700">
        <button
          onClick={resetFilters}
          className="flex items-center space-x-2 px-4 py-2 text-blue-300 hover:text-white transition-colors"
        >
          <X className="h-4 w-4" />
          <span className="text-sm">Reset All</span>
        </button>

        <div className="text-xs text-blue-200">
          Showing {filteredCount} of {totalIdentities} identities
        </div>
      </div>
    </div>
  );
}
