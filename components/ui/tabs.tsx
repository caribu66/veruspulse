'use client';

import { ReactNode } from 'react';

interface Tab {
  id: string;
  label: string;
  icon?: ReactNode;
  badge?: number | string;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

export function Tabs({
  tabs,
  activeTab,
  onTabChange,
  className = '',
}: TabsProps) {
  return (
    <div className={`border-b border-white/20 ${className}`}>
      <div className="flex space-x-1 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              flex items-center space-x-2 px-6 py-3 font-medium text-sm transition-all duration-200
              border-b-2 whitespace-nowrap
              ${
                activeTab === tab.id
                  ? 'border-blue-500 text-white bg-white/10'
                  : 'border-transparent text-blue-200 hover:text-white hover:bg-white/5'
              }
            `}
          >
            {tab.icon && <span className="flex-shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={`
                px-2 py-0.5 rounded-full text-xs font-semibold
                ${activeTab === tab.id ? 'bg-blue-500 text-white' : 'bg-white/20 text-blue-200'}
              `}
              >
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

interface TabPanelProps {
  id: string;
  activeTab: string;
  children: ReactNode;
  className?: string;
}

export function TabPanel({
  id,
  activeTab,
  children,
  className = '',
}: TabPanelProps) {
  if (id !== activeTab) return null;

  return (
    <div
      key={id}
      className={`animate-in fade-in duration-300 ${className}`}
      style={{ minHeight: '200px' }}
    >
      {children}
    </div>
  );
}
