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

// Tier color mappings - Professional minimal palette
export const tierColors = {
  bronze: {
    bg: 'bg-slate-700/30',
    border: 'border-slate-600/40',
    text: 'text-slate-200',
    icon: 'text-slate-300',
    glow: 'shadow-slate-500/10',
  },
  silver: {
    bg: 'bg-gray-600/30',
    border: 'border-gray-500/40',
    text: 'text-gray-200',
    icon: 'text-gray-300',
    glow: 'shadow-gray-500/10',
  },
  gold: {
    bg: 'bg-slate-600/30',
    border: 'border-slate-500/40',
    text: 'text-slate-100',
    icon: 'text-slate-200',
    glow: 'shadow-slate-400/15',
  },
  platinum: {
    bg: 'bg-slate-500/30',
    border: 'border-slate-400/40',
    text: 'text-white',
    icon: 'text-slate-100',
    glow: 'shadow-slate-300/15',
  },
  legendary: {
    bg: 'bg-slate-400/30',
    border: 'border-slate-300/40',
    text: 'text-white',
    icon: 'text-white',
    glow: 'shadow-slate-200/20',
  },
} as const;

// Rarity color mappings - Professional minimal palette
export const rarityColors = {
  common: {
    bg: 'bg-slate-700/20',
    border: 'border-slate-600/30',
    text: 'text-slate-300',
    badge: 'bg-slate-700/30 text-slate-200',
  },
  uncommon: {
    bg: 'bg-slate-600/20',
    border: 'border-slate-500/30',
    text: 'text-slate-200',
    badge: 'bg-slate-600/30 text-slate-100',
  },
  rare: {
    bg: 'bg-slate-500/20',
    border: 'border-slate-400/30',
    text: 'text-slate-100',
    badge: 'bg-slate-500/30 text-white',
  },
  epic: {
    bg: 'bg-slate-400/20',
    border: 'border-slate-300/30',
    text: 'text-white',
    badge: 'bg-slate-400/30 text-white',
  },
  legendary: {
    bg: 'bg-slate-300/20',
    border: 'border-slate-200/30',
    text: 'text-white',
    badge: 'bg-slate-300/30 text-slate-900',
  },
} as const;

// Category color mappings - Professional minimal palette
export const categoryColors = {
  milestone: {
    bg: 'bg-slate-700/20',
    border: 'border-slate-600/30',
    text: 'text-slate-300',
    icon: 'text-slate-400',
  },
  performance: {
    bg: 'bg-slate-600/20',
    border: 'border-slate-500/30',
    text: 'text-slate-200',
    icon: 'text-slate-300',
  },
  consistency: {
    bg: 'bg-slate-500/20',
    border: 'border-slate-400/30',
    text: 'text-slate-100',
    icon: 'text-slate-200',
  },
  special: {
    bg: 'bg-slate-400/20',
    border: 'border-slate-300/30',
    text: 'text-white',
    icon: 'text-slate-100',
  },
  elite: {
    bg: 'bg-slate-300/20',
    border: 'border-slate-200/30',
    text: 'text-white',
    icon: 'text-white',
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
