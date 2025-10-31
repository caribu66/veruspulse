'use client';

import React from 'react';
import { VerusExplorer } from '@/components/verus-explorer';
import dynamic from 'next/dynamic';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Dynamic import to avoid SSR issues with QRCode library
const DonationBanner = dynamic(
  () =>
    import('@/components/donation-banner').then(mod => ({
      default: mod.DonationBanner,
    })),
  { ssr: false }
);

/**
 * VerusPulse - The Internet of Value
 * Comprehensive blockchain data and network statistics
 *
 * Note: Removed Suspense wrapper to eliminate multiple cascading loading states.
 * VerusExplorer now handles its own loading state with proper caching.
 */
export default function Home() {
  return (
    <>
      <VerusExplorer />
    </>
  );
}
// Test comment
// Full deployment test
// Full deployment test
// Another test
