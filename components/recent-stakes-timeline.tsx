'use client';

import { useState } from 'react';
import {
  Clock,
  Calendar,
  Lightning,
  CaretDown,
  CaretUp,
} from '@phosphor-icons/react';
import { formatCryptoValue } from '@/lib/utils/number-formatting';

interface RecentStakesTimelineProps {
  iaddr: string;
  recentStakes: any[];
}

export function RecentStakesTimeline({
  iaddr,
  recentStakes,
}: RecentStakesTimelineProps) {
  const [timeFilter, setTimeFilter] = useState<'all' | '24h' | '7d' | '30d'>(
    '30d'
  );
  const [expanded, setExpanded] = useState(false);
  const [showLimit, setShowLimit] = useState(10);

  // Filter stakes by time period
  const filteredStakes =
    recentStakes?.filter((stake: any) => {
      if (timeFilter === 'all') return true;

      const now = new Date();
      const stakeDate = new Date(stake.blockTime);
      const diffMs = now.getTime() - stakeDate.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      const diffDays = diffHours / 24;

      switch (timeFilter) {
        case '24h':
          return diffHours < 24;
        case '7d':
          return diffDays < 7;
        case '30d':
          return diffDays < 30;
        default:
          return true;
      }
    }) || [];

  // Get display stakes
  const displayStakes = expanded
    ? filteredStakes
    : filteredStakes.slice(0, showLimit);

  // Format time ago
  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 60) {
      return `${diffMinutes} min ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hr ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    } else {
      return `${Math.floor(diffDays / 7)} wk ago`;
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year:
        date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
    });
  };

  // Calculate total in filtered period
  const totalAmount = filteredStakes.reduce(
    (sum, stake) => sum + (stake.amountVRSC || 0),
    0
  );

  return (
    <div
      className="bg-slate-800/80 backdrop-blur-sm rounded-3xl border border-slate-600/50 shadow-2xl overflow-hidden"
      id="recent-stakes-timeline"
    >
      {/* Header */}
      <div className="bg-slate-700/50 border-b border-slate-600/50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-500/20 rounded-xl">
              <Lightning className="h-6 w-6 text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Recent Stakes</h2>
              <p className="text-gray-400 text-sm">
                {filteredStakes.length} stake
                {filteredStakes.length === 1 ? '' : 's'} in the last{' '}
                {timeFilter === 'all' ? 'all time' : timeFilter}
              </p>
            </div>
          </div>

          {/* Time Filters */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setTimeFilter('24h')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                timeFilter === '24h'
                  ? 'bg-purple-500/30 text-purple-200 border border-purple-400/50'
                  : 'bg-slate-700/50 text-gray-400 hover:bg-slate-600/50 hover:text-gray-300 border border-slate-600/30'
              }`}
            >
              24h
            </button>
            <button
              onClick={() => setTimeFilter('7d')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                timeFilter === '7d'
                  ? 'bg-purple-500/30 text-purple-200 border border-purple-400/50'
                  : 'bg-slate-700/50 text-gray-400 hover:bg-slate-600/50 hover:text-gray-300 border border-slate-600/30'
              }`}
            >
              7d
            </button>
            <button
              onClick={() => setTimeFilter('30d')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                timeFilter === '30d'
                  ? 'bg-purple-500/30 text-purple-200 border border-purple-400/50'
                  : 'bg-slate-700/50 text-gray-400 hover:bg-slate-600/50 hover:text-gray-300 border border-slate-600/30'
              }`}
            >
              30d
            </button>
            <button
              onClick={() => setTimeFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                timeFilter === 'all'
                  ? 'bg-purple-500/30 text-purple-200 border border-purple-400/50'
                  : 'bg-slate-700/50 text-gray-400 hover:bg-slate-600/50 hover:text-gray-300 border border-slate-600/30'
              }`}
            >
              All
            </button>
          </div>
        </div>

        {/* Summary */}
        {filteredStakes.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-600/30">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-4">
                <div>
                  <span className="text-gray-400">Total in period:</span>
                  <span className="text-green-400 font-semibold ml-2">
                    {formatCryptoValue(totalAmount)} VRSC
                  </span>
                </div>
              </div>
              <div>
                <span className="text-gray-400">Average per stake:</span>
                <span className="text-purple-300 font-semibold ml-2">
                  {formatCryptoValue(totalAmount / filteredStakes.length)} VRSC
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="p-6">
        {displayStakes.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No stakes found in this period</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayStakes.map((stake: any, index: number) => (
              <div
                key={stake.txid || index}
                className="flex items-start space-x-4 bg-slate-700/30 hover:bg-slate-700/50 border border-slate-600/30 hover:border-purple-500/30 rounded-xl p-4 transition-all"
              >
                {/* Timeline connector */}
                <div className="flex flex-col items-center pt-1">
                  <div className="w-10 h-10 rounded-full bg-purple-500/20 border-2 border-purple-400/50 flex items-center justify-center flex-shrink-0">
                    <Lightning className="h-4 w-4 text-purple-400" />
                  </div>
                  {index < displayStakes.length - 1 && (
                    <div className="w-0.5 h-full bg-slate-600/50 mt-2" />
                  )}
                </div>

                {/* Stake details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-white font-semibold">
                          {formatCryptoValue(stake.amountVRSC || 0)} VRSC
                        </span>
                        {stake.blockHeight && (
                          <span className="text-xs text-gray-500 px-2 py-0.5 bg-slate-600/50 rounded">
                            Block {stake.blockHeight}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-3 text-xs text-gray-400">
                        <span className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{getTimeAgo(stake.blockTime)}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(stake.blockTime)}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Show more button */}
        {filteredStakes.length > showLimit && (
          <div className="mt-4 pt-4 border-t border-slate-600/30">
            <button
              onClick={() => {
                if (expanded) {
                  setExpanded(false);
                  setShowLimit(10);
                } else {
                  setExpanded(true);
                }
              }}
              className="w-full px-4 py-2 bg-slate-700/50 hover:bg-slate-700/70 border border-slate-600/30 hover:border-purple-500/30 rounded-lg text-purple-300 hover:text-purple-200 transition-all flex items-center justify-center space-x-2"
            >
              {expanded ? (
                <>
                  <CaretUp className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    Show Less ({showLimit} stakes)
                  </span>
                </>
              ) : (
                <>
                  <CaretDown className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    Show All {filteredStakes.length} Stakes
                  </span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
