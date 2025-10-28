'use client';

import { useState } from 'react';
import {
  ChartBar,
  Pulse,
  UsersThree,
  TrendUp,
  Eye,
} from '@phosphor-icons/react';

export type DashboardTab =
  | 'overview'
  | 'network'
  | 'activity'
  | 'featured'
  | 'browse';

interface DashboardTabsProps {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
}

export function DashboardTabs({ activeTab, onTabChange }: DashboardTabsProps) {
  const tabs = [
    {
      id: 'overview' as DashboardTab,
      label: 'Overview',
      icon: ChartBar,
      description: 'Network summary',
    },
    {
      id: 'network' as DashboardTab,
      label: 'Network Stats',
      icon: Pulse,
      description: 'Detailed statistics',
    },
    {
      id: 'activity' as DashboardTab,
      label: 'Recent Activity',
      icon: Pulse,
      description: 'Latest blocks & txs',
    },
    {
      id: 'featured' as DashboardTab,
      label: 'Featured',
      icon: UsersThree,
      description: 'Community spotlight',
    },
    {
      id: 'browse' as DashboardTab,
      label: 'Browse',
      icon: Eye,
      description: 'Explore all VerusIDs',
    },
  ];

  return (
    <div className="border-b border-slate-300 dark:border-white/10 bg-gray-50 dark:bg-white/5 backdrop-blur-sm">
      <div className="flex overflow-x-auto scrollbar-hide px-2 sm:px-0">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-6 py-2 sm:py-4 border-b-2 transition-all whitespace-nowrap touch-manipulation min-w-0 ${
                isActive
                  ? 'border-slate-500 text-white bg-slate-600 border border-slate-500'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5'
              }`}
            >
              <Icon
                className={`h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 ${isActive ? 'text-slate-200' : ''}`}
              />
              <div className="text-left min-w-0">
                <div className="font-semibold text-xs sm:text-sm truncate">
                  {tab.label}
                </div>
                <div className="text-xs opacity-75 hidden sm:block truncate">
                  {tab.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
