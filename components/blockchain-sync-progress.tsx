'use client';

import { useState, useEffect } from 'react';
import {
  CircleNotch,
  CheckCircle,
  HardDrives,
  Clock,
  CloudArrowDown,
  Network,
} from '@phosphor-icons/react';

interface BlockchainSyncProgressProps {
  className?: string;
  refreshInterval?: number;
}

interface SyncStatus {
  connected: boolean;
  blockHeight: number;
  headerHeight: number;
  syncProgress: number;
  verificationProgress: number;
  isSynced: boolean;
  connections: number;
  initializing: boolean;
  latency: number;
}

export function BlockchainSyncProgress({
  className = '',
  refreshInterval = 5000, // Check every 5 seconds during sync
}: BlockchainSyncProgressProps) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    connected: false,
    blockHeight: 0,
    headerHeight: 0,
    syncProgress: 0,
    verificationProgress: 0,
    isSynced: true,
    connections: 0,
    initializing: true,
    latency: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSyncStatus = async () => {
      try {
        const startTime = Date.now();
        const response = await fetch('/api/blockchain-info');
        const latency = Date.now() - startTime;

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            const blockchainData = data.data;
            const verificationProgress =
              blockchainData.verificationProgress || 0;
            const syncProgress = Number((verificationProgress * 100).toFixed(1));
            const isSynced = syncProgress >= 99.9; // Consider synced at 99.9%
            const initializing =
              blockchainData._raw?.initializing || blockchainData.blocks === 0;

            setSyncStatus({
              connected: true,
              blockHeight: blockchainData.blocks || 0,
              headerHeight: blockchainData.blocks || 0,
              syncProgress,
              verificationProgress,
              isSynced,
              connections: blockchainData.connections || 0,
              initializing,
              latency,
            });
            setError(null);
          }
        } else {
          throw new Error('Failed to fetch blockchain info');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Network error');
        setSyncStatus(prev => ({
          ...prev,
          connected: false,
        }));
      } finally {
        setIsLoading(false);
      }
    };

    fetchSyncStatus();
    const interval = setInterval(fetchSyncStatus, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  // Don't show anything if synced or disconnected
  if (
    isLoading ||
    !syncStatus.connected ||
    syncStatus.isSynced ||
    error
  ) {
    return null;
  }

  const progressPercentage = syncStatus.syncProgress;

  return (
    <div
      className={`bg-blue-500/10 dark:bg-blue-500/20 backdrop-blur-sm rounded-lg border border-blue-500/30 ${className}`}
    >
      <div className="p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <CircleNotch className="h-6 w-6 text-blue-400 animate-spin" />
              <div className="absolute inset-0">
                <CloudArrowDown className="h-6 w-6 text-blue-400 opacity-50" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">
                {syncStatus.initializing
                  ? 'Initializing Blockchain...'
                  : 'Synchronizing Blockchain'}
              </h3>
              <p className="text-sm text-white/70">
                {syncStatus.initializing
                  ? 'Loading block index and verifying data'
                  : 'Downloading and verifying blocks'}
              </p>
            </div>
          </div>

          {/* Connection Info */}
          <div className="hidden sm:flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-2">
              <Network className="h-4 w-4 text-blue-400" />
              <span className="text-white/80">
                {syncStatus.connections} peers
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-blue-400" />
              <span className="text-white/80">{syncStatus.latency}ms</span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          {/* Progress Bar Container */}
          <div className="relative h-8 bg-slate-900/50 rounded-full overflow-hidden border border-blue-500/20">
            {/* Animated Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-400/10 to-transparent animate-shimmer z-0" />

            {/* Glowing Effect - Behind everything */}
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-transparent to-blue-400/30 blur-sm transition-all duration-500 z-0"
              style={{ width: `${progressPercentage}%` }}
            />

            {/* Progress Fill */}
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 transition-all duration-500 ease-out rounded-full z-10"
              style={{ width: `${Math.max(progressPercentage, 5)}%` }}
            />

            {/* Progress Text - Always on top */}
            <div className="absolute inset-0 flex items-center justify-center z-20">
              <span className="text-white font-bold text-sm drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                {progressPercentage.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Stats Row */}
          <div className="flex items-center justify-between text-sm text-white/70">
            <div className="flex items-center space-x-2">
              <HardDrives className="h-4 w-4 text-blue-400" />
              <span>
                {syncStatus.blockHeight.toLocaleString()} blocks processed
              </span>
            </div>

            {/* Mobile Connection Info */}
            <div className="flex sm:hidden items-center space-x-3">
              <span>{syncStatus.connections} peers</span>
              <span>•</span>
              <span>{syncStatus.latency}ms</span>
            </div>

            <div className="hidden sm:block">
              {progressPercentage > 0 && progressPercentage < 100 && (
                <span className="text-white/60">
                  {progressPercentage < 50
                    ? 'This may take a while...'
                    : progressPercentage < 90
                      ? 'Making good progress...'
                      : 'Almost there...'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Info Message */}
        {syncStatus.initializing && (
          <div className="mt-4 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
            <p className="text-xs text-white/70 leading-relaxed">
              <strong className="text-white/90">Note:</strong> Initial
              synchronization may take some time depending on your connection
              speed and the blockchain size. The wallet will be fully functional
              once sync is complete.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Compact version for status bars
export function BlockchainSyncProgressCompact({
  className = '',
}: {
  className?: string;
}) {
  const [syncStatus, setSyncStatus] = useState<{
    syncProgress: number;
    isSynced: boolean;
  }>({
    syncProgress: 0,
    isSynced: true,
  });

  useEffect(() => {
    const fetchSyncStatus = async () => {
      try {
        const response = await fetch('/api/blockchain-info');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            const verificationProgress =
              data.data.verificationProgress || 0;
            const syncProgress = Number((verificationProgress * 100).toFixed(1));
            const isSynced = syncProgress >= 99.9;

            setSyncStatus({
              syncProgress,
              isSynced,
            });
          }
        }
      } catch (err) {
        // Silent fail for compact version
      }
    };

    fetchSyncStatus();
    const interval = setInterval(fetchSyncStatus, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, []);

  if (syncStatus.isSynced || syncStatus.syncProgress === 0) {
    return null;
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <CircleNotch className="h-4 w-4 text-blue-400 animate-spin" />
      <div className="flex-1 max-w-[120px] h-2 bg-slate-900/50 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-500"
          style={{ width: `${syncStatus.syncProgress}%` }}
        />
      </div>
      <span className="text-xs text-white/70 font-medium whitespace-nowrap">
        {syncStatus.syncProgress.toFixed(1)}%
      </span>
    </div>
  );
}

