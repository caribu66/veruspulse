/**
 * Simplified loading screen - only shows for route transitions
 * Most loading is now handled by component-level skeletons with proper caching
 */
export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="text-center">
        {/* Minimal spinner */}
        <div className="inline-block w-12 h-12 border-3 border-verus-blue/20 border-t-verus-blue rounded-full animate-spin mb-4" />
        <p className="text-slate-600 dark:text-slate-300 text-sm">Loading...</p>
      </div>
    </div>
  );
}
