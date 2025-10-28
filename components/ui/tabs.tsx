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
    <div
      className={`border-b border-slate-300 dark:border-white/20 ${className}`}
    >
      <div className="flex gap-1 overflow-x-auto scrollbar-hide -mb-px">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 
              font-medium text-xs sm:text-sm transition-all duration-200
              border-b-2 whitespace-nowrap flex-shrink-0
              ${
                activeTab === tab.id
                  ? 'border-verus-blue text-white bg-verus-blue rounded-t-lg'
                  : 'border-transparent text-gray-600 dark:text-blue-200 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 rounded-t-lg'
              }
            `}
          >
            {tab.icon && <span className="flex-shrink-0">{tab.icon}</span>}
            <span className="hidden xs:inline sm:inline">{tab.label}</span>
            <span className="inline xs:hidden sm:hidden truncate max-w-[60px]">
              {tab.label.split(' ')[0]}
            </span>
            {tab.badge !== undefined && (
              <span
                className={`
                px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold
                ${activeTab === tab.id ? 'bg-white text-verus-blue' : 'bg-gray-200 dark:bg-white/20 text-gray-600 dark:text-blue-200'}
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
