'use client';

interface SkeletonLoaderProps {
  variant?: 'text' | 'card' | 'stat' | 'chart' | 'circle';
  width?: string;
  height?: string;
  className?: string;
  count?: number;
}

export function SkeletonLoader({
  variant = 'text',
  width,
  height,
  className = '',
  count = 1,
}: SkeletonLoaderProps) {
  const baseClasses =
    'animate-pulse bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 bg-[length:200%_100%] rounded';

  const variants = {
    text: `h-4 ${width || 'w-full'}`,
    card: `${height || 'h-32'} ${width || 'w-full'}`,
    stat: `${height || 'h-24'} ${width || 'w-full'} rounded-xl`,
    chart: `${height || 'h-64'} ${width || 'w-full'} rounded-lg`,
    circle: `${width || 'w-16'} ${height || 'h-16'} rounded-full`,
  };

  const variantClasses = variants[variant];

  if (count === 1) {
    return <div className={`${baseClasses} ${variantClasses} ${className}`} />;
  }

  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={`${baseClasses} ${variantClasses} ${className}`}
        />
      ))}
    </div>
  );
}

export function HeroStatsSkeleton() {
  return (
    <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 backdrop-blur-sm rounded-2xl p-6 border border-verus-teal/20 shadow-xl">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="bg-white/5 border border-white/10 rounded-xl p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <SkeletonLoader variant="circle" width="w-10" height="h-10" />
              <SkeletonLoader variant="text" width="w-16" />
            </div>
            <SkeletonLoader
              variant="text"
              width="w-24"
              height="h-8"
              className="mb-2"
            />
            <SkeletonLoader variant="text" width="w-32" height="h-4" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6">
      <div className="flex items-center justify-between mb-6">
        <SkeletonLoader variant="text" width="w-48" height="h-6" />
        <SkeletonLoader variant="text" width="w-24" height="h-8" />
      </div>
      <SkeletonLoader variant="chart" height="h-96" />
    </div>
  );
}

export function UTXOHealthSkeleton() {
  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center justify-between">
          <SkeletonLoader variant="text" width="w-40" height="h-6" />
          <SkeletonLoader variant="text" width="w-24" />
        </div>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index}>
              <SkeletonLoader variant="text" width="w-32" className="mb-4" />
              <div className="space-y-3">
                <SkeletonLoader variant="stat" height="h-20" />
                <SkeletonLoader variant="stat" height="h-20" />
                <SkeletonLoader variant="stat" height="h-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-verus-blue/20 to-verus-green/20 backdrop-blur-sm rounded-2xl p-4 border border-verus-blue/30 text-center">
        <SkeletonLoader
          variant="text"
          width="w-64"
          height="h-8"
          className="mx-auto mb-2"
        />
        <SkeletonLoader
          variant="text"
          width="w-48"
          height="h-4"
          className="mx-auto"
        />
      </div>

      {/* Hero Stats */}
      <HeroStatsSkeleton />

      {/* Charts */}
      <ChartSkeleton />

      {/* UTXO Health */}
      <UTXOHealthSkeleton />
    </div>
  );
}
