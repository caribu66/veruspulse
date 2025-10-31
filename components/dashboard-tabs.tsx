'use client';

import { useTranslations } from 'next-intl';
import { Tabs } from '@/components/ui/tabs';
import {
  ChartBar,
  Pulse,
  UsersThree,
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
  const t = useTranslations('dashboard');
  const tVerusId = useTranslations('verusid');

  const tabs = [
    {
      id: 'overview',
      label: t('overview'),
      icon: <ChartBar className="h-4 w-4" />,
    },
    {
      id: 'network',
      label: t('networkStats'),
      icon: <Pulse className="h-4 w-4" />,
    },
    {
      id: 'activity',
      label: t('recentActivity'),
      icon: <Pulse className="h-4 w-4" />,
    },
    {
      id: 'featured',
      label: t('featured'),
      icon: <UsersThree className="h-4 w-4" />,
    },
    {
      id: 'browse',
      label: tVerusId('browse'),
      icon: <Eye className="h-4 w-4" />,
    },
  ];

  return (
    <Tabs
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={onTabChange as (tabId: string) => void}
    />
  );
}
