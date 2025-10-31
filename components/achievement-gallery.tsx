'use client';

import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Clock,
  Crown,
  Star,
  Target,
  TrendUp,
  Trophy
} from '@phosphor-icons/react';
import { useTranslations } from 'next-intl';
import { memo, useCallback, useMemo, useState } from 'react';
import { AchievementBadge, AchievementBadgeCompact } from './achievement-badge';

export interface AchievementData {
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

export interface AchievementGalleryProps {
  achievements: AchievementData[];
  recentUnlocks: AchievementData[];
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

export function AchievementGallery({
  achievements,
  recentUnlocks,
  totalStats,
  rarityStats,
  className = '',
}: AchievementGalleryProps) {
  const tAchievements = useTranslations('achievements');
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('all');
  const [sortBy, setSortBy] = useState<SortOption>('tier');
  const [sortAscending, setSortAscending] = useState(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showOnlyNearComplete, setShowOnlyNearComplete] =
    useState<boolean>(false);
  const [showOnlyRecent, setShowOnlyRecent] = useState<boolean>(false);

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

    // Smart filters
    if (showOnlyNearComplete) {
      filtered = filtered.filter(a => !a.earned && (a.percentage || 0) > 75);
    }

    if (showOnlyRecent) {
      // Use current time for filtering instead of creating new Date object
      const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      filtered = filtered.filter(
        a => a.earned && a.unlockedAt && new Date(a.unlockedAt).getTime() > oneWeekAgo
      );
    }

    return filtered;
  }, [
    achievements,
    viewMode,
    filterCategory,
    searchTerm,
    showOnlyNearComplete,
    showOnlyRecent,
  ]);

  // Enhanced sorting with secondary sorts
  const sortedAchievements = useMemo(() => {
    const sorted = [...filteredAchievements].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'tier':
          comparison = tierOrder[a.tier] - tierOrder[b.tier];
          // Secondary sort by rarity for same tier
          if (comparison === 0) {
            comparison = rarityOrder[a.rarity] - rarityOrder[b.rarity];
          }
          break;
        case 'rarity':
          comparison = rarityOrder[a.rarity] - rarityOrder[b.rarity];
          // Secondary sort by tier for same rarity
          if (comparison === 0) {
            comparison = tierOrder[a.tier] - tierOrder[b.tier];
          }
          break;
        case 'progress':
          // Sort by progress, but put earned badges at the end
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

  const handleSortChange = useCallback((value: SortOption) => {
    if (value === sortBy) {
      setSortAscending(!sortAscending);
    } else {
      setSortBy(value);
      setSortAscending(false);
    }
  }, [sortBy, sortAscending]);

  // React 18.2: Memoize button handlers to prevent re-renders
  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
  }, []);

  const handleFilterCategoryChange = useCallback((category: FilterCategory) => {
    setFilterCategory(category);
  }, []);

  const toggleNearComplete = useCallback(() => {
    setShowOnlyNearComplete(prev => !prev);
  }, []);

  const toggleRecent = useCallback(() => {
    setShowOnlyRecent(prev => !prev);
  }, []);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Stats Summary */}
      <div className="bg-white/5 rounded-xl p-6 border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h3
            className="text-xl font-bold text-white flex items-center space-x-2 cursor-help"
            title={tAchievements('achievementProgressTooltip')}
          >
            <Trophy className="h-6 w-6 text-verus-teal" />
            <span>{tAchievements('achievementProgress')}</span>
          </h3>
          <Badge
            variant="outline"
            className="text-yellow-300 border-yellow-500/30 cursor-help"
            title={tAchievements('earnedCountTooltip', {
              earned: totalStats.earned,
              available: totalStats.available,
            })}
          >
            {totalStats.earned} / {totalStats.available}
          </Badge>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div
            className="text-center"
            title={tAchievements('earnedTooltip')}
          >
            <div className="text-2xl font-bold text-green-400">
              {totalStats.earned}
            </div>
            <div className="text-sm text-gray-300">{tAchievements('earned')}</div>
          </div>
          <div
            className="text-center"
            title={tAchievements('inProgressTooltip')}
          >
            <div className="text-2xl font-bold text-blue-400">
              {totalStats.progress}
            </div>
            <div className="text-sm text-gray-300">{tAchievements('inProgress')}</div>
          </div>
          <div className="text-center" title={tAchievements('completeTooltip')}>
            <div className="text-2xl font-bold text-verus-blue">
              {Math.round((totalStats.earned / totalStats.available) * 100)}%
            </div>
            <div className="text-sm text-gray-300">{tAchievements('complete')}</div>
          </div>
          <div
            className="text-center"
            title={tAchievements('lockedTooltip')}
          >
            <div className="text-2xl font-bold text-verus-teal">
              {totalStats.available - totalStats.earned}
            </div>
            <div className="text-sm text-gray-300">{tAchievements('locked')}</div>
          </div>
        </div>

        {/* Rarity breakdown */}
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="text-sm text-gray-300 mb-2">{tAchievements('badgeRarity')}</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(rarityStats).map(([rarity, count]) => (
              <Badge
                key={rarity}
                variant="outline"
                className="text-xs capitalize cursor-help"
                title={
                  count === 1
                    ? tAchievements('rarityEarnedTooltipSingular', {
                        count,
                        rarity: tAchievements(rarity as 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'),
                      })
                    : tAchievements('rarityEarnedTooltip', {
                        count,
                        rarity: tAchievements(rarity as 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'),
                      })
                }
              >
                {tAchievements(rarity as 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary')}: {count}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Unlocks */}
      {recentUnlocks.length > 0 && (
        <div className="bg-white/5 rounded-xl p-6 border border-white/10">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-green-400" />
            <span>{tAchievements('recentUnlocks')}</span>
          </h3>
          <div className="flex flex-wrap gap-3">
            {recentUnlocks.map(achievement => (
              <AchievementBadgeCompact
                key={achievement.slug}
                name={achievement.name}
                icon={achievement.icon as any}
                tier={achievement.tier}
                earned={true}
              />
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex gap-2">
          {(['all', 'earned', 'progress', 'locked'] as ViewMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => handleViewModeChange(mode)}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                viewMode === mode
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {mode === 'all'
                ? tAchievements('all')
                : tAchievements(mode as 'earned' | 'progress' | 'locked')}
            </button>
          ))}
        </div>

        <div className="flex gap-2 items-center flex-wrap">
          {/* Search */}
          <input
            type="text"
            placeholder={tAchievements('searchPlaceholder')}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm placeholder-gray-400 min-w-48"
          />

          {/* Category Funnel */}
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value as FilterCategory)}
            className="bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm"
          >
            <option value="all">{tAchievements('allCategories')}</option>
            <option value="milestone">{tAchievements('milestone')}</option>
            <option value="performance">{tAchievements('performance')}</option>
            <option value="consistency">{tAchievements('consistency')}</option>
            <option value="special">{tAchievements('special')}</option>
            <option value="elite">{tAchievements('elite')}</option>
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={e => handleSortChange(e.target.value as SortOption)}
            className="bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm"
          >
            <option value="tier">{tAchievements('tier')}</option>
            <option value="rarity">{tAchievements('rarity')}</option>
            <option value="progress">{tAchievements('progress')}</option>
            <option value="unlockDate">{tAchievements('date')}</option>
            <option value="name">{tAchievements('name')}</option>
          </select>

          {/* Smart Filters */}
          <div className="flex gap-2">
            <button
              onClick={toggleNearComplete}
              className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                showOnlyNearComplete
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              title={tAchievements('nearCompleteTooltip')}
            >
              🎯 {tAchievements('nearComplete')}
            </button>
            <button
              onClick={toggleRecent}
              className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                showOnlyRecent
                  ? 'bg-yellow-500 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              title={tAchievements('recentTooltip')}
            >
              ⏰ {tAchievements('recent')}
            </button>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 mb-6">
        {Object.entries(categoryIcons).map(([category, Icon]) => (
          <button
            key={category}
            onClick={() => handleFilterCategoryChange(category as FilterCategory)}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors flex items-center ${
              filterCategory === category
                ? 'bg-blue-500 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <Icon className="h-4 w-4 mr-2" />
            {tAchievements(category as 'milestone' | 'performance' | 'consistency' | 'special' | 'elite')}
          </button>
        ))}
      </div>

      {/* Achievements Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {sortedAchievements
          .filter(
            a => filterCategory === 'all' || a.category === filterCategory
          )
          .map(achievement => (
            <AchievementBadge
              key={achievement.slug}
              slug={achievement.slug}
              name={achievement.name}
              description={achievement.description}
              icon={achievement.icon as any}
              tier={achievement.tier}
              category={achievement.category}
              rarity={achievement.rarity}
              earned={achievement.earned}
              unlockedAt={achievement.unlockedAt}
              unlockValue={achievement.unlockValue}
              current={achievement.current}
              target={achievement.target}
              percentage={achievement.percentage}
              size="medium"
              isRecent={recentUnlocks.some(ru => ru.slug === achievement.slug)}
            />
          ))}
      </div>

      {/* Empty State */}
      {sortedAchievements.length === 0 && (
        <div className="text-center py-12">
          <Trophy className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-300 mb-2">
            {tAchievements('noAchievementsFound')}
          </h3>
          <p className="text-gray-500">
            {filterCategory === 'all'
              ? tAchievements('noAchievementsMatchFilters')
              : tAchievements('noCategoryAchievementsMatchFilters', {
                  category: tAchievements(filterCategory as 'milestone' | 'performance' | 'consistency' | 'special' | 'elite'),
                })}
          </p>
        </div>
      )}
    </div>
  );
}

// Optimize with React.memo for better performance
export const AchievementGalleryMemoized = memo(AchievementGallery);
