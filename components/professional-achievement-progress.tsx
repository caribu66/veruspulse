'use client';

import React, { useState, useMemo } from 'react';
import {
  TrendUp,
  Target,
  Medal,
  Clock,
  Star,
  Crown,
  CheckCircle,
  Lock,
  ChartBar,
  ChartPie,
  Pulse,
  Calendar,
  Funnel,
  SortAscending,
  SortDescending,
} from '@phosphor-icons/react';

export interface ProfessionalAchievementData {
  slug: string;
  name: string;
  description: string;
  icon: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'legendary';
  category: 'milestone' | 'performance' | 'consistency' | 'special' | 'elite';
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  unlockedAt?: string;
  unlockValue?: number;
  current?: number;
  target?: number;
  percentage?: number;
  earned?: boolean;
}

export interface ProfessionalAchievementProgressProps {
  achievements: ProfessionalAchievementData[];
  recentUnlocks: ProfessionalAchievementData[];
  totalStats: {
    earned: number;
    available: number;
    progress: number;
  };
  rarityStats: Record<string, number>;
  className?: string;
}

type SortOption = 'unlockDate' | 'tier' | 'rarity' | 'progress' | 'name';
type FilterCategory =
  | 'all'
  | 'milestone'
  | 'performance'
  | 'consistency'
  | 'special'
  | 'elite';
type ViewMode = 'all' | 'earned' | 'progress' | 'locked';

const categoryIcons = {
  milestone: Target,
  performance: TrendUp,
  consistency: Clock,
  special: Star,
  elite: Crown,
};

const tierOrder = {
  bronze: 1,
  silver: 2,
  gold: 3,
  platinum: 4,
  legendary: 5,
};

const rarityOrder = {
  common: 1,
  uncommon: 2,
  rare: 3,
  epic: 4,
  legendary: 5,
};

const tierColors = {
  bronze: {
    bg: 'bg-slate-800/50',
    border: 'border-slate-600/50',
    text: 'text-slate-200',
    accent: 'bg-slate-500',
  },
  silver: {
    bg: 'bg-gray-800/50',
    border: 'border-gray-600/50',
    text: 'text-gray-200',
    accent: 'bg-gray-500',
  },
  gold: {
    bg: 'bg-slate-700/50',
    border: 'border-slate-500/50',
    text: 'text-slate-100',
    accent: 'bg-slate-400',
  },
  platinum: {
    bg: 'bg-slate-600/50',
    border: 'border-slate-400/50',
    text: 'text-white',
    accent: 'bg-slate-300',
  },
  legendary: {
    bg: 'bg-slate-500/50',
    border: 'border-slate-300/50',
    text: 'text-white',
    accent: 'bg-slate-200',
  },
};

const rarityColors = {
  common: {
    bg: 'bg-slate-800/30',
    border: 'border-slate-600/50',
    text: 'text-slate-300',
  },
  uncommon: {
    bg: 'bg-slate-700/30',
    border: 'border-slate-500/50',
    text: 'text-slate-200',
  },
  rare: {
    bg: 'bg-slate-600/30',
    border: 'border-slate-400/50',
    text: 'text-slate-100',
  },
  epic: {
    bg: 'bg-slate-500/30',
    border: 'border-slate-300/50',
    text: 'text-white',
  },
  legendary: {
    bg: 'bg-slate-400/30',
    border: 'border-slate-200/50',
    text: 'text-white',
  },
};

export function ProfessionalAchievementProgress({
  achievements,
  recentUnlocks,
  totalStats,
  rarityStats,
  className = '',
}: ProfessionalAchievementProgressProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('all');
  const [sortBy, setSortBy] = useState<SortOption>('tier');
  const [sortAscending, setSortAscending] = useState(false);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Enhanced filtering with smart options
  const filteredAchievements = useMemo(() => {
    let filtered = achievements;

    // Funnel by search term
    if (searchTerm) {
      filtered = filtered.filter(
        a =>
          a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Funnel by view mode
    switch (viewMode) {
      case 'earned':
        filtered = filtered.filter(a => a.earned);
        break;
      case 'progress':
        filtered = filtered.filter(a => !a.earned && (a.percentage || 0) > 0);
        break;
      case 'locked':
        filtered = filtered.filter(a => !a.earned);
        break;
      default:
        // Show all
        break;
    }

    // Funnel by category
    if (filterCategory !== 'all') {
      filtered = filtered.filter(a => a.category === filterCategory);
    }

    return filtered;
  }, [achievements, viewMode, filterCategory, searchTerm]);

  // Enhanced sorting with secondary sorts
  const sortedAchievements = useMemo(() => {
    const sorted = [...filteredAchievements].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'tier':
          comparison = tierOrder[a.tier] - tierOrder[b.tier];
          if (comparison === 0) {
            comparison = rarityOrder[a.rarity] - rarityOrder[b.rarity];
          }
          break;
        case 'rarity':
          comparison = rarityOrder[a.rarity] - rarityOrder[b.rarity];
          if (comparison === 0) {
            comparison = tierOrder[a.tier] - tierOrder[b.tier];
          }
          break;
        case 'progress':
          if (a.earned && !b.earned) return 1;
          if (!a.earned && b.earned) return -1;
          comparison = (a.percentage || 0) - (b.percentage || 0);
          break;
        case 'unlockDate':
          if (a.unlockedAt && b.unlockedAt) {
            comparison =
              new Date(b.unlockedAt).getTime() -
              new Date(a.unlockedAt).getTime();
          } else if (a.unlockedAt) {
            comparison = -1;
          } else if (b.unlockedAt) {
            comparison = 1;
          }
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
      }

      return sortAscending ? comparison : -comparison;
    });

    return sorted;
  }, [filteredAchievements, sortBy, sortAscending]);

  const handleSortChange = (value: SortOption) => {
    if (value === sortBy) {
      setSortAscending(!sortAscending);
    } else {
      setSortBy(value);
      setSortAscending(false);
    }
  };

  const getSortIcon = () => {
    return sortAscending ? (
      <SortAscending className="h-4 w-4" />
    ) : (
      <SortDescending className="h-4 w-4" />
    );
  };

  const completionRate = Math.round(
    (totalStats.earned / totalStats.available) * 100
  );

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Executive Summary Dashboard */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
              <ChartBar className="h-5 w-5 text-verus-blue" />
              <span>Achievement Portfolio Summary</span>
            </h3>
            <div className="text-sm text-blue-200">
              Last updated: {new Date().toLocaleDateString()}
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Key Performance Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="text-center">
              <div className="bg-white/5 border border-slate-600/30 rounded-lg p-4">
                <div className="flex items-center justify-center w-12 h-12 bg-slate-600/20 rounded-full mx-auto mb-3">
                  <CheckCircle className="h-6 w-6 text-slate-300" />
                </div>
                <div className="text-2xl font-bold text-white">
                  {totalStats.earned}
                </div>
                <div className="text-sm text-slate-300 font-medium">
                  Achievements Earned
                </div>
              </div>
            </div>

            <div className="text-center">
              <div className="bg-white/5 border border-slate-500/30 rounded-lg p-4">
                <div className="flex items-center justify-center w-12 h-12 bg-slate-500/20 rounded-full mx-auto mb-3">
                  <Target className="h-6 w-6 text-slate-300" />
                </div>
                <div className="text-2xl font-bold text-white">
                  {totalStats.progress}
                </div>
                <div className="text-sm text-slate-200 font-medium">
                  In Progress
                </div>
              </div>
            </div>

            <div className="text-center">
              <div className="bg-white/5 border border-verus-blue/30 rounded-lg p-4">
                <div className="flex items-center justify-center w-12 h-12 bg-verus-blue/20 rounded-full mx-auto mb-3">
                  <ChartPie className="h-6 w-6 text-verus-blue" />
                </div>
                <div className="text-2xl font-bold text-white">
                  {completionRate}%
                </div>
                <div className="text-sm text-blue-200 font-medium">
                  Completion Rate
                </div>
              </div>
            </div>

            <div className="text-center">
              <div className="bg-white/5 border border-slate-500/30 rounded-lg p-4">
                <div className="flex items-center justify-center w-12 h-12 bg-slate-500/20 rounded-full mx-auto mb-3">
                  <Lock className="h-6 w-6 text-slate-400" />
                </div>
                <div className="text-2xl font-bold text-white">
                  {totalStats.available - totalStats.earned}
                </div>
                <div className="text-sm text-slate-300 font-medium">
                  Remaining
                </div>
              </div>
            </div>
          </div>

          {/* Progress Overview */}
          <div className="bg-white/5 rounded-lg p-6 border border-white/10">
            <h4 className="text-md font-semibold text-white mb-4">
              Overall Progress
            </h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-200">
                  Portfolio Completion
                </span>
                <span className="text-sm font-semibold text-white">
                  {completionRate}%
                </span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-slate-600 to-slate-500 h-3 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${completionRate}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-slate-300">
                <span>
                  {totalStats.earned} of {totalStats.available} achievements
                </span>
                <span>
                  {totalStats.available - totalStats.earned} remaining
                </span>
              </div>
            </div>
          </div>

          {/* Rarity Distribution */}
          <div className="mt-6">
            <h4 className="text-md font-semibold text-gray-900 mb-4">
              Achievement Distribution by Rarity
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {Object.entries(rarityStats).map(([rarity, count]) => (
                <div
                  key={rarity}
                  className={`${rarityColors[rarity as keyof typeof rarityColors].bg} ${rarityColors[rarity as keyof typeof rarityColors].border} border rounded-lg p-3 text-center`}
                >
                  <div
                    className={`text-lg font-bold ${rarityColors[rarity as keyof typeof rarityColors].text}`}
                  >
                    {count}
                  </div>
                  <div
                    className={`text-xs font-medium capitalize ${rarityColors[rarity as keyof typeof rarityColors].text}`}
                  >
                    {rarity}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Achievements */}
      {recentUnlocks.length > 0 && (
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-white/10">
            <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-verus-green" />
              <span>Recent Achievements</span>
            </h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentUnlocks.slice(0, 6).map(achievement => (
                <div
                  key={achievement.slug}
                  className={`${tierColors[achievement.tier].bg} ${tierColors[achievement.tier].border} border rounded-lg p-4`}
                >
                  <div className="flex items-start space-x-3">
                    <div
                      className={`flex-shrink-0 w-10 h-10 ${tierColors[achievement.tier].accent} rounded-lg flex items-center justify-center`}
                    >
                      <Medal className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4
                        className={`text-sm font-semibold ${tierColors[achievement.tier].text} truncate`}
                      >
                        {achievement.name}
                      </h4>
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                        {achievement.description}
                      </p>
                      {achievement.unlockedAt && (
                        <div className="text-xs text-gray-500 mt-2">
                          {new Date(
                            achievement.unlockedAt
                          ).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-white/10">
          <h3 className="text-lg font-semibold text-white">
            Achievement Portfolio
          </h3>
        </div>
        <div className="p-6">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between mb-6">
            <div className="flex gap-2">
              {(['all', 'earned', 'progress', 'locked'] as ViewMode[]).map(
                mode => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      viewMode === mode
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                )
              )}
            </div>

            <div className="flex gap-2 items-center flex-wrap">
              {/* MagnifyingGlass */}
              <input
                type="text"
                placeholder="MagnifyingGlass achievements..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="bg-white/10 border border-white/20 rounded-md px-3 py-2 text-white text-sm placeholder-blue-300 min-w-48 focus:ring-2 focus:ring-verus-blue focus:border-verus-blue"
              />

              {/* Category Funnel */}
              <select
                value={filterCategory}
                onChange={e =>
                  setFilterCategory(e.target.value as FilterCategory)
                }
                className="bg-white/10 border border-white/20 rounded-md px-3 py-2 text-white text-sm focus:ring-2 focus:ring-verus-blue focus:border-verus-blue"
              >
                <option value="all">All Categories</option>
                <option value="milestone">Milestone</option>
                <option value="performance">Performance</option>
                <option value="consistency">Consistency</option>
                <option value="special">Special</option>
                <option value="elite">Elite</option>
              </select>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={e => handleSortChange(e.target.value as SortOption)}
                className="bg-white/10 border border-white/20 rounded-md px-3 py-2 text-white text-sm focus:ring-2 focus:ring-verus-blue focus:border-verus-blue"
              >
                <option value="tier">Tier</option>
                <option value="rarity">Rarity</option>
                <option value="progress">Progress</option>
                <option value="unlockDate">Date</option>
                <option value="name">Name</option>
              </select>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex gap-2 mb-6">
            {Object.entries(categoryIcons).map(([category, Icon]) => (
              <button
                key={category}
                onClick={() => setFilterCategory(category as FilterCategory)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${
                  filterCategory === category
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </button>
            ))}
          </div>

          {/* Professional Achievement Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedAchievements
              .filter(
                a => filterCategory === 'all' || a.category === filterCategory
              )
              .map(achievement => (
                <div
                  key={achievement.slug}
                  className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg shadow-sm hover:shadow-md hover:border-verus-blue/50 transition-all"
                >
                  <div className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div
                        className={`flex-shrink-0 w-12 h-12 ${tierColors[achievement.tier].accent} rounded-lg flex items-center justify-center`}
                      >
                        <Medal className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex flex-col items-end space-y-1">
                        <span
                          className={`text-xs px-2 py-1 rounded-full font-medium ${tierColors[achievement.tier].bg} ${tierColors[achievement.tier].text}`}
                        >
                          {achievement.tier}
                        </span>
                        <span
                          className={`text-xs px-2 py-1 rounded-full font-medium ${rarityColors[achievement.rarity].bg} ${rarityColors[achievement.rarity].text}`}
                        >
                          {achievement.rarity}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="space-y-3">
                      <div>
                        <h4 className="text-lg font-semibold text-white mb-1">
                          {achievement.name}
                        </h4>
                        <p className="text-sm text-blue-200 line-clamp-3">
                          {achievement.description}
                        </p>
                      </div>

                      {/* Status */}
                      {achievement.earned ? (
                        <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3">
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="h-5 w-5 text-green-400" />
                            <span className="text-sm font-medium text-green-300">
                              Achievement Unlocked
                            </span>
                          </div>
                          {achievement.unlockedAt && (
                            <div className="text-xs text-green-300 mt-1">
                              {new Date(
                                achievement.unlockedAt
                              ).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {achievement.percentage &&
                          achievement.percentage > 0 ? (
                            <div>
                              <div className="flex justify-between text-sm text-blue-200 mb-1">
                                <span>Progress</span>
                                <span>
                                  {Math.round(achievement.percentage)}%
                                </span>
                              </div>
                              <div className="w-full bg-white/10 rounded-full h-2">
                                <div
                                  className="bg-verus-blue h-2 rounded-full transition-all duration-500"
                                  style={{
                                    width: `${achievement.percentage}%`,
                                  }}
                                ></div>
                              </div>
                              {achievement.current !== undefined &&
                                achievement.target !== undefined && (
                                  <div className="text-xs text-blue-300 mt-1">
                                    {achievement.current.toLocaleString()} /{' '}
                                    {achievement.target.toLocaleString()}
                                  </div>
                                )}
                            </div>
                          ) : (
                            <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                              <div className="flex items-center space-x-2">
                                <Lock className="h-5 w-5 text-slate-400" />
                                <span className="text-sm font-medium text-slate-300">
                                  Not Started
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>

          {/* Empty State */}
          {sortedAchievements.length === 0 && (
            <div className="text-center py-12">
              <Target className="h-16 w-16 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">
                No achievements found
              </h3>
              <p className="text-blue-200">
                {filterCategory === 'all'
                  ? 'No achievements match your current filters.'
                  : `No ${filterCategory} achievements match your current filters.`}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
