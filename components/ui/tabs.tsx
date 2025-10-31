'use client';

import { type ReactNode } from 'react';
import { useTranslations } from 'next-intl';

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
  const tCommon = useTranslations('common');
  return (
    <div
      className={`relative bg-gradient-to-b from-slate-50/80 to-white/50 dark:from-slate-800/30 dark:to-slate-900/20 backdrop-blur-sm ${className}`}
      role="tablist"
    >
      <div className="flex gap-1 sm:gap-2 overflow-x-auto scrollbar-hide px-2 sm:px-4 py-2 sm:py-3">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`
              group relative flex items-center justify-center gap-1.5 sm:gap-2.5
              px-3 sm:px-5 py-2.5 sm:py-3
              font-semibold text-xs sm:text-sm
              transition-all duration-300 ease-out
              whitespace-nowrap flex-shrink-0
              rounded-lg sm:rounded-xl
              ${
                activeTab === tab.id
                  ? 'text-white dark:text-white shadow-lg shadow-verus-blue/30 dark:shadow-verus-blue-light/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }
            `}
          >
            {/* Active background with gradient */}
            <span
              className={`
                absolute inset-0 rounded-lg sm:rounded-xl
                bg-gradient-to-br from-verus-blue via-verus-blue to-blue-600
                dark:from-verus-blue-light dark:via-blue-500 dark:to-verus-blue
                transition-all duration-300 ease-out
                ${
                  activeTab === tab.id
                    ? 'opacity-100 scale-100'
                    : 'opacity-0 scale-95'
                }
              `}
            />

            {/* Hover background effect */}
            <span
              className={`
                absolute inset-0 rounded-lg sm:rounded-xl
                bg-gradient-to-br from-slate-100/80 to-slate-200/60
                dark:from-slate-700/50 dark:to-slate-800/50
                transition-all duration-200
                ${activeTab === tab.id ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'}
              `}
            />

            {/* Shine effect on hover */}
            <span
              className={`
                absolute inset-0 rounded-lg sm:rounded-xl
                bg-gradient-to-tr from-transparent via-white/20 to-transparent
                opacity-0 group-hover:opacity-100
                transition-opacity duration-300
                ${activeTab === tab.id ? '' : ''}
              `}
            />

            {/* Icon with animation */}
            {tab.icon && (
              <span
                className={`
                  relative z-10 flex-shrink-0 transition-all duration-300
                  ${activeTab === tab.id ? 'scale-110 drop-shadow-sm' : 'group-hover:scale-105'}
                `}
              >
                {tab.icon}
              </span>
            )}

            {/* Label */}
            <span className="relative z-10 hidden xs:inline sm:inline tracking-wide">
              {tab.label}
            </span>
            <span className="relative z-10 inline xs:hidden sm:hidden truncate max-w-[60px] tracking-wide">
              {tab.label.split(' ')[0]}
            </span>

            {/* Badge */}
            {tab.badge !== undefined && (
              <span
                className={`
                  relative z-10
                  px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold
                  transition-all duration-300
                  ${
                    activeTab === tab.id
                      ? 'bg-white/25 text-white backdrop-blur-sm ring-1 ring-white/30'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 group-hover:bg-slate-300 dark:group-hover:bg-slate-600'
                  }
                `}
              >
                {tab.badge}
              </span>
            )}

            {/* Active tab bottom accent */}
            <span
              className={`
                absolute -bottom-[2px] left-1/2 -translate-x-1/2
                h-1 rounded-full
                bg-gradient-to-r from-transparent via-verus-blue to-transparent
                dark:via-verus-blue-light
                transition-all duration-300 ease-out
                ${
                  activeTab === tab.id
                    ? 'w-3/4 opacity-100'
                    : 'w-0 opacity-0'
                }
              `}
            />
          </button>
        ))}
      </div>

      {/* Bottom decorative line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-600 to-transparent" />
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
