'use client';

import { use, useEffect } from 'react';
import { redirect } from 'next/navigation';
import { useTranslations } from 'next-intl';

/**
 * Address Detail Page - Unified with VerusID
 *
 * This route redirects /address/[address] to /verusid/[address]
 * to unify all I-address/VerusID pages under one component.
 *
 * Both routes show the same staking dashboard with:
 * - Recent Stakes (from database)
 * - Staking Activity Calendar
 * - Performance metrics
 * - Achievements
 */
export default function AddressDetailPage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = use(params);
  const tAddress = useTranslations('address');

  useEffect(() => {
    // Redirect to unified VerusID page
    window.location.href = `/verusid/${address}`;
  }, [address]);

  // Server-side redirect for better SEO
  if (address) {
    redirect(`/verusid/${address}`);
  }

  return (
    <div className="min-h-screen theme-bg-primary flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block w-12 h-12 border-3 border-verus-blue/20 border-t-verus-blue rounded-full animate-spin mb-4" />
        <p className="text-slate-600 dark:text-slate-300 text-sm">
          {tAddress('redirectingToVerusID')}
        </p>
      </div>
    </div>
  );
}

