'use client';

import { useState, useEffect } from 'react';
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
import { FilterState } from '@/lib/types/verusid-browse-types';
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
          <h3 className="text-lg font-semibold text-white">Filters</h3>
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

      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative">
          <MagnifyingGlass className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-blue-300" />
          <input
            type="text"
            placeholder="Search by name, friendly name, or address..."
            value={localFilters.searchQuery}
            onChange={e => handleFilterChange('searchQuery', e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/10 border border-slate-300 dark:border-slate-700 rounded-lg text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {localFilters.searchQuery && (
            <button
              onClick={() => handleFilterChange('searchQuery', '')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-300 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
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
