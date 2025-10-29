/**
 * @deprecated This file has been consolidated into components/animations/skeleton-loader.tsx
 * Please import from '@/components/animations/skeleton-loader' instead
 *
 * This file is kept for backward compatibility only.
 */

'use client';

// Re-export everything from the consolidated location
export * from './animations/skeleton-loader';

// Legacy exports for backward compatibility
import {
  SkeletonLoader,
  HeroStatsSkeleton,
  ChartSkeleton,
  UTXOHealthSkeleton,
  DashboardSkeleton,
} from './animations/skeleton-loader';

// Map old names to new names for backward compatibility
export const Skeleton = SkeletonLoader;
export const StatsCardSkeleton = () => (
  <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
    <SkeletonLoader variant="stat" className="h-24" />
  </div>
);

export function ActivityCardSkeleton() {
  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
      <div className="flex items-center justify-between mb-4">
        <Skeleton variant="circular" width={48} height={48} />
        <div className="text-right space-y-2 flex-1 ml-4">
          <Skeleton className="h-8 w-24 ml-auto" />
          <Skeleton className="h-4 w-32 ml-auto" />
        </div>
      </div>
    </div>
  );
}

export function ActivityCardSkeleton() {
  return (
    <div className="bg-white/5 rounded-lg p-4 border border-white/10">
      <div className="flex items-start gap-3">
        <Skeleton variant="rounded" width={40} height={40} />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    </div>
  );
}

export function CarouselCardSkeleton() {
  return (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
      <div className="flex items-start gap-4 mb-6">
        <Skeleton variant="circular" width={64} height={64} />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
      </div>
      <Skeleton className="h-12 rounded-xl" />
    </div>
  );
}

export function TrendingItemSkeleton() {
  return (
    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
      <div className="flex items-start gap-4">
        <Skeleton variant="circular" width={32} height={32} />
        <Skeleton variant="rounded" width={40} height={40} />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-1 w-full mt-3" />
        </div>
      </div>
    </div>
  );
}

export function HeroSkeleton() {
  return (
    <div className="relative overflow-hidden py-20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12 space-y-4">
          <Skeleton className="h-6 w-48 mx-auto rounded-full" />
          <Skeleton className="h-16 w-96 mx-auto" />
          <Skeleton className="h-8 w-[600px] mx-auto" />
        </div>
        <div className="grid grid-cols-4 gap-4 mb-12">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
