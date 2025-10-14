import React, { Suspense } from 'react';
import { VerusExplorer } from '@/components/verus-explorer';
import { EnhancedLoadingScreen } from '@/components/enhanced-loading-screen';

/**
 * Verus Blockchain Explorer - The Internet of Value
 * Comprehensive blockchain data and network statistics
 */
export default function Home() {
  return (
    <Suspense fallback={<EnhancedLoadingScreen />}>
      <VerusExplorer />
    </Suspense>
  );
}
