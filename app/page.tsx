'use client';

import React from 'react';
import { VerusExplorer } from '@/components/verus-explorer';

// Note: removed DonationBanner to avoid SSR issues

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
