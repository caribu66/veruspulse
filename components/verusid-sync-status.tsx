'use client';

import { useState, useEffect } from 'react';
import {
  Pulse,
  CheckCircle,
  WarningCircle,
  Clock,
  Pause,
  Database,
  UsersThree,
} from '@phosphor-icons/react';

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

interface VerusIDSyncStatusProps {
  className?: string;
  refreshInterval?: number; // default 5000ms
  currentVerusID?: string; // Optional: current VerusID being viewed
}

export function VerusIDSyncStatus({
  className = '',
  refreshInterval = 5000,
  currentVerusID,
}: VerusIDSyncStatusProps) {
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkingVerusID, setCheckingVerusID] = useState(false);

  useEffect(() => {
    const fetchSyncStatus = async () => {
      try {
        const response = await fetch('/api/admin/sync-all-verusids');
        const data = await response.json();

        if (data.success && data.progress) {
          setProgress(data.progress);
          setError(null);
        } else {
          setError(data.error || 'Failed to fetch sync status');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Network error');
      } finally {
        setIsLoading(false);
      }
    };

    // Fetch immediately
    fetchSyncStatus();

    // Set up polling interval
    const interval = setInterval(fetchSyncStatus, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  // Check if current VerusID needs syncing and auto-trigger if needed
  useEffect(() => {
    const checkAndSyncVerusID = async () => {
      if (!currentVerusID || checkingVerusID) return;

      setCheckingVerusID(true);
      try {
        // Check if this VerusID has staking data
        const response = await fetch(
          `/api/verusid/${currentVerusID}/staking-stats`
        );

        if (!response.ok) {
          // VerusID not found or no data, trigger sync
          console.log(`Auto-syncing VerusID: ${currentVerusID}`);
          try {
            const syncResponse = await fetch('/api/admin/sync-all-verusids', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ specificId: currentVerusID }),
            });

            if (syncResponse.ok) {
              const syncData = await syncResponse.json();
              console.log('Sync started successfully:', syncData);
            } else if (syncResponse.status === 409) {
              console.log('Sync already in progress for this VerusID');
            }
          } catch (syncErr) {
            console.warn('Error starting sync:', syncErr);
          }
        } else {
          const data = await response.json();
          if (
            !data.success ||
            !data.data ||
            data.data.summary.totalStakes === 0
          ) {
            // VerusID has no staking data, trigger sync
            console.log(`Auto-syncing VerusID: ${currentVerusID}`);
            try {
              const syncResponse = await fetch('/api/admin/sync-all-verusids', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ specificId: currentVerusID }),
              });

              if (syncResponse.ok) {
                const syncData = await syncResponse.json();
                console.log('Sync started successfully:', syncData);
              } else if (syncResponse.status === 409) {
                console.log('Sync already in progress for this VerusID');
              }
            } catch (syncErr) {
              console.warn('Error starting sync:', syncErr);
            }
          }
        }
      } catch (err) {
        console.warn('Error checking VerusID sync status:', err);
      } finally {
        setCheckingVerusID(false);
      }
    };

    // Only check once when currentVerusID changes, not on every render
    const timeoutId = setTimeout(checkAndSyncVerusID, 1000);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentVerusID]); // Remove checkingVerusID from dependencies

  const getStatusInfo = () => {
    if (isLoading || checkingVerusID) {
      return {
        icon: Database,
        color: 'text-gray-400',
        bgColor: 'bg-gray-500/20',
        borderColor: 'border-gray-500/30',
        label: checkingVerusID ? 'Checking VerusID...' : 'Loading...',
        pulse: true,
      };
    }

    if (error) {
      return {
        icon: WarningCircle,
        color: 'text-red-400',
        bgColor: 'bg-red-500/20',
        borderColor: 'border-red-500/30',
        label: 'Sync Error',
        pulse: false,
      };
    }

    if (!progress) {
      return {
        icon: Clock,
        color: 'text-gray-400',
        bgColor: 'bg-gray-500/20',
        borderColor: 'border-gray-500/30',
        label: 'No Sync Data',
        pulse: false,
      };
    }

    switch (progress.status) {
      case 'running':
        return {
          icon: Pulse,
          color: 'text-blue-400',
          bgColor: 'bg-blue-500/20',
          borderColor: 'border-blue-500/30',
          label:
            currentVerusID && progress?.current === currentVerusID
              ? `Syncing ${currentVerusID}`
              : 'Syncing',
          pulse: true,
        };
      case 'paused':
        return {
          icon: Pause,
          color: 'text-verus-teal',
          bgColor: 'bg-verus-teal/20',
          borderColor: 'border-yellow-500/30',
          label: 'Paused',
          pulse: false,
        };
      case 'completed':
        return {
          icon: CheckCircle,
          color: 'text-green-400',
          bgColor: 'bg-green-500/20',
          borderColor: 'border-green-500/30',
          label: 'Completed',
          pulse: false,
        };
      case 'error':
        return {
          icon: WarningCircle,
          color: 'text-red-400',
          bgColor: 'bg-red-500/20',
          borderColor: 'border-red-500/30',
          label: 'Error',
          pulse: false,
        };
      default: // idle
        return {
          icon: Clock,
          color: 'text-gray-400',
          bgColor: 'bg-gray-500/20',
          borderColor: 'border-gray-500/30',
          label: 'Idle',
          pulse: false,
        };
    }
  };

  const statusInfo = getStatusInfo();
  const Icon = statusInfo.icon;

  // Temporarily always render for testing - remove this check
  // if (process.env.NEXT_PUBLIC_UTXO_DATABASE_ENABLED !== 'true') {
  //   return null;
  // }

  return (
    <div
      className={`bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 ${className}`}
    >
      {/* Temporary debug indicator */}
      <div className="text-xs text-green-400 mb-2">
        🔧 VerusIDSyncStatus Component is now visible!
      </div>
      <div className="flex items-center justify-between">
        {/* Status Icon and Label */}
        <div className="flex items-center space-x-3">
          <div
            className={`relative p-2 rounded-lg ${statusInfo.bgColor} ${statusInfo.borderColor} border`}
          >
            <Icon
              className={`h-5 w-5 ${statusInfo.color} ${statusInfo.pulse ? 'animate-pulse' : ''}`}
            />
            {statusInfo.pulse && (
              <div
                className={`absolute inset-0 rounded-lg ${statusInfo.bgColor} animate-ping`}
              />
            )}
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <span className={`text-lg font-semibold ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
              <UsersThree className="h-4 w-4 text-blue-300" />
            </div>
            <p className="text-sm text-white/60">VerusID Staking Sync</p>
          </div>
        </div>

        {/* Progress Information */}
        {progress && (
          <div className="text-right">
            <div className="text-lg font-bold text-white">
              {progress.processed.toLocaleString()} /{' '}
              {progress.total.toLocaleString()}
            </div>
            <div className="text-sm text-white/60">
              {progress.percentComplete.toFixed(1)}% complete
            </div>
            {progress.failed > 0 && (
              <div className="text-xs text-red-400">
                {progress.failed} failed
              </div>
            )}
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {progress && progress.status === 'running' && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/80">Progress</span>
            {progress.current && (
              <span className="text-xs text-blue-300 truncate max-w-xs">
                Syncing: {progress.current}
              </span>
            )}
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-2 bg-blue-400 rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${Math.min(progress.percentComplete, 100)}%`,
              }}
            />
          </div>
          {progress.estimatedTimeRemaining && (
            <div className="text-xs text-white/60 mt-1">
              ETA: {progress.estimatedTimeRemaining}
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <div className="text-sm text-red-400">{error}</div>
        </div>
      )}

      {/* Completed Status */}
      {progress && progress.status === 'completed' && (
        <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
          <div className="text-sm text-green-400">
            All VerusIDs have been synced successfully!
          </div>
        </div>
      )}

      {/* Manual Sync Button */}
      {currentVerusID && progress?.status === 'idle' && (
        <div className="mt-4">
          <button
            onClick={async () => {
              try {
                const response = await fetch('/api/admin/sync-all-verusids', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ specificId: currentVerusID }),
                });

                if (response.ok) {
                  console.log('Manual sync started successfully');
                } else if (response.status === 409) {
                  console.log('Sync already in progress');
                } else {
                  console.error(
                    'Manual sync failed with status:',
                    response.status
                  );
                }
              } catch (err) {
                console.error('Manual sync failed:', err);
              }
            }}
            className="w-full px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg text-blue-300 hover:text-blue-200 transition-colors text-sm"
          >
            Sync {currentVerusID}
          </button>
        </div>
      )}
    </div>
  );
}
