'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
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
  const tCommon = useTranslations('common');
  const t = useTranslations('dashboard');
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
      // Silent error handling for achievements
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
              <span>{tCommon('retry')}</span>
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
      <div className="bg-gradient-to-r from-verus-blue/20 to-verus-green/20 backdrop-blur-sm rounded-2xl p-6 border border-blue-500/30">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-white mb-2 flex items-center space-x-3">
              <Trophy className="h-7 w-7 text-verus-blue" />
              <span>Achievements & Milestones</span>
            </h3>
            <p className="text-sm text-blue-200">
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
            <span>{tCommon('refresh')}</span>
          </button>
        </div>
      </div>

      {/* Records & Personal Bests */}
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6">
        <h4 className="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
          <Trophy className="h-6 w-6 text-verus-blue" />
          <span>Records & Personal Bests</span>
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-blue-500/30">
            <Trophy className="h-7 w-7 text-verus-teal mb-2" />
            <div className="text-sm text-blue-200 mb-1">Highest Reward</div>
            <div className="text-2xl font-bold text-white">
              {formatCryptoValue(stats.records.highest.amount, 'VRSC')}
            </div>
            {stats.records.highest.date && (
              <div className="text-xs text-blue-300 mt-2">
                {new Date(stats.records.highest.date).toLocaleDateString()}
              </div>
            )}
          </div>

          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-verus-green/30">
            <Calendar className="h-7 w-7 text-verus-green mb-2" />
            <div className="text-sm text-blue-200 mb-1">Best Month</div>
            <div className="text-2xl font-bold text-white">
              {formatFriendlyNumber(stats.records.bestMonth.rewards, {
                precision: 2,
              })}{' '}
              VRSC
            </div>
            {stats.records.bestMonth.month && (
              <div className="text-xs text-blue-300 mt-2">
                {stats.records.bestMonth.month}
              </div>
            )}
          </div>

          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-verus-blue/30">
            <Lightning className="h-7 w-7 text-verus-blue mb-2" />
            <div className="text-sm text-blue-200 mb-1">Avg Frequency</div>
            <div className="text-2xl font-bold text-white">
              {stats.performance.frequency.stakesPerWeek.toFixed(1)} / week
            </div>
            <div className="text-xs text-blue-300 mt-2">
              Every {stats.performance.frequency.avgDaysBetween.toFixed(1)} days
            </div>
          </div>
        </div>
      </div>

      {/* Achievement Portfolio */}
      {achievements && (
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-xl font-semibold text-white flex items-center space-x-2">
              <Trophy className="h-6 w-6 text-verus-blue" />
              <span>Achievement Portfolio</span>
            </h4>
            {achievements.total && (
              <Badge
                variant="outline"
                className="text-blue-300 border-blue-500/30 bg-verus-blue/10 px-3 py-1"
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
    </div>
  );
}
