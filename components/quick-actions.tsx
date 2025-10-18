'use client';

import { useState } from 'react';
import {
  MagnifyingGlass,
  ArrowsClockwise,
  Gear,
  Bell,
  DownloadSimple,
  UploadSimple,
  Funnel,
  BookmarkSimple,
} from '@phosphor-icons/react';

interface QuickAction {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  action: () => void;
  badge?: string | number;
  disabled?: boolean;
}

interface QuickActionsProps {
  onSearch?: () => void;
  onRefresh?: () => void;
  onSettings?: () => void;
  onNotifications?: () => void;
  onExport?: () => void;
  onImport?: () => void;
  onFilter?: () => void;
  onBookmark?: () => void;
  className?: string;
  compact?: boolean;
  showLabels?: boolean;
}

export function QuickActions({
  onSearch,
  onRefresh,
  onSettings,
  onNotifications,
  onExport,
  onImport,
  onFilter,
  onBookmark,
  className = '',
  compact = false,
  showLabels = true,
}: QuickActionsProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

  const handleRefresh = async () => {
    if (onRefresh) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setTimeout(() => setIsRefreshing(false), 1000);
      }
    }
  };

  const actions: QuickAction[] = [
    {
      id: 'search',
      icon: MagnifyingGlass,
      label: 'Search',
      action: onSearch || (() => {}),
    },
    {
      id: 'refresh',
      icon: ArrowsClockwise,
      label: 'Refresh',
      action: handleRefresh,
      disabled: isRefreshing,
    },
    {
      id: 'notifications',
      icon: Bell,
      label: 'Notifications',
      action: onNotifications || (() => {}),
      badge: notificationCount > 0 ? notificationCount : undefined,
    },
    {
      id: 'filter',
      icon: Funnel,
      label: 'Filter',
      action: onFilter || (() => {}),
    },
    {
      id: 'bookmark',
      icon: BookmarkSimple,
      label: 'Bookmark',
      action: onBookmark || (() => {}),
    },
    {
      id: 'export',
      icon: DownloadSimple,
      label: 'Export',
      action: onExport || (() => {}),
    },
    {
      id: 'import',
      icon: UploadSimple,
      label: 'Import',
      action: onImport || (() => {}),
    },
    {
      id: 'settings',
      icon: Gear,
      label: 'Settings',
      action: onSettings || (() => {}),
    },
  ];

  const visibleActions = compact ? actions.slice(0, 4) : actions;

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      {visibleActions.map(action => {
        const Icon = action.icon;
        return (
          <button
            key={action.id}
            onClick={action.action}
            disabled={action.disabled}
            className={`
              relative flex items-center space-x-1 px-2 py-1.5 rounded-lg transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-blue-500/50
              ${
                action.disabled
                  ? 'text-white/40 cursor-not-allowed'
                  : 'text-white/80 hover:text-white hover:bg-white/10 hover:shadow-md'
              }
              ${compact ? 'px-2 py-1' : 'px-3 py-2'}
            `}
            title={action.label}
            aria-label={action.label}
          >
            <Icon
              className={`h-4 w-4 ${action.disabled ? 'animate-spin' : ''}`}
            />
            {showLabels && !compact && (
              <span className="text-sm font-medium">{action.label}</span>
            )}
            {action.badge && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {typeof action.badge === 'number' && action.badge > 99
                  ? '99+'
                  : action.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
