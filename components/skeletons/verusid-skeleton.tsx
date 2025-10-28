/**
 * Skeleton Loading Components for VerusID Pages
 * Provides visual feedback while content is loading
 */

export function VerusIDSkeleton() {
  return (
    <div className="animate-pulse space-y-6 p-4">
      {/* Header skeleton */}
      <div className="flex items-center space-x-4">
        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-700/50 rounded-full" />
        <div className="flex-1 space-y-3">
          <div className="h-6 bg-slate-700/50 rounded w-2/3" />
          <div className="h-4 bg-slate-700/30 rounded w-1/2" />
        </div>
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            className="bg-slate-800/30 rounded-xl p-4 space-y-2 border border-slate-700/30"
          >
            <div className="h-3 bg-slate-700/50 rounded w-1/2" />
            <div className="h-7 bg-slate-700/50 rounded w-3/4" />
            <div className="h-3 bg-slate-700/30 rounded w-2/3" />
          </div>
        ))}
      </div>

      {/* Chart skeleton */}
      <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700/30">
        <div className="h-4 bg-slate-700/50 rounded w-1/4 mb-4" />
        <div className="h-64 bg-slate-700/30 rounded" />
      </div>
    </div>
  );
}

export function VerusIDCardSkeleton() {
  return (
    <div className="animate-pulse bg-slate-800/30 rounded-xl p-4 border border-slate-700/30 space-y-3">
      {/* Title */}
      <div className="h-5 bg-slate-700/50 rounded w-3/4" />

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <div className="h-3 bg-slate-700/30 rounded w-1/2" />
          <div className="h-5 bg-slate-700/50 rounded w-3/4" />
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-slate-700/30 rounded w-1/2" />
          <div className="h-5 bg-slate-700/50 rounded w-3/4" />
        </div>
      </div>

      {/* Action button */}
      <div className="h-10 bg-slate-700/30 rounded-lg w-full" />
    </div>
  );
}

export function VerusIDListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse flex items-center space-x-4 bg-slate-800/30 rounded-lg p-4 border border-slate-700/30"
        >
          <div className="w-12 h-12 bg-slate-700/50 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-slate-700/50 rounded w-3/4" />
            <div className="h-3 bg-slate-700/30 rounded w-1/2" />
          </div>
          <div className="w-20 h-8 bg-slate-700/30 rounded" />
        </div>
      ))}
    </div>
  );
}

export function StakingDashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-6 p-4">
      {/* Header stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            className="bg-slate-800/30 rounded-xl p-6 border border-slate-700/30 space-y-3"
          >
            <div className="h-4 bg-slate-700/30 rounded w-1/2" />
            <div className="h-8 bg-slate-700/50 rounded w-3/4" />
          </div>
        ))}
      </div>

      {/* Main chart */}
      <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700/30">
        <div className="flex justify-between items-center mb-6">
          <div className="h-6 bg-slate-700/50 rounded w-1/4" />
          <div className="flex space-x-2">
            <div className="h-8 w-20 bg-slate-700/30 rounded" />
            <div className="h-8 w-20 bg-slate-700/30 rounded" />
          </div>
        </div>
        <div className="h-80 bg-slate-700/30 rounded" />
      </div>

      {/* Recent activity */}
      <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700/30">
        <div className="h-5 bg-slate-700/50 rounded w-1/3 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center justify-between py-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-slate-700/50 rounded-full" />
                <div className="space-y-2">
                  <div className="h-4 bg-slate-700/50 rounded w-32" />
                  <div className="h-3 bg-slate-700/30 rounded w-24" />
                </div>
              </div>
              <div className="h-4 bg-slate-700/50 rounded w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-3">
      {/* Table header */}
      <div className="hidden md:grid grid-cols-4 gap-4 px-4 py-3 bg-slate-800/30 rounded-lg border border-slate-700/30">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-4 bg-slate-700/50 rounded w-3/4" />
        ))}
      </div>

      {/* Table rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="grid grid-cols-1 md:grid-cols-4 gap-4 px-4 py-4 bg-slate-800/30 rounded-lg border border-slate-700/30"
        >
          <div className="h-4 bg-slate-700/50 rounded w-5/6" />
          <div className="h-4 bg-slate-700/30 rounded w-4/6" />
          <div className="h-4 bg-slate-700/30 rounded w-3/6" />
          <div className="h-4 bg-slate-700/30 rounded w-2/6" />
        </div>
      ))}
    </div>
  );
}
