'use client';

import { useState } from 'react';
import {
  ChartBar,
  Pulse,
  UsersThree,
  TrendUp,
  Fire,
} from '@phosphor-icons/react';

export type DashboardTab =
  | 'overview'
  | 'network'
  | 'activity'
  | 'featured'
  | 'trending';

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
      id: 'trending' as DashboardTab,
      label: 'Trending',
      icon: Fire,
      description: "What's hot",
    },
  ];

  return (
    <div className="border-b border-slate-300 dark:border-white/10 bg-gray-50 dark:bg-white/5 backdrop-blur-sm">
      <div className="flex overflow-x-auto scrollbar-hide">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-2 px-6 py-4 border-b-2 transition-all whitespace-nowrap ${
                isActive
                  ? 'border-slate-500 text-white bg-slate-600 border border-slate-500'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5'
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? 'text-slate-200' : ''}`} />
              <div className="text-left">
                <div className="font-semibold">{tab.label}</div>
                <div className="text-xs opacity-75">{tab.description}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
