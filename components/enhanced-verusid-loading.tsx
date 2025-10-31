'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  CircleNotch,
  Database,
  Lightning,
  CheckCircle,
  Clock,
  MagnifyingGlass,
  ChartBar,
  Trophy,
  Target,
  ArrowClockwise,
  WarningCircle,
} from '@phosphor-icons/react';

interface EnhancedLoadingProps {
  verusID: string;
  iaddr: string;
  onComplete?: () => void;
  onError?: (error: string) => void;
  className?: string;
}

type ScanStage =
  | 'initial'
  | 'blockchain_scan'
  | 'data_processing'
  | 'stats_calculation'
  | 'complete';
type ScanStatus =
  | 'not_started'
  | 'scanning'
  | 'processing'
  | 'complete'
  | 'error';

interface ScanProgress {
  status: ScanStatus;
  stage: ScanStage;
  progress: number;
  message: string;
  stakesFound: number;
  estimatedTimeRemaining: number | null;
  timeSinceLastScan: number | null;
}

export function EnhancedVerusIDLoading({
  verusID,
  iaddr,
  onComplete,
  onError,
  className = '',
}: EnhancedLoadingProps) {
  const t = useTranslations('dashboard');
  const [scanProgress, setScanProgress] = useState<ScanProgress>({
    status: 'not_started',
    stage: 'initial',
    progress: 0,
    message: 'Initializing...',
    stakesFound: 0,
    estimatedTimeRemaining: null,
    timeSinceLastScan: null,
  });
  const [isPolling, setIsPolling] = useState(true);
  const [hasTriggeredComplete, setHasTriggeredComplete] = useState(false);

  // Format time remaining
  const formatTimeRemaining = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  // Poll for progress
  const fetchProgress = useCallback(async () => {
    try {
      const response = await fetch(`/api/verusid/${iaddr}/scan-progress`);
      const data = await response.json();

      if (data.success && data.data) {
        setScanProgress(data.data);

        // Check if complete
        if (data.data.status === 'complete' && !hasTriggeredComplete) {
          setHasTriggeredComplete(true);
          setIsPolling(false);

          // Wait a moment to show completion message, then call onComplete
          setTimeout(() => {
            if (onComplete) {
              onComplete();
            }
          }, 2000);
        }
      }
    } catch (error) {
      // Silent error handling for scan progress
    }
  }, [iaddr, hasTriggeredComplete, onComplete]);

  // Start polling on mount
  useEffect(() => {
    if (!isPolling) return;

    fetchProgress(); // Initial fetch

    const interval = setInterval(fetchProgress, 3000); // Poll every 3 seconds

    return () => clearInterval(interval);
  }, [isPolling, fetchProgress]);

  // Get stage info for visual representation
  const getStageInfo = () => {
    switch (scanProgress.stage) {
      case 'blockchain_scan':
        return {
          icon: MagnifyingGlass,
          title: 'Scanning Blockchain',
          description: 'Searching for staking activity across all blocks...',
          color: 'text-blue-400',
          bgColor: 'bg-blue-500/20',
          borderColor: 'border-blue-500/30',
          glowColor: 'shadow-blue-500/50',
        };
      case 'data_processing':
        return {
          icon: Database,
          title: 'Processing Data',
          description: 'Organizing and validating staking records...',
          color: 'text-purple-400',
          bgColor: 'bg-purple-500/20',
          borderColor: 'border-purple-500/30',
          glowColor: 'shadow-purple-500/50',
        };
      case 'stats_calculation':
        return {
          icon: ChartBar,
          title: 'Calculating Statistics',
          description: 'Computing performance metrics and achievements...',
          color: 'text-green-400',
          bgColor: 'bg-green-500/20',
          borderColor: 'border-green-500/30',
          glowColor: 'shadow-green-500/50',
        };
      case 'complete':
        return {
          icon: CheckCircle,
          title: 'Complete!',
          description: 'Your staking data is ready to view',
          color: 'text-green-400',
          bgColor: 'bg-green-500/20',
          borderColor: 'border-green-500/30',
          glowColor: 'shadow-green-500/50',
        };
      default:
        return {
          icon: Lightning,
          title: 'Starting Scan',
          description: 'Preparing to index your VerusID...',
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-500/20',
          borderColor: 'border-yellow-500/30',
          glowColor: 'shadow-yellow-500/50',
        };
    }
  };

  const stageInfo = getStageInfo();
  const Icon = stageInfo.icon;

  return (
    <div
      className={`bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-8 border ${stageInfo.borderColor} shadow-2xl ${stageInfo.glowColor} ${className}`}
    >
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-4">
          <div
            className={`relative p-4 rounded-2xl ${stageInfo.bgColor} ${stageInfo.borderColor} border-2`}
          >
            <Icon
              className={`h-12 w-12 ${stageInfo.color} ${scanProgress.stage !== 'complete' ? 'animate-pulse' : ''}`}
            />
            {scanProgress.stage !== 'complete' && (
              <div className="absolute inset-0 rounded-2xl bg-white/10 animate-ping" />
            )}
          </div>
        </div>

        <h2 className={`text-3xl font-bold ${stageInfo.color} mb-2`}>
          {stageInfo.title}
        </h2>

        <p className="text-white/80 text-lg mb-1">{verusID}</p>
        <p className="text-white/60">{stageInfo.description}</p>
      </div>

      {/* Progress Bar */}
      {scanProgress.stage !== 'complete' && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/80 text-sm font-medium">
              {scanProgress.message}
            </span>
            <span className={`text-sm font-bold ${stageInfo.color}`}>
              {scanProgress.progress}%
            </span>
          </div>

          <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full ${stageInfo.bgColor} ${stageInfo.borderColor} border-r-2 transition-all duration-500 ease-out relative`}
              style={{ width: `${scanProgress.progress}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {/* Stage */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
          <div className="flex items-center space-x-2 mb-2">
            <Target className="h-4 w-4 text-blue-400" />
            <span className="text-white/60 text-xs font-medium uppercase tracking-wide">
              Stage
            </span>
          </div>
          <div className="text-white text-lg font-bold">
            {scanProgress.stage === 'blockchain_scan' && '1/3'}
            {scanProgress.stage === 'data_processing' && '2/3'}
            {scanProgress.stage === 'stats_calculation' && '3/3'}
            {scanProgress.stage === 'complete' && 'Done'}
            {scanProgress.stage === 'initial' && 'Ready'}
          </div>
        </div>

        {/* Stakes Found */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
          <div className="flex items-center space-x-2 mb-2">
            <Trophy className="h-4 w-4 text-yellow-400" />
            <span className="text-white/60 text-xs font-medium uppercase tracking-wide">
              Stakes Found
            </span>
          </div>
          <div className="text-white text-lg font-bold">
            {scanProgress.stakesFound > 0 ? (
              <span className="text-green-400">{scanProgress.stakesFound}</span>
            ) : (
              <span className="text-white/40">Scanning...</span>
            )}
          </div>
        </div>

        {/* Time Remaining */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
          <div className="flex items-center space-x-2 mb-2">
            <Clock className="h-4 w-4 text-purple-400" />
            <span className="text-white/60 text-xs font-medium uppercase tracking-wide">
              ETA
            </span>
          </div>
          <div className="text-white text-lg font-bold">
            {scanProgress.estimatedTimeRemaining ? (
              formatTimeRemaining(scanProgress.estimatedTimeRemaining)
            ) : scanProgress.stage === 'complete' ? (
              <span className="text-green-400">Complete</span>
            ) : (
              '~1-5min'
            )}
          </div>
        </div>

        {/* Status */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
          <div className="flex items-center space-x-2 mb-2">
            <Lightning className="h-4 w-4 text-yellow-400" />
            <span className="text-white/60 text-xs font-medium uppercase tracking-wide">
              Status
            </span>
          </div>
          <div className="text-white text-lg font-bold capitalize">
            {scanProgress.status === 'scanning' && (
              <span className="flex items-center space-x-1">
                <CircleNotch className="h-4 w-4 animate-spin" />
                <span>Active</span>
              </span>
            )}
            {scanProgress.status === 'complete' && (
              <span className="text-green-400">Ready</span>
            )}
            {scanProgress.status === 'not_started' && (
              <span className="text-yellow-400">Starting</span>
            )}
          </div>
        </div>
      </div>

      {/* Stage Progress Indicators */}
      <div className="flex items-center justify-between mb-6">
        {['blockchain_scan', 'data_processing', 'stats_calculation'].map(
          (stage, index) => {
            const isActive = scanProgress.stage === stage;
            const isComplete =
              [
                'blockchain_scan',
                'data_processing',
                'stats_calculation',
              ].indexOf(scanProgress.stage) > index ||
              scanProgress.stage === 'complete';

            return (
              <div key={stage} className="flex items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${
                    isComplete
                      ? 'bg-green-500/20 border-green-500 text-green-400'
                      : isActive
                        ? `${stageInfo.bgColor} ${stageInfo.borderColor} ${stageInfo.color}`
                        : 'bg-white/5 border-white/20 text-white/40'
                  }`}
                >
                  {isComplete ? (
                    <CheckCircle className="h-5 w-5" weight="fill" />
                  ) : (
                    <span className="text-sm font-bold">{index + 1}</span>
                  )}
                </div>
                {index < 2 && (
                  <div
                    className={`flex-1 h-1 mx-2 rounded-full ${isComplete ? 'bg-green-500/50' : 'bg-white/10'}`}
                  />
                )}
              </div>
            );
          }
        )}
      </div>

      {/* Helpful Tips */}
      <div className="bg-blue-500/10 backdrop-blur-sm rounded-xl p-4 border border-blue-500/20">
        <div className="flex items-start space-x-3">
          <Lightning className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-blue-300 font-semibold mb-1">
              {scanProgress.stage === 'complete'
                ? 'Ready to View!'
                : "What's Happening?"}
            </h4>
            <p className="text-blue-200/80 text-sm">
              {scanProgress.stage === 'complete' ? (
                <>
                  Your VerusID data has been fully indexed with{' '}
                  <strong>{scanProgress.stakesFound}</strong>{' '}
                  {scanProgress.stakesFound === 1 ? 'stake' : 'stakes'} found.
                  Redirecting you to your dashboard...
                </>
              ) : (
                <>
                  We&apos;re scanning the entire Verus blockchain to find all
                  your staking activity. This is a one-time process - future
                  visits will be instant!
                  {scanProgress.stakesFound > 0 && (
                    <>
                      {' '}
                      So far we&apos;ve found{' '}
                      <strong>{scanProgress.stakesFound}</strong>{' '}
                      {scanProgress.stakesFound === 1 ? 'stake' : 'stakes'}!
                    </>
                  )}
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Completion Message */}
      {scanProgress.stage === 'complete' && (
        <div className="mt-6 text-center">
          <div className="inline-flex items-center space-x-2 text-green-400">
            <CheckCircle className="h-5 w-5 animate-bounce" weight="fill" />
            <span className="font-semibold">Loading your dashboard...</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Add shimmer animation to global CSS or tailwind config
// @keyframes shimmer {
//   0% { transform: translateX(-100%); }
//   100% { transform: translateX(100%); }
// }
