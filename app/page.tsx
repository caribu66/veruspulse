import React, { Suspense } from 'react';
import { VerusExplorer } from '@/components/verus-explorer';
import { EnhancedLoadingScreen } from '@/components/enhanced-loading-screen';
import { DonationBanner } from '@/components/donation-banner';

/**
 * VerusPulse - The Internet of Value
 * Comprehensive blockchain data and network statistics
 */
export default function Home() {
  return (
    <>
      <Suspense fallback={<EnhancedLoadingScreen />}>
        <VerusExplorer />
      </Suspense>
      <DonationBanner />
    </>
  );
}
// Test comment
