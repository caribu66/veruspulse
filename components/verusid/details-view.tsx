'use client';

import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useTranslations } from 'next-intl';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Tabs, TabPanel } from '@/components/ui/tabs';
import { TruncatedAddress } from '@/components/ui/truncated-address';
import { Heading, Text } from '@/components/ui/typography';
import { User, TrendUp, Database, Medal, Info } from '@phosphor-icons/react';

// Lazy load heavy tab components
const VerusIDStakingDashboard = lazy(() =>
  import('../verusid-staking-dashboard').then(mod => ({
    default: mod.VerusIDStakingDashboard,
  }))
);
const VerusIDUTXOAnalytics = lazy(() =>
  import('../verusid-utxo-analytics').then(mod => ({
    default: mod.VerusIDUTXOAnalytics,
  }))
);
const VerusIDAchievements = lazy(() =>
  import('../verusid-achievements').then(mod => ({
    default: mod.VerusIDAchievements,
  }))
);
const VerusIDIdentityDetails = lazy(() =>
  import('../verusid-identity-details').then(mod => ({
    default: mod.VerusIDIdentityDetails,
  }))
);

/**
 * VerusID Details View Component
 * Extracted from verusid-explorer.tsx for better code splitting
 */

export interface VerusIDDetailsViewProps {
  identityName: string;
  verusID: any; // VerusID data
  balance: any; // Balance data
  onClose?: () => void;
}

function TabSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 bg-white/10 rounded w-1/3" />
      <div className="h-32 bg-white/5 rounded-xl" />
      <div className="h-48 bg-white/5 rounded-xl" />
    </div>
  );
}

export function VerusIDDetailsView({
  identityName,
  verusID,
  balance,
  onClose,
}: VerusIDDetailsViewProps) {
  const tCommon = useTranslations('common');
  const t = useTranslations('dashboard');
  const tVerusId = useTranslations('verusid');
  const tStaking = useTranslations('staking');
  const [activeTab, setActiveTab] = useState<
    'overview' | 'staking' | 'utxo' | 'achievements' | 'identity'
  >('overview');
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(
    new Set(['overview'])
  );

  // Mark tab as loaded when viewed
  useEffect(() => {
    setLoadedTabs(prev => new Set(Array.from(prev).concat(activeTab)));
  }, [activeTab]);

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <Card variant="elevated" padding="lg">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <Heading as="h1" className="mb-2">
                {verusID?.name || identityName}
              </Heading>
              {verusID?.identityaddress && (
                <TruncatedAddress
                  address={verusID.identityaddress}
                  maxLength={25}
                />
              )}
            </div>
          </div>
        </CardHeader>

        {/* Quick Stats */}
        {balance && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="p-4 bg-white/5 rounded-lg">
              <Text size="xs" muted className="mb-1">
                Total Balance
              </Text>
              <Text size="lg" weight="bold">
                {(balance.totalBalance / 100000000).toLocaleString()} VRSC
              </Text>
            </div>
            <div className="p-4 bg-white/5 rounded-lg">
              <Text size="xs" muted className="mb-1">
                Addresses
              </Text>
              <Text size="lg" weight="bold">
                {balance.primaryAddresses?.length || 0}
              </Text>
            </div>
            <div className="p-4 bg-white/5 rounded-lg">
              <Text size="xs" muted className="mb-1">
                Total Received
              </Text>
              <Text size="lg" weight="bold">
                {(balance.totalReceived / 100000000).toLocaleString()} VRSC
              </Text>
            </div>
            <div className="p-4 bg-white/5 rounded-lg">
              <Text size="xs" muted className="mb-1">
                Total Sent
              </Text>
              <Text size="lg" weight="bold">
                {(balance.totalSent / 100000000).toLocaleString()} VRSC
              </Text>
            </div>
          </div>
        )}
      </Card>

      {/* Tabs for Different Views */}
      <div className="space-y-6">
        {/* Tab Navigation */}
        <Tabs
          tabs={[
            {
              id: 'overview',
              label: t("overview"),
              icon: <Info className="h-4 w-4" />,
            },
            {
              id: 'staking',
              label: 'Staking',
              icon: <TrendUp className="h-4 w-4" />,
            },
            {
              id: 'utxo',
              label: 'UTXOs',
              icon: <Database className="h-4 w-4" />,
            },
            {
              id: 'achievements',
              label: 'Achievements',
              icon: <Medal className="h-4 w-4" />,
            },
            {
              id: 'identity',
              label: tVerusId("identity"),
              icon: <User className="h-4 w-4" />,
            },
          ]}
          activeTab={activeTab}
          onTabChange={tab => setActiveTab(tab as any)}
        />

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div role="tabpanel">
            <Card>
              <CardContent>
                <Heading as="h3" className="mb-4">
                  Identity Overview
                </Heading>
                <div className="space-y-3">
                  {verusID && (
                    <>
                      <div>
                        <Text size="sm" muted>
                          Name
                        </Text>
                        <Text>{verusID.name}</Text>
                      </div>
                      <div>
                        <Text size="sm" muted>
                          I-Address
                        </Text>
                        <TruncatedAddress address={verusID.identityaddress} />
                      </div>
                      <div>
                        <Text size="sm" muted>
                          Primary Addresses
                        </Text>
                        <Text>{verusID.primaryaddresses?.length || 0}</Text>
                      </div>
                      <div>
                        <Text size="sm" muted>
                          Status
                        </Text>
                        <Text>{verusID.status || 'Active'}</Text>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'staking' && (
          <div role="tabpanel">
            <Suspense fallback={<TabSkeleton />}>
              {loadedTabs.has('staking') && verusID && (
                <VerusIDStakingDashboard iaddr={verusID.identityaddress} />
              )}
            </Suspense>
          </div>
        )}

        {activeTab === 'utxo' && (
          <div role="tabpanel" className="w-full overflow-x-hidden">
            <Suspense fallback={<TabSkeleton />}>
              {loadedTabs.has('utxo') && verusID && (
                <VerusIDUTXOAnalytics iaddr={verusID.identityaddress} />
              )}
            </Suspense>
          </div>
        )}

        {activeTab === 'achievements' && (
          <div role="tabpanel">
            <Suspense fallback={<TabSkeleton />}>
              {loadedTabs.has('achievements') && verusID && (
                <VerusIDAchievements iaddr={verusID.identityaddress} />
              )}
            </Suspense>
          </div>
        )}

        {activeTab === 'identity' && (
          <div role="tabpanel">
            <Suspense fallback={<TabSkeleton />}>
              {loadedTabs.has('identity') && verusID && (
                <VerusIDIdentityDetails
                  verusID={verusID}
                  balance={balance}
                  resolvedAuthorities={{}}
                />
              )}
            </Suspense>
          </div>
        )}
      </div>
    </div>
  );
}
