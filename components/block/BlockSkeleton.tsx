'use client';

import { useTranslations } from 'next-intl';
export function BlockSkeleton() {
  const tBlocks = useTranslations('blocks');

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 text-white">
      <div className="bg-gray-900 border border-gray-600 rounded-xl w-full mx-auto max-w-4xl p-6 shadow-2xl">
        {/* Header Skeleton */}
        <div className="flex flex-col space-y-4 mb-6">
          <div className="flex justify-between items-center">
            <div className="h-8 w-48 bg-gray-700 rounded animate-pulse" />
            <div className="h-8 w-32 bg-gray-700 rounded animate-pulse" />
          </div>

          <div className="h-6 w-96 bg-gray-700 rounded animate-pulse" />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="bg-gray-700/50 rounded-lg p-3 animate-pulse"
              >
                <div className="h-4 w-20 bg-gray-600 rounded mb-2" />
                <div className="h-6 w-16 bg-gray-600 rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* Main Content Skeleton */}
        <div className="space-y-4">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="grid grid-cols-1 md:grid-cols-4 gap-4 border-b border-white/10 pb-3 pt-1"
            >
              <div className="h-4 w-24 bg-gray-700 rounded animate-pulse" />
              <div className="h-4 w-48 bg-gray-700 rounded animate-pulse md:col-span-3" />
            </div>
          ))}
        </div>

        {/* Transactions Skeleton */}
        <div className="mt-8">
          <div className="h-6 w-32 bg-gray-700 rounded animate-pulse mb-4" />
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="bg-white/5 rounded-lg p-4 border border-white/10 animate-pulse"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="h-4 w-16 bg-gray-600 rounded mb-2" />
                    <div className="h-4 w-96 bg-gray-600 rounded" />
                  </div>
                  <div className="h-6 w-24 bg-gray-600 rounded" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <div className="h-4 w-20 bg-gray-600 rounded mb-2" />
                    <div className="bg-gray-700/30 p-3 rounded-md space-y-2">
                      <div className="h-3 w-32 bg-gray-600 rounded" />
                      <div className="h-3 w-28 bg-gray-600 rounded" />
                    </div>
                  </div>
                  <div>
                    <div className="h-4 w-20 bg-gray-600 rounded mb-2" />
                    <div className="bg-gray-700/30 p-3 rounded-md space-y-2">
                      <div className="h-3 w-36 bg-gray-600 rounded" />
                      <div className="h-3 w-24 bg-gray-600 rounded" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
