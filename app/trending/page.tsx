import React from 'react';
import { TrendingSection } from '@/components/trending-section';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Trending | VerusPulse',
  description:
    "Discover what's trending on the Verus blockchain - popular VerusIDs, active blocks, and high-activity addresses.",
};

/**
 * Trending Page
 * Dedicated page for exploring trending content on Verus blockchain
 */
export default function TrendingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <div className="bg-slate-900/80 backdrop-blur-lg border-b border-slate-700 sticky top-0 z-40 safe-area-inset-top">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">
                🔥 Trending
              </h1>
              <p className="text-sm sm:text-base text-slate-300 mt-1">
                What&apos;s hot on Verus blockchain
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-24 sm:pb-8">
        <TrendingSection autoRefresh={true} refreshInterval={60000} />
      </main>
    </div>
  );
}
