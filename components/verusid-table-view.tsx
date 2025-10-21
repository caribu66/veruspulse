'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  CaretUp,
  CaretDown,
  ArrowSquareOut,
  User,
  Hash,
  Wallet,
  TrendUp,
  Star,
  Clock,
} from '@phosphor-icons/react';
import {
  VerusIDBrowseData,
  SortOptions,
} from '@/lib/types/verusid-browse-types';
import {
  formatVRSCAmount,
  formatAPY,
  formatLastActivity,
  getAPYColorClass,
  getActivityColorClass,
} from '@/lib/utils/verusid-utils';

interface VerusIDTableViewProps {
  identities: VerusIDBrowseData[];
  sortOptions: SortOptions;
  onSort: (sortBy: SortOptions['sortBy']) => void;
  onIdentityClick?: (identity: VerusIDBrowseData) => void;
}

export function VerusIDTableView({
  identities,
  sortOptions,
  onSort,
  onIdentityClick,
}: VerusIDTableViewProps) {
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  if (identities.length === 0) {
    return (
      <div className="text-center py-12">
        <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">
          No Identities Found
        </h3>
        <p className="text-blue-200">
          Try adjusting your filters or search terms.
        </p>
      </div>
    );
  }

  const SortButton = ({
    sortKey,
    children,
    icon,
  }: {
    sortKey: SortOptions['sortBy'];
    children: React.ReactNode;
    icon?: React.ReactNode;
  }) => {
    const isActive = sortOptions.sortBy === sortKey;
    const isAsc = isActive && sortOptions.sortOrder === 'asc';
    const isDesc = isActive && sortOptions.sortOrder === 'desc';

    return (
      <button
        onClick={() => onSort(sortKey)}
        className={`flex items-center space-x-1 px-3 py-2 text-left hover:bg-white/10 rounded-lg transition-colors ${
          isActive ? 'text-blue-300' : 'text-blue-200'
        }`}
      >
        {icon && <span className="mr-1">{icon}</span>}
        <span className="font-medium">{children}</span>
        {isActive && (
          <span className="ml-1">
            {isAsc ? (
              <CaretUp className="h-4 w-4" />
            ) : (
              <CaretDown className="h-4 w-4" />
            )}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
      {/* Table Header */}
      <div className="bg-slate-900 border-b border-slate-700 sticky top-0 z-10">
        <div className="grid grid-cols-12 gap-4 p-4 text-sm font-medium">
          <div className="col-span-4">
            <SortButton sortKey="name" icon={<User className="h-4 w-4" />}>
              Name
            </SortButton>
          </div>
          <div className="col-span-2">
            <SortButton sortKey="stakes" icon={<Hash className="h-4 w-4" />}>
              Stakes
            </SortButton>
          </div>
          <div className="col-span-2">
            <SortButton sortKey="rewards" icon={<Wallet className="h-4 w-4" />}>
              Rewards/Balance
            </SortButton>
          </div>
          <div className="col-span-1">
            <SortButton sortKey="apy" icon={<TrendUp className="h-4 w-4" />}>
              APY
            </SortButton>
          </div>
          <div className="col-span-1">
            <SortButton sortKey="rank" icon={<Star className="h-4 w-4" />}>
              Rank
            </SortButton>
          </div>
          <div className="col-span-1">
            <SortButton sortKey="recent" icon={<Clock className="h-4 w-4" />}>
              Last Activity
            </SortButton>
          </div>
          <div className="col-span-1 text-center">Actions</div>
        </div>
      </div>

      {/* Table Body */}
      <div className="divide-y divide-slate-700">
        {identities.map(identity => (
          <div
            key={identity.address}
            className={`grid grid-cols-12 gap-4 p-4 hover:bg-white/5 transition-colors cursor-pointer ${
              hoveredRow === identity.address ? 'bg-white/5' : ''
            }`}
            onMouseEnter={() => setHoveredRow(identity.address)}
            onMouseLeave={() => setHoveredRow(null)}
            onClick={() => onIdentityClick?.(identity)}
          >
            {/* Name Column */}
            <div className="col-span-4 min-w-0">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-blue-500/20 flex-shrink-0">
                  <User className="h-4 w-4 text-blue-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div
                    className="font-medium text-white truncate"
                    title={identity.friendlyName}
                  >
                    {identity.displayName}
                  </div>
                  <div
                    className="text-xs text-blue-200 truncate font-mono"
                    title={identity.address}
                  >
                    {identity.address.slice(0, 20)}...
                  </div>
                </div>
              </div>
            </div>

            {/* Stakes Column */}
            <div className="col-span-2 flex items-center">
              <div className="text-sm font-semibold text-white">
                {identity.totalStakes.toLocaleString()}
              </div>
            </div>

            {/* Rewards/Balance Column */}
            <div className="col-span-2 flex items-center">
              <div className="text-sm font-semibold text-green-400">
                {identity.totalRewardsVRSC > 0
                  ? formatVRSCAmount(identity.totalRewardsVRSC)
                  : formatVRSCAmount(identity.totalValueVRSC)}
              </div>
            </div>

            {/* APY Column */}
            <div className="col-span-1 flex items-center">
              <div
                className={`text-sm font-semibold ${getAPYColorClass(identity.apyAllTime)}`}
              >
                {formatAPY(identity.apyAllTime)}
              </div>
            </div>

            {/* Rank Column */}
            <div className="col-span-1 flex items-center">
              {identity.networkRank ? (
                <span className="px-2 py-1 bg-yellow-500/20 text-yellow-300 text-xs rounded-full">
                  #{identity.networkRank}
                </span>
              ) : (
                <span className="text-xs text-gray-400">-</span>
              )}
            </div>

            {/* Last Activity Column */}
            <div className="col-span-1 flex items-center">
              <div className="text-xs">
                <div
                  className={`${getActivityColorClass(identity.activityStatus)}`}
                >
                  {formatLastActivity(identity.lastStakeTime)}
                </div>
                <div className="text-gray-400">{identity.activityStatus}</div>
              </div>
            </div>

            {/* Actions Column */}
            <div className="col-span-1 flex items-center justify-center">
              <Link
                href={`/verusid?search=${encodeURIComponent(identity.address)}`}
                className="p-2 text-blue-300 hover:text-blue-200 transition-colors"
                onClick={e => e.stopPropagation()}
                title="View Details"
              >
                <ArrowSquareOut className="h-4 w-4" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
