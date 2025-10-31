'use client';

import { useState, useEffect } from 'react';

import {
  Clock,
  Lightning,
  TrendUp,
  TrendDown,
  Minus,
  Calendar,
} from '@phosphor-icons/react';
import { AnimatedCounter } from './animations/counter-animation';
import { SparklineChart } from './animations/sparkline-chart';
import {
  ICON_SIZES,
  ELEVATION,
  TRANSITIONS,
  HOVER_PATTERNS,
} from '@/lib/constants/design-tokens';

interface ActivitySnapshotProps {
  iaddr: string;
  stats: any;
  networkParticipation: any;
  stakingMomentum: any;
}

export function ActivitySnapshot({
  stats,
  networkParticipation,
  stakingMomentum,
}: ActivitySnapshotProps) {
  const [timeUntilNext, setTimeUntilNext] = useState<string>('Calculating...');

  // Calculate time until next expected stake
  useEffect(() => {
    if (!networkParticipation?.expectedStakeTimeFormatted) {
      setTimeUntilNext('Calculating...');
      return;
    }

    const updateCountdown = () => {
      // Parse the expected time string (e.g., "in 3 days 2 hours")
      const timeStr = networkParticipation.expectedStakeTimeFormatted;
      if (timeStr.includes('right now') || timeStr.includes('pending')) {
        setTimeUntilNext('Any moment now!');
      } else {
        setTimeUntilNext(timeStr);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [networkParticipation]);

  // Get last stake info
  const lastStake = stats?.summary?.lastStake
    ? new Date(stats.summary.lastStake)
    : null;

  // Get last stake amount from timeSeries daily data (most recent day with stakes)
  const dailyData = stats?.timeSeries?.daily || [];
  let lastStakeAmount = 0;
  if (dailyData.length > 0) {
    // Find the most recent day with stakes
    const recentDay = dailyData
      .filter((day: any) => day.stakeCount > 0)
      .sort(
        (a: any, b: any) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
      )[0];

    if (recentDay) {
      // Average reward per stake that day
      lastStakeAmount = recentDay.totalRewardsVRSC / recentDay.stakeCount;
    }
  }

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes} min ago`;
    if (diffHours < 24)
      return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) === 1 ? '' : 's'} ago`;
  };

  // Calculate streak (consecutive days with stakes in last 30 days)
  const calculateStreak = () => {
    const dailyData = stats?.timeSeries?.daily || [];

    if (dailyData.length === 0) {
      return { days: 0, status: 'inactive' };
    }

    const now = new Date();
    let streak = 0;

    // Check last 30 days
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(now);
      checkDate.setDate(checkDate.getDate() - i);
      const dateStr = checkDate.toDateString();

      // Check if there's a stake on this date from daily data
      const dayData = dailyData.find((day: any) => {
        const dayDate = new Date(day.date);
        return dayDate.toDateString() === dateStr && day.stakeCount > 0;
      });

      if (dayData) {
        streak++;
      } else if (i > 0) {
        // Break streak if we hit a day without a stake (but don't count today)
        break;
      }
    }

    let status = 'inactive';
    if (streak >= 7) status = 'great';
    else if (streak >= 3) status = 'good';
    else if (streak >= 1) status = 'fair';
    else status = 'inactive';

    return { days: streak, status };
  };

  const streak = calculateStreak();

  // Get momentum indicator
  const getMomentum = () => {
    if (!stakingMomentum)
      return { icon: Minus, text: 'Stable', color: 'text-gray-400' };

    const trend = stakingMomentum.trend || 'stable';
    if (trend === 'increasing') {
      return { icon: TrendUp, text: 'Increasing', color: 'text-green-400' };
    } else if (trend === 'decreasing') {
      return { icon: TrendDown, text: 'Decreasing', color: 'text-red-400' };
    }
    return { icon: Minus, text: 'Stable', color: 'text-gray-400' };
  };

  const momentum = getMomentum();
  const MomentumIcon = momentum.icon;

  // Prepare sparkline data (last 7 days activity)
  const getSparklineData = () => {
    const dailyData = stats?.timeSeries?.daily || [];

    if (dailyData.length === 0) return [];

    const now = new Date();
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(now);
      date.setDate(date.getDate() - (6 - i));
      return date.toDateString();
    });

    return last7Days.map(dateStr => {
      const dayData = dailyData.find((day: any) => {
        const dayDate = new Date(day.date);
        return dayDate.toDateString() === dateStr;
      });
      return dayData?.stakeCount || 0;
    });
  };

  const sparklineData = getSparklineData();

  return (
    <div
      className={`bg-slate-800/80 backdrop-blur-sm rounded-2xl border border-slate-600/50 ${ELEVATION.modal} overflow-hidden`}
    >
      {/* Header */}
      <div className="bg-slate-700/50 border-b border-slate-600/50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-500/20 rounded-xl">
              <Lightning className={`${ICON_SIZES.lg} text-blue-400`} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                Activity Snapshot
              </h2>
              <p className="text-gray-400 text-sm">
                Recent staking activity overview
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Last Stake */}
          <div
            className={`bg-slate-700/30 border border-slate-600/30 rounded-xl p-4 ${HOVER_PATTERNS.card} ${TRANSITIONS.all}`}
          >
            <div className="flex items-center space-x-2 mb-2">
              <Clock className={`${ICON_SIZES.sm} text-cyan-400`} />
              <span className="text-xs text-gray-400 uppercase tracking-wide">
                Last Stake
              </span>
            </div>
            {lastStake ? (
              <>
                <div className="text-2xl font-bold text-white mb-1">
                  {getTimeAgo(lastStake)}
                </div>
                <div className="text-sm text-cyan-400">
                  <AnimatedCounter
                    value={lastStakeAmount}
                    decimals={4}
                    duration={1000}
                  />{' '}
                  VRSC
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {lastStake.toLocaleString()}
                </div>
              </>
            ) : (
              <div className="text-lg text-gray-500">No recent stakes</div>
            )}
          </div>

          {/* Streak */}
          <div
            className={`bg-slate-700/30 border border-slate-600/30 rounded-xl p-4 ${HOVER_PATTERNS.card} ${TRANSITIONS.all}`}
          >
            <div className="flex items-center space-x-2 mb-2">
              <Calendar className={`${ICON_SIZES.sm} text-amber-400`} />
              <span className="text-xs text-gray-400 uppercase tracking-wide">
                Active Streak
              </span>
            </div>
            <div className="flex items-center space-x-2 mb-1">
              <div className="text-2xl font-bold text-white">{streak.days}</div>
              <div className="text-sm text-gray-400">
                day{streak.days === 1 ? '' : 's'}
              </div>
            </div>
            <div
              className={`text-xs font-medium ${
                streak.status === 'great'
                  ? 'text-green-400'
                  : streak.status === 'good'
                    ? 'text-blue-400'
                    : streak.status === 'fair'
                      ? 'text-yellow-400'
                      : 'text-gray-500'
              }`}
            >
              {streak.status === 'great'
                ? '🔥 Great streak!'
                : streak.status === 'good'
                  ? '✨ Keep it up!'
                  : streak.status === 'fair'
                    ? '⚡ Building...'
                    : '💤 Get started'}
            </div>
          </div>

          {/* Momentum */}
          <div
            className={`bg-slate-700/30 border border-slate-600/30 rounded-xl p-4 ${HOVER_PATTERNS.card} ${TRANSITIONS.all}`}
          >
            <div className="flex items-center space-x-2 mb-2">
              <MomentumIcon className={`${ICON_SIZES.sm} ${momentum.color}`} />
              <span className="text-xs text-gray-400 uppercase tracking-wide">
                Momentum
              </span>
            </div>
            <div className={`text-lg font-semibold ${momentum.color} mb-1`}>
              {momentum.text}
            </div>
            <div className="text-xs text-gray-400">Last 7 days trend</div>
            {sparklineData.length > 0 && (
              <div className="mt-2">
                <SparklineChart
                  data={sparklineData}
                  width={80}
                  height={20}
                  trend={momentum.text.toLowerCase() as any}
                  color={
                    momentum.color.includes('green')
                      ? '#10b981'
                      : momentum.color.includes('red')
                        ? '#ef4444'
                        : '#6b7280'
                  }
                />
              </div>
            )}
          </div>

          {/* Next Expected */}
          <div
            className={`bg-slate-700/30 border border-slate-600/30 rounded-xl p-4 ${HOVER_PATTERNS.card} ${TRANSITIONS.all}`}
          >
            <div className="flex items-center space-x-2 mb-2">
              <Clock className={`${ICON_SIZES.sm} text-purple-400`} />
              <span className="text-xs text-gray-400 uppercase tracking-wide">
                Next Stake
              </span>
            </div>
            <div className="text-lg font-semibold text-white mb-1">
              {timeUntilNext}
            </div>
            <div className="text-xs text-purple-400/70 font-medium">
              Estimation
            </div>
            {networkParticipation?.probability && (
              <div className="text-xs text-gray-400 mt-0.5">
                {networkParticipation.probability > 0
                  ? `${(networkParticipation.probability * 100).toFixed(1)}% chance`
                  : 'Based on network weight'}
              </div>
            )}
          </div>
        </div>

        {/* Quick View Button */}
        <div className="mt-4 pt-4 border-t border-slate-600/30">
          <button
            onClick={() => {
              // Scroll to recent stakes section
              document
                .getElementById('recent-stakes-timeline')
                ?.scrollIntoView({ behavior: 'smooth' });
            }}
            className={`w-full px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 hover:border-blue-500/50 rounded-lg text-blue-300 hover:text-blue-200 ${HOVER_PATTERNS.button} ${TRANSITIONS.all} flex items-center justify-center space-x-2`}
          >
            <Clock className={ICON_SIZES.sm} />
            <span className="text-sm font-medium">
              View Recent Stakes Timeline
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
