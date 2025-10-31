'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  AchievementIconComponent,
  getTierStyling,
  getRarityStyling,
  type AchievementIcon,
} from '@/lib/achievement-icons';
import { Badge } from '@/components/ui/badge';

export interface AchievementBadgeProps {
  // Badge data
  slug: string;
  name: string;
  description: string;
  icon: AchievementIcon;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'legendary';
  category: 'milestone' | 'performance' | 'consistency' | 'special' | 'elite';
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

  // State
  earned?: boolean;
  unlockedAt?: string;
  unlockValue?: number;

  // Progress (for unearned badges)
  current?: number;
  target?: number;
  percentage?: number;

  // Display options
  size?: 'small' | 'medium' | 'large';
  showProgress?: boolean;
  showRarity?: boolean;
  showUnlockDate?: boolean;
  isRecent?: boolean; // For "New!" indicator

  // Interactive
  onClick?: () => void;
  className?: string;
}

export function AchievementBadge({
  slug,
  name,
  description,
  icon,
  tier,
  category,
  rarity,
  earned = false,
  unlockedAt,
  unlockValue,
  current = 0,
  target = 1,
  percentage = 0,
  size = 'medium',
  showProgress = true,
  showRarity = true,
  showUnlockDate = true,
  isRecent = false,
  onClick,
  className = '',
}: AchievementBadgeProps) {
  const tCommon = useTranslations('common');
  const tTime = useTranslations('time');
  const tBlocks = useTranslations('blocks');
  const tStaking = useTranslations('staking');
  const tierStyling = getTierStyling(tier);
  const rarityStyling = getRarityStyling(rarity);

  // Size configurations
  const sizeConfig = {
    small: {
      container: 'p-3',
      icon: 'h-5 w-5',
      title: 'text-sm',
      description: 'text-xs',
      progress: 'h-1',
      badge: 'text-xs px-2 py-1',
    },
    medium: {
      container: 'p-5',
      icon: 'h-7 w-7',
      title: 'text-base',
      description: 'text-sm',
      progress: 'h-2',
      badge: 'text-xs px-2 py-1',
    },
    large: {
      container: 'p-6',
      icon: 'h-8 w-8',
      title: 'text-lg',
      description: 'text-base',
      progress: 'h-2',
      badge: 'text-sm px-3 py-1',
    },
  }[size];

  const formatUnlockDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatUnlockValue = (value: number, tier: string) => {
    if (tier.includes('stake') || tier.includes('count')) {
      return value.toLocaleString();
    }
    if (tier.includes('reward') || tier.includes('VRSC')) {
      return `${value.toLocaleString()} VRSC`;
    }
    return value.toString();
  };

  const badgeContent = (
    <div
      className={`
        relative rounded-xl border transition-all duration-300 ease-out
        ${
          earned
            ? `
            bg-gradient-to-br ${tierStyling.bg.replace('/20', '/30')} ${tierStyling.border}
            shadow-lg hover:shadow-2xl backdrop-blur-sm
            hover:scale-105 hover:rotate-1
            ${tier === 'legendary' ? 'shadow-slate-200/10' : ''}
            ${tier === 'platinum' ? 'shadow-slate-300/10' : ''}
            ${tier === 'gold' ? 'shadow-slate-400/10' : ''}
          `
            : `
            bg-gray-800/30 border-gray-600/30 hover:border-gray-500/50
            backdrop-blur-sm hover:bg-gray-700/40
            hover:scale-102
          `
        }
        ${onClick ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900' : ''}
        ${isRecent ? 'ring-2 ring-slate-400/50 animate-bounce' : ''}
        ${className}
        group
      `}
      onClick={onClick}
      onKeyDown={e => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? 'button' : undefined}
      aria-label={`${name} achievement badge${earned ? ' (earned)' : ' (locked)'}`}
    >
      {/* Recent indicator */}
      {isRecent && (
        <div className="absolute -top-2 -right-2 z-10">
          <Badge className="bg-slate-500 text-slate-900 text-xs px-2 py-1 animate-pulse">
            New!
          </Badge>
        </div>
      )}

      {/* Rarity indicator */}
      {showRarity && earned && (
        <div className="absolute top-2 right-2">
          <Badge className={`${rarityStyling.badge} ${sizeConfig.badge}`}>
            {rarity}
          </Badge>
        </div>
      )}

      {/* Main content */}
      <div className={`${sizeConfig.container} space-y-3`}>
        {/* Enhanced Icon */}
        <div className="flex items-center justify-center relative">
          <div
            className={`
            p-4 rounded-full transition-all duration-300
            ${
              earned
                ? `
                ${tierStyling.bg} ${tierStyling.icon}
                shadow-lg group-hover:shadow-xl
                ${tier === 'legendary' ? 'animate-spin-slow' : ''}
                ${tier === 'platinum' ? 'shadow-slate-300/20' : ''}
                ${tier === 'gold' ? 'shadow-slate-400/20' : ''}
              `
                : 'bg-gray-700/50 text-gray-500 group-hover:bg-gray-600/50'
            }
          `}
          >
            <AchievementIconComponent
              name={icon}
              className={`${sizeConfig.icon} ${earned ? 'drop-shadow-lg' : ''}`}
            />
          </div>

          {/* Floating sparkles for legendary badges */}
          {earned && tier === 'legendary' && (
            <>
              <div className="absolute -top-1 -right-1 text-slate-300 animate-ping text-xs">
                ✨
              </div>
              <div className="absolute -bottom-1 -left-1 text-slate-200 animate-pulse text-xs">
                ⭐
              </div>
            </>
          )}
        </div>

        {/* Enhanced Title and Description */}
        <div className="text-center space-y-2">
          <div className="space-y-1">
            <h4
              className={`
              font-bold truncate
              ${earned ? tierStyling.text : 'text-gray-400'}
              ${sizeConfig.title}
            `}
            >
              {name}
            </h4>

            {/* Category and Rarity badges */}
            <div className="flex items-center justify-center space-x-1">
              <Badge
                className={`text-xs px-2 py-0.5 ${getRarityStyling(rarity).bg} ${getRarityStyling(rarity).text}`}
              >
                {rarity}
              </Badge>
              <Badge
                className={`text-xs px-2 py-0.5 ${tierStyling.bg} ${tierStyling.text}`}
              >
                {tier}
              </Badge>
            </div>
          </div>

          <p
            className={`
            text-xs leading-relaxed line-clamp-2
            ${earned ? 'text-gray-300' : 'text-gray-500'}
            ${sizeConfig.description}
          `}
          >
            {description}
          </p>
        </div>

        {/* Enhanced Progress Visualization */}
        {!earned && showProgress && target > 0 && (
          <div className="space-y-3">
            {/* Circular Progress Ring */}
            <div className="flex justify-center">
              <div className="relative w-16 h-16">
                <svg
                  className="w-16 h-16 transform -rotate-90"
                  viewBox="0 0 36 36"
                >
                  {/* Background circle */}
                  <circle
                    cx="18"
                    cy="18"
                    r="16"
                    fill="none"
                    stroke="rgba(75, 85, 99, 0.3)"
                    strokeWidth="3"
                  />
                  {/* Progress circle */}
                  <circle
                    cx="18"
                    cy="18"
                    r="16"
                    fill="none"
                    stroke={
                      percentage > 75
                        ? '#64748b'
                        : percentage > 50
                          ? '#475569'
                          : '#334155'
                    }
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 16}`}
                    strokeDashoffset={`${2 * Math.PI * 16 * (1 - percentage / 100)}`}
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                {/* Percentage text */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold text-white">
                    {Math.round(percentage)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Progress details */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gray-400">
                <span>{current.toLocaleString()}</span>
                <span>{target.toLocaleString()}</span>
              </div>
              {/* Encouragement message */}
              {percentage > 75 && (
                <div className="text-xs text-center text-slate-300 font-medium">
                  🎯 Almost there!
                </div>
              )}
              {percentage > 50 && percentage <= 75 && (
                <div className="text-xs text-center text-slate-200 font-medium">
                  📈 Great progress!
                </div>
              )}
              {percentage <= 50 && percentage > 0 && (
                <div className="text-xs text-center text-slate-400 font-medium">
                  🌱 Getting started
                </div>
              )}
            </div>
          </div>
        )}

        {/* Enhanced Earned Badge Display */}
        {earned && (
          <div className="space-y-3">
            {/* Celebration Effects */}
            {isRecent && (
              <div className="flex justify-center space-x-1">
                <span className="text-lg animate-bounce">🎉</span>
                <span className="text-lg animate-pulse">✨</span>
                <span className="text-lg animate-bounce delay-100">🏆</span>
              </div>
            )}

            {/* Achievement Status */}
            <div className="bg-slate-800/20 border border-slate-600/30 rounded-lg p-3">
              <div className="text-center space-y-2">
                <div className="text-xs text-slate-300 font-bold flex items-center justify-center">
                  <span className="mr-1">✅</span>
                  Achievement Unlocked!
                </div>

                {/* Unlock value */}
                {unlockValue !== undefined && (
                  <div
                    className={`
                    text-xs font-bold px-2 py-1 rounded-full
                    ${tierStyling.bg} ${tierStyling.text}
                    ${tier === 'legendary' ? 'animate-pulse' : ''}
                  `}
                  >
                    {formatUnlockValue(unlockValue, tier)}
                  </div>
                )}

                {/* Enhanced unlock date with relative time */}
                {showUnlockDate && unlockedAt && (
                  <div className="space-y-1">
                    <div className="text-xs text-gray-400">
                      {formatUnlockDate(unlockedAt)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {(() => {
                        const daysAgo = Math.floor(
                          (new Date().getTime() -
                            new Date(unlockedAt).getTime()) /
                            (1000 * 60 * 60 * 24)
                        );
                        if (daysAgo === 0) return 'Today! 🎉';
                        if (daysAgo === 1) return tTime("yesterday");
                        if (daysAgo < 7) return `${daysAgo} days ago`;
                        if (daysAgo < 30)
                          return `${Math.floor(daysAgo / 7)} weeks ago`;
                        if (daysAgo < 365)
                          return `${Math.floor(daysAgo / 30)} months ago`;
                        return `${Math.floor(daysAgo / 365)} years ago`;
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Rarity celebration */}
            <div className="text-center">
              <div className="text-xs opacity-75">
                {rarity === 'legendary' && '🏆 Legendary Achievement!'}
                {rarity === 'epic' && '💎 Epic Achievement'}
                {rarity === 'rare' && '⭐ Rare Achievement'}
                {rarity === 'uncommon' && '🔸 Uncommon Achievement'}
                {rarity === 'common' && '🔹 Common Achievement'}
              </div>
              <div className="text-xs text-gray-500 capitalize mt-1">
                {category} Achievement
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Locked state indicator */}
        {!earned && (
          <div className="space-y-3">
            {/* Locked Status */}
            <div className="bg-gray-800/30 border border-gray-600/30 rounded-lg p-3">
              <div className="text-center space-y-2">
                <div className="text-xs text-gray-400 font-medium flex items-center justify-center">
                  <span className="mr-1">🔒</span>
                  Achievement Locked
                </div>

                {/* Progress encouragement */}
                {target > 0 && (
                  <div className="text-xs text-slate-300">
                    {percentage > 75 && '🎯 Almost there!'}
                    {percentage > 50 && percentage <= 75 && '📈 Good progress!'}
                    {percentage <= 50 && percentage > 0 && '🌱 Getting started'}
                    {percentage === 0 && 'Keep staking to unlock!'}
                  </div>
                )}
              </div>
            </div>

            {/* Rarity info */}
            <div className="text-center">
              <div className="text-xs text-gray-500 capitalize">
                {category} Achievement
              </div>
              <div className="text-xs opacity-75 mt-1">
                {rarity === 'legendary' &&
                  '🌟 Very rare - only top stakers earn this'}
                {rarity === 'epic' &&
                  "💎 Epic achievement - you're among the elite"}
                {rarity === 'rare' &&
                  '⭐ Rare achievement - well worth pursuing'}
                {rarity === 'uncommon' && '🔸 Uncommon achievement'}
                {rarity === 'common' && '🔹 Common achievement'}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return badgeContent;
}

// Compact badge variant for inline display
export function AchievementBadgeCompact({
  name,
  icon,
  tier,
  earned = false,
  className = '',
}: Pick<
  AchievementBadgeProps,
  'name' | 'icon' | 'tier' | 'earned' | 'className'
>) {
  const tierStyling = getTierStyling(tier);

  return (
    <div
      className={`
        relative inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium
        ${
          earned
            ? `${tierStyling.bg} ${tierStyling.border} ${tierStyling.text}`
            : 'bg-gray-700/50 text-gray-400 border border-gray-600/30'
        }
        ${className}
      `}
    >
      <AchievementIconComponent name={icon} className="h-4 w-4" />
      <span>{name}</span>
    </div>
  );
}
