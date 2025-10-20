import React from 'react';
import {
  Target,
  Medal,
  Trophy,
  Crown,
  Star,
  Coins,
  Diamond,
  Lightning,
  TrendUp,
  ArrowsLeftRight,
  Fire,
  CalendarCheck,
  Sparkle,
  Clock,
  ClockCounterClockwise,
  Hourglass,
  Calendar,
  Timer,
  Gift,
  ArrowsClockwise,
  DiamondsFour,
  UsersThree,
  CalendarBlank,
} from '@phosphor-icons/react';

export type AchievementIcon = keyof typeof achievementIcons;

export const achievementIcons = {
  // Milestone icons
  target: Target,
  award: Medal,
  trophy: Trophy,
  crown: Crown,
  star: Star,
  coins: Coins,
  gem: Diamond,

  // Performance icons
  zap: Lightning,
  'trending-up': TrendUp,
  activity: ArrowsLeftRight,
  flame: Fire,
  'calendar-check': CalendarCheck,
  sparkles: Sparkle,

  // Time-based icons
  clock: Clock,
  history: ClockCounterClockwise,
  hourglass: Hourglass,
  calendar: Calendar,
  timer: Timer,

  // Special icons
  gift: Gift,
  medal: Medal,
  'refresh-cw': ArrowsClockwise,
  diamond: DiamondsFour,
  users: UsersThree,
  'calendar-days': CalendarBlank,
} as const;

export interface AchievementIconProps {
  name: AchievementIcon;
  className?: string;
  size?: number;
}

export function AchievementIconComponent({
  name,
  className = 'h-6 w-6',
  size = 24,
}: AchievementIconProps) {
  const IconComponent = achievementIcons[name];

  if (!IconComponent) {
    console.warn(`Unknown achievement icon: ${name}`);
    return <Target className={className} size={size} />; // Fallback icon
  }

  return <IconComponent className={className} size={size} />;
}

// Tier color mappings
export const tierColors = {
  bronze: {
    bg: 'bg-amber-500/20',
    border: 'border-amber-500/30',
    text: 'text-amber-300',
    icon: 'text-amber-400',
    glow: 'shadow-amber-500/20',
  },
  silver: {
    bg: 'bg-gray-500/20',
    border: 'border-gray-500/30',
    text: 'text-gray-300',
    icon: 'text-gray-400',
    glow: 'shadow-gray-500/20',
  },
  gold: {
    bg: 'bg-yellow-500/20',
    border: 'border-yellow-500/30',
    text: 'text-yellow-300',
    icon: 'text-yellow-400',
    glow: 'shadow-yellow-500/20',
  },
  platinum: {
    bg: 'bg-purple-500/20',
    border: 'border-purple-500/30',
    text: 'text-purple-300',
    icon: 'text-purple-400',
    glow: 'shadow-purple-500/20',
  },
  legendary: {
    bg: 'bg-gradient-to-br from-verus-blue/20 to-verus-green/20',
    border: 'border-pink-500/30',
    text: 'text-verus-blue',
    icon: 'text-pink-400',
    glow: 'shadow-pink-500/20',
  },
} as const;

// Rarity color mappings
export const rarityColors = {
  common: {
    bg: 'bg-green-500/10',
    border: 'border-green-500/20',
    text: 'text-green-400',
    badge: 'bg-green-500/20 text-green-300',
  },
  uncommon: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    text: 'text-blue-400',
    badge: 'bg-blue-500/20 text-blue-300',
  },
  rare: {
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    text: 'text-purple-400',
    badge: 'bg-purple-500/20 text-purple-300',
  },
  epic: {
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
    text: 'text-orange-400',
    badge: 'bg-orange-500/20 text-orange-300',
  },
  legendary: {
    bg: 'bg-gradient-to-r from-verus-blue/10 to-verus-green/10',
    border: 'border-pink-500/30',
    text: 'text-pink-400',
    badge:
      'bg-gradient-to-r from-verus-blue/20 to-verus-green/20 text-verus-blue',
  },
} as const;

// Category color mappings
export const categoryColors = {
  milestone: {
    bg: 'bg-blue-500/20',
    border: 'border-blue-500/30',
    text: 'text-blue-300',
    icon: 'text-blue-400',
  },
  performance: {
    bg: 'bg-green-500/20',
    border: 'border-green-500/30',
    text: 'text-green-300',
    icon: 'text-green-400',
  },
  consistency: {
    bg: 'bg-yellow-500/20',
    border: 'border-yellow-500/30',
    text: 'text-yellow-300',
    icon: 'text-yellow-400',
  },
  special: {
    bg: 'bg-purple-500/20',
    border: 'border-purple-500/30',
    text: 'text-purple-300',
    icon: 'text-purple-400',
  },
  elite: {
    bg: 'bg-gradient-to-br from-verus-blue/20 to-verus-green/20',
    border: 'border-pink-500/30',
    text: 'text-verus-blue',
    icon: 'text-pink-400',
  },
} as const;

// Helper function to get tier styling
export function getTierStyling(tier: keyof typeof tierColors) {
  return tierColors[tier] || tierColors.bronze;
}

// Helper function to get rarity styling
export function getRarityStyling(rarity: keyof typeof rarityColors) {
  return rarityColors[rarity] || rarityColors.common;
}

// Helper function to get category styling
export function getCategoryStyling(category: keyof typeof categoryColors) {
  return categoryColors[category] || categoryColors.milestone;
}

// Icon size presets
export const iconSizes = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12',
  '2xl': 'h-16 w-16',
} as const;

// Badge size presets for different contexts
export const badgeSizes = {
  small: {
    container: 'p-3',
    icon: 'h-5 w-5',
    title: 'text-sm',
    description: 'text-xs',
  },
  medium: {
    container: 'p-4',
    icon: 'h-6 w-6',
    title: 'text-base',
    description: 'text-sm',
  },
  large: {
    container: 'p-6',
    icon: 'h-8 w-8',
    title: 'text-lg',
    description: 'text-base',
  },
} as const;
