'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Pulse,
  CheckCircle,
  WarningCircle,
  Clock,
  Database,
  CircleNotch,
  ArrowsClockwise,
  Lightning,
  TrendUp,
  UsersThree,
  Timer,
  ChartBar,
} from '@phosphor-icons/react';
import { AnimatedCounter } from './animations/counter-animation';

interface SyncProgress {
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
  total: number;
  processed: number;
  failed: number;
  current?: string;
  percentComplete: number;
  estimatedTimeRemaining?: string;
  startTime?: Date;
  errors: Array<{ address: string; error: string }>;
}

interface VerusIDLoadingWithSyncProps {
  verusID: string;
  iaddr: string;
  onSyncComplete?: () => void;
  onSyncError?: (error: string) => void;
  className?: string;
}

export function VerusIDLoadingWithSync({
  verusID,
  iaddr,
  onSyncComplete,
  onSyncError,
  className = '',
}: VerusIDLoadingWithSyncProps) {
  const tCommon = useTranslations('common');
  const t = useTranslations('dashboard');
  const tVerusId = useTranslations('verusid');
  const tStaking = useTranslations('staking');
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [isAutoSyncing, setIsAutoSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [loadingStage, setLoadingStage] = useState<
    'checking' | 'syncing' | 'processing' | 'complete'
  >('checking');
  const [stageProgress, setStageProgress] = useState(0);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] =
    useState<string>('');

  // Auto-trigger sync when component mounts
  useEffect(() => {
    const triggerAutoSync = async () => {
      try {
        setIsAutoSyncing(true);
        setLoadingStage('syncing');
        setSyncError(null);

        // Start sync for this specific VerusID using the dedicated endpoint
        const response = await fetch(
          `/api/verusid/${encodeURIComponent(iaddr)}/sync?batch_size=1&delay=2000`,
          {
            method: 'POST',
          }
        );

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Failed to start sync');
        }

        // Start polling for progress
        startProgressPolling();
      } catch (error: any) {
        setSyncError(error.message || 'Failed to start sync');
        setIsAutoSyncing(false);
        setLoadingStage('checking');
        onSyncError?.(error.message || 'Failed to start sync');
      }
    };

    // Small delay to show the checking stage
    const timer = setTimeout(() => {
      triggerAutoSync();
    }, 1000);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verusID, iaddr, onSyncError]);

  const startProgressPolling = useCallback(() => {
    const pollInterval = setInterval(async () => {
      try {
        // Poll the specific VerusID sync status
        const response = await fetch(
          `/api/verusid/${encodeURIComponent(iaddr)}/sync`
        );
        const data = await response.json();

        if (data.success && data.progress) {
          const progress = data.progress;
          setSyncProgress(progress);

          // Update stage progress based on sync progress
          if (progress.status === 'running') {
            setStageProgress(progress.percentComplete);
            setLoadingStage('syncing');
          } else if (progress.status === 'completed') {
            setStageProgress(100);
            setLoadingStage('complete');
            setIsAutoSyncing(false);
            onSyncComplete?.();
            clearInterval(pollInterval);
          } else if (progress.status === 'error') {
            setSyncError('Sync failed');
            setIsAutoSyncing(false);
            setLoadingStage('checking');
            onSyncError?.('Sync failed');
            clearInterval(pollInterval);
          }
        }
      } catch (error) {
        // Silent error handling for sync progress polling
      }
    }, 2000); // Poll every 2 seconds

    // Cleanup after 5 minutes to prevent infinite polling
    const timeout = setTimeout(() => {
      clearInterval(pollInterval);
      if (isAutoSyncing) {
        setSyncError('Sync timeout - please try again');
        setIsAutoSyncing(false);
        setLoadingStage('checking');
      }
    }, 300000); // 5 minutes timeout

    return () => {
      clearInterval(pollInterval);
      clearTimeout(timeout);
    };
  }, [iaddr, isAutoSyncing, onSyncComplete, onSyncError]);

  const getStageInfo = () => {
    switch (loadingStage) {
      case 'checking':
        return {
          icon: Database,
          title: 'Checking VerusID Data',
          description: 'Verifying if staking statistics are available...',
          color: 'text-blue-400',
          bgColor: 'bg-blue-500/20',
          borderColor: 'border-blue-500/30',
        };
      case 'syncing':
        return {
          icon: Pulse,
          title: 'Syncing VerusID Data',
          description:
            'Gathering comprehensive staking history and statistics...',
          color: 'text-verus-blue',
          bgColor: 'bg-verus-blue/20',
          borderColor: 'border-verus-blue/30',
        };
      case 'processing':
        return {
          icon: ChartBar,
          title: 'Processing Statistics',
          description: 'Calculating performance metrics and UTXO health...',
          color: 'text-green-400',
          bgColor: 'bg-green-500/20',
          borderColor: 'border-green-500/30',
        };
      case 'complete':
        return {
          icon: CheckCircle,
          title: 'Sync Complete',
          description: 'VerusID data is now ready for analysis!',
          color: 'text-green-400',
          bgColor: 'bg-green-500/20',
          borderColor: 'border-green-500/30',
        };
      default:
        return {
          icon: Clock,
          title: tCommon("loading"),
          description: 'Please wait...',
          color: 'text-gray-400',
          bgColor: 'bg-gray-500/20',
          borderColor: 'border-gray-500/30',
        };
    }
  };

  const stageInfo = getStageInfo();
  const Icon = stageInfo.icon;

  const formatTimeRemaining = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getEstimatedTime = () => {
    if (!syncProgress || syncProgress.percentComplete === 0) return '';

    const elapsed = syncProgress.startTime
      ? Date.now() - new Date(syncProgress.startTime).getTime()
      : 0;
    const rate = elapsed / (syncProgress.percentComplete / 100);
    const remaining = rate - elapsed;

    if (remaining > 0) {
      return formatTimeRemaining(Math.ceil(remaining / 1000));
    }
    return '';
  };

  return (
    <div
      className={`bg-gradient-to-r from-verus-blue/10 to-verus-green/10 backdrop-blur-sm rounded-2xl p-8 border border-blue-500/20 ${className}`}
    >
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center space-x-3 mb-4">
          <div
            className={`relative p-3 rounded-xl ${stageInfo.bgColor} ${stageInfo.borderColor} border`}
          >
            <Icon
              className={`h-8 w-8 ${stageInfo.color} ${loadingStage === 'syncing' ? 'animate-pulse' : ''}`}
            />
            {loadingStage === 'syncing' && (
              <div
                className={`absolute inset-0 rounded-xl ${stageInfo.bgColor} animate-ping`}
              />
            )}
          </div>
          <div>
            <h3 className={`text-2xl font-bold ${stageInfo.color}`}>
              {stageInfo.title}
            </h3>
            <p className="text-blue-200 text-sm">{verusID}</p>
          </div>
        </div>
        <p className="text-blue-200 text-lg">{stageInfo.description}</p>
      </div>

      {/* Progress Section */}
      {loadingStage === 'syncing' && syncProgress && (
        <div className="mb-8">
          {/* Main Progress Bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-white font-semibold">Sync Progress</span>
              <div className="flex items-center space-x-2">
                <span className="text-blue-300 text-sm">
                  <AnimatedCounter
                    value={syncProgress.percentComplete}
                    decimals={1}
                    duration={500}
                    suffix="%"
                  />
                </span>
                <span className="text-gray-400 text-xs">
                  ({syncProgress.processed}/{syncProgress.total})
                </span>
              </div>
            </div>
            <div className="h-3 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-3 bg-gradient-to-r from-verus-blue to-verus-green rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${Math.min(syncProgress.percentComplete, 100)}%`,
                }}
              />
            </div>
          </div>

          {/* Current Activity */}
          {syncProgress.current && (
            <div className="bg-white/5 rounded-lg p-4 mb-4">
              <div className="flex items-center space-x-3">
                <Pulse className="h-5 w-5 text-blue-400 animate-pulse" />
                <div className="flex-1">
                  <div className="text-white font-medium">
                    Currently Syncing
                  </div>
                  <div className="text-blue-300 text-sm truncate">
                    {syncProgress.current}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/5 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <UsersThree className="h-4 w-4 text-green-400" />
                <span className="text-green-300 text-sm font-medium">
                  Processed
                </span>
              </div>
              <div className="text-2xl font-bold text-white">
                <AnimatedCounter
                  value={syncProgress.processed}
                  decimals={0}
                  duration={500}
                />
              </div>
            </div>

            <div className="bg-white/5 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <TrendUp className="h-4 w-4 text-blue-400" />
                <span className="text-blue-300 text-sm font-medium">
                  Progress
                </span>
              </div>
              <div className="text-2xl font-bold text-white">
                <AnimatedCounter
                  value={syncProgress.percentComplete}
                  decimals={1}
                  duration={500}
                  suffix="%"
                />
              </div>
            </div>

            <div className="bg-white/5 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Timer className="h-4 w-4 text-verus-blue" />
                <span className="text-purple-300 text-sm font-medium">ETA</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {getEstimatedTime() || 'Calculating...'}
              </div>
            </div>
          </div>

          {/* Errors */}
          {syncProgress.errors && syncProgress.errors.length > 0 && (
            <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <WarningCircle className="h-4 w-4 text-red-400" />
                <span className="text-red-300 font-medium">Sync Issues</span>
              </div>
              <div className="text-red-200 text-sm">
                {syncProgress.errors.length} error(s) encountered during sync
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error State */}
      {syncError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 mb-6">
          <div className="flex items-start space-x-3">
            <WarningCircle className="h-6 w-6 text-red-400 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h4 className="text-red-400 font-semibold mb-2">Sync Failed</h4>
              <p className="text-red-300 text-sm mb-4">{syncError}</p>
              <button
                onClick={() => {
                  setSyncError(null);
                  setLoadingStage('checking');
                  setIsAutoSyncing(false);
                }}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg text-white text-sm font-medium transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Animation */}
      {loadingStage !== 'complete' && !syncError && (
        <div className="flex items-center justify-center space-x-4 mb-6">
          <CircleNotch className="h-6 w-6 text-blue-400 animate-spin" />
          <span className="text-blue-300 text-lg">
            {loadingStage === 'checking' && 'Checking database...'}
            {loadingStage === 'syncing' && 'Syncing blockchain data...'}
            {loadingStage === 'processing' && 'Processing statistics...'}
          </span>
        </div>
      )}

      {/* Success State */}
      {loadingStage === 'complete' && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-6">
          <div className="flex items-center space-x-3">
            <CheckCircle className="h-6 w-6 text-green-400" />
            <div>
              <h4 className="text-green-400 font-semibold mb-1">
                Sync Complete!
              </h4>
              <p className="text-green-300 text-sm">
                Your VerusID data is now ready. The dashboard will refresh
                automatically.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="text-center text-sm text-blue-200/80 mt-6">
        <div className="flex items-center justify-center space-x-4">
          <span>VerusID: {verusID}</span>
          <span>•</span>
          <span>
            I-Address: {iaddr.slice(0, 8)}...{iaddr.slice(-8)}
          </span>
          {syncProgress?.startTime && (
            <>
              <span>•</span>
              <span>
                Started: {new Date(syncProgress.startTime).toLocaleTimeString()}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
