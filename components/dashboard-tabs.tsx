'use client';

import { useState } from 'react';
import {
  ChartBar,
  Activity,
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
      icon: Activity,
      description: 'Detailed statistics',
    },
    {
      id: 'activity' as DashboardTab,
      label: 'Recent Activity',
      icon: Activity,
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
    <div className="border-b border-white/10 bg-white/5 backdrop-blur-sm">
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
                  ? 'border-blue-400 text-white bg-slate-800 border border-slate-700'
                  : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? 'text-blue-400' : ''}`} />
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
