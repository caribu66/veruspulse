'use client';

import Link from 'next/link';
import {
  User,
  Hash,
  TrendUp,
  Star,
  Clock,
  ArrowSquareOut,
  Wallet,
  ChartBar,
} from '@phosphor-icons/react';
import { VerusIDBrowseData } from '@/lib/types/verusid-browse-types';
import { 
  formatVRSCAmount, 
  formatAPY, 
  formatLastActivity, 
  getAPYColorClass, 
  getActivityColorClass 
} from '@/lib/utils/verusid-utils';

interface VerusIDCardGridProps {
  identities: VerusIDBrowseData[];
  onIdentityClick?: (identity: VerusIDBrowseData) => void;
}

export function VerusIDCardGrid({ identities, onIdentityClick }: VerusIDCardGridProps) {
  if (identities.length === 0) {
    return (
      <div className="text-center py-12">
        <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">No Identities Found</h3>
        <p className="text-blue-200">Try adjusting your filters or search terms.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
      {identities.map((identity) => (
        <div
          key={identity.address}
          className="bg-slate-800 border border-slate-700 rounded-lg p-4 hover:bg-white/10 transition-colors cursor-pointer group"
          onClick={() => onIdentityClick?.(identity)}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <User className="h-4 w-4 text-blue-400" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-medium text-white truncate" title={identity.friendlyName}>
                  {identity.displayName}
                </h4>
                <p className="text-xs text-blue-200 truncate" title={identity.address}>
                  {identity.address.slice(0, 16)}...
                </p>
              </div>
            </div>
            <ArrowSquareOut className="h-4 w-4 text-blue-300 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-white/5 rounded-lg p-2">
              <div className="flex items-center space-x-1 mb-1">
                <Hash className="h-3 w-3 text-blue-300" />
                <span className="text-xs text-blue-200">Stakes</span>
              </div>
              <div className="text-sm font-semibold text-white">
                {identity.totalStakes.toLocaleString()}
              </div>
            </div>

            <div className="bg-white/5 rounded-lg p-2">
              <div className="flex items-center space-x-1 mb-1">
                <Wallet className="h-3 w-3 text-green-300" />
                <span className="text-xs text-blue-200">
                  {identity.totalRewardsVRSC > 0 ? 'Rewards' : 'Balance'}
                </span>
              </div>
              <div className="text-sm font-semibold text-green-400">
                {identity.totalRewardsVRSC > 0 
                  ? `${formatVRSCAmount(identity.totalRewardsVRSC)} VRSC`
                  : `${formatVRSCAmount(identity.totalValueVRSC)} VRSC`
                }
              </div>
            </div>

            <div className="bg-white/5 rounded-lg p-2">
              <div className="flex items-center space-x-1 mb-1">
                <TrendUp className="h-3 w-3 text-yellow-300" />
                <span className="text-xs text-blue-200">APY</span>
              </div>
              <div className={`text-sm font-semibold ${getAPYColorClass(identity.apyAllTime)}`}>
                {formatAPY(identity.apyAllTime)}
              </div>
            </div>

            <div className="bg-white/5 rounded-lg p-2">
              <div className="flex items-center space-x-1 mb-1">
                <Clock className="h-3 w-3 text-purple-300" />
                <span className="text-xs text-blue-200">Last</span>
              </div>
              <div className={`text-sm font-semibold ${getActivityColorClass(identity.activityStatus)}`}>
                {formatLastActivity(identity.lastStakeTime)}
              </div>
            </div>
          </div>

          {/* Network Rank Badge */}
          {identity.networkRank && identity.networkRank <= 100 && (
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-1">
                <Star className="h-3 w-3 text-yellow-400" />
                <span className="text-xs text-yellow-300">Network Rank</span>
              </div>
              <span className="px-2 py-1 bg-yellow-500/20 text-yellow-300 text-xs rounded-full">
                #{identity.networkRank}
              </span>
            </div>
          )}

          {/* Activity Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                identity.activityStatus === 'active' ? 'bg-green-400' : 
                identity.activityStatus === 'inactive' ? 'bg-gray-400' : 'bg-yellow-400'
              }`} />
              <span className={`text-xs capitalize ${getActivityColorClass(identity.activityStatus)}`}>
                {identity.activityStatus}
              </span>
            </div>
            
            <Link
              href={`/verusid?search=${encodeURIComponent(identity.address)}`}
              className="text-xs text-blue-300 hover:text-blue-200 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              View Details →
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
