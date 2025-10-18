'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Trophy,
  Medal,
  Target,
  Calendar,
  Lightning,
  ArrowsClockwise,
  WarningCircle,
} from '@phosphor-icons/react';
import {
  formatCryptoValue,
  formatFriendlyNumber,
} from '@/lib/utils/number-formatting';
import { ProfessionalAchievementProgress } from './professional-achievement-progress';
import { Badge } from '@/components/ui/badge';
import { DashboardSkeleton } from './animations/skeleton-loader';

interface AchievementsProps {
  iaddr: string;
}

export function VerusIDAchievements({ iaddr }: AchievementsProps) {
  const [achievements, setAchievements] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAchievements = useCallback(async () => {
    try {
      const response = await fetch(`/api/verusid/${iaddr}/achievements`);
      const data = await response.json();

      if (data.success) {
        setAchievements(data.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch achievements:', err.message);
    }
  }, [iaddr]);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/verusid/${iaddr}/staking-stats`);
      const data = await response.json();

      if (data.success) {
        setStats(data.data);
      } else {
        setError(data.error || 'Failed to fetch statistics');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }, [iaddr]);

  useEffect(() => {
    if (iaddr) {
      fetchStats();
      fetchAchievements();
    }
  }, [iaddr, fetchStats, fetchAchievements]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6">
        <div className="flex items-start space-x-3">
          <WarningCircle className="h-6 w-6 text-red-400 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <div className="text-red-400 font-semibold text-lg">
              Error Loading Achievements
            </div>
            <div className="text-red-300 text-sm mt-1">{error}</div>
            <button
              onClick={() => {
                fetchStats();
                fetchAchievements();
              }}
              className="mt-4 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm transition-colors flex items-center space-x-2"
            >
              <ArrowsClockwise className="h-4 w-4" />
              <span>Retry</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-12 text-center">
        <Trophy className="h-16 w-16 text-yellow-300 mx-auto mb-4 opacity-50" />
        <h3 className="text-xl font-semibold mb-2">
          No Achievement Data Available
        </h3>
        <p className="text-blue-200">
          Unable to load achievement information for this identity.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 backdrop-blur-sm rounded-2xl p-6 border border-yellow-500/30">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-white mb-2 flex items-center space-x-3">
              <Trophy className="h-7 w-7 text-verus-teal" />
              <span>Achievements & Milestones</span>
            </h3>
            <p className="text-sm text-yellow-200">
              Track your staking accomplishments and progress
            </p>
          </div>
          <button
            onClick={() => {
              fetchStats();
              fetchAchievements();
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-white"
          >
            <ArrowsClockwise className="h-4 w-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Records & Achievements */}
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6">
        <h4 className="text-xl font-semibold text-white mb-6 flex items-center space-x-2">
          <Trophy className="h-6 w-6 text-verus-teal" />
          <span>Records & Personal Bests</span>
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-xl p-6 border border-yellow-500/30">
            <Trophy className="h-8 w-8 text-verus-teal mb-3" />
            <div className="text-sm text-yellow-200 mb-1">Highest Reward</div>
            <div className="text-2xl font-bold text-verus-teal">
              {formatCryptoValue(stats.records.highest.amount, 'VRSC')}
            </div>
            {stats.records.highest.date && (
              <div className="text-xs text-yellow-300 mt-2">
                {new Date(stats.records.highest.date).toLocaleDateString()}
              </div>
            )}
          </div>

          <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl p-6 border border-green-500/30">
            <Calendar className="h-8 w-8 text-green-400 mb-3" />
            <div className="text-sm text-green-200 mb-1">Best Month</div>
            <div className="text-2xl font-bold text-green-400">
              {formatFriendlyNumber(stats.records.bestMonth.rewards, {
                precision: 2,
              })}{' '}
              VRSC
            </div>
            {stats.records.bestMonth.month && (
              <div className="text-xs text-green-300 mt-2">
                {stats.records.bestMonth.month}
              </div>
            )}
          </div>

          <div className="bg-gradient-to-br from-verus-blue/20 to-verus-green/20 rounded-xl p-6 border border-verus-blue/30">
            <Lightning className="h-8 w-8 text-verus-blue mb-3" />
            <div className="text-sm text-purple-200 mb-1">Avg Frequency</div>
            <div className="text-2xl font-bold text-verus-blue">
              {stats.performance.frequency.stakesPerWeek.toFixed(1)} / week
            </div>
            <div className="text-xs text-purple-300 mt-2">
              Every {stats.performance.frequency.avgDaysBetween.toFixed(1)} days
            </div>
          </div>
        </div>

        {/* Milestones */}
        <div className="mt-6">
          <h5 className="text-md font-semibold text-white mb-3">
            Unlocked Milestones
          </h5>
          <div className="flex flex-wrap gap-3">
            {stats.summary.totalStakes >= 100 && (
              <div className="px-4 py-2 bg-blue-500/20 border border-blue-500/30 rounded-full text-blue-300 text-sm font-medium flex items-center space-x-2">
                <Target className="h-4 w-4" />
                <span>100+ Stakes</span>
              </div>
            )}
            {stats.summary.totalStakes >= 500 && (
              <div className="px-4 py-2 bg-verus-blue/20 border border-verus-blue/30 rounded-full text-purple-300 text-sm font-medium flex items-center space-x-2">
                <Medal className="h-4 w-4" />
                <span>500+ Stakes</span>
              </div>
            )}
            {stats.summary.totalStakes >= 1000 && (
              <div className="px-4 py-2 bg-verus-teal/20 border border-yellow-500/30 rounded-full text-yellow-300 text-sm font-medium flex items-center space-x-2">
                <Trophy className="h-4 w-4" />
                <span>1000+ Stakes Club</span>
              </div>
            )}
            {stats.summary.totalRewardsVRSC >= 100 && (
              <div className="px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-full text-green-300 text-sm font-medium flex items-center space-x-2">
                <Medal className="h-4 w-4" />
                <span>100+ VRSC Earned</span>
              </div>
            )}
            {stats.summary.totalRewardsVRSC >= 1000 && (
              <div className="px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 rounded-full text-emerald-300 text-sm font-medium flex items-center space-x-2">
                <Trophy className="h-4 w-4" />
                <span>1000+ VRSC Elite</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Achievement Gallery */}
      {achievements && (
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-xl font-semibold text-white flex items-center space-x-2">
              <Trophy className="h-6 w-6 text-verus-teal" />
              <span>Achievement Portfolio</span>
            </h4>
            {achievements.total && (
              <Badge
                variant="outline"
                className="text-yellow-300 border-yellow-500/30 bg-verus-teal/10 px-3 py-1"
              >
                {achievements.total.earned}/{achievements.total.available}{' '}
                Unlocked
              </Badge>
            )}
          </div>

          <ProfessionalAchievementProgress
            achievements={[
              ...achievements.earned.map((badge: any) => ({
                ...badge,
                earned: true,
              })),
              ...achievements.progress.map((badge: any) => ({
                ...badge,
                earned: false,
              })),
              ...(achievements.locked || []).map((badge: any) => ({
                ...badge,
                earned: false,
              })),
            ]}
            recentUnlocks={achievements.recentUnlocks || []}
            totalStats={
              achievements.total || { earned: 0, available: 0, progress: 0 }
            }
            rarityStats={achievements.rarity || {}}
          />
        </div>
      )}

      {/* Stats Summary */}
      <div className="bg-gradient-to-r from-verus-blue/10 to-verus-green/10 backdrop-blur-sm rounded-2xl border border-blue-500/20 p-6">
        <h4 className="text-lg font-semibold text-white mb-4">
          Achievement Stats
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-400">
              {stats.summary.totalStakes}
            </div>
            <div className="text-sm text-blue-200 mt-1">Total Stakes</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-400">
              {formatFriendlyNumber(stats.summary.totalRewardsVRSC, {
                precision: 0,
              })}
            </div>
            <div className="text-sm text-green-200 mt-1">Total VRSC Earned</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-verus-teal">
              {stats.summary.apyAllTime
                ? stats.summary.apyAllTime.toFixed(1)
                : '0.0'}
              %
            </div>
            <div className="text-sm text-yellow-200 mt-1">Lifetime APY</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-verus-blue">
              {achievements?.total?.earned || 0}
            </div>
            <div className="text-sm text-purple-200 mt-1">Achievements</div>
          </div>
        </div>
      </div>
    </div>
  );
}
