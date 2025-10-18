'use client';

import { useState, useEffect } from 'react';
import {
  WifiHigh,
  WifiSlash,
  HardDrives,
  Clock,
  Warning,
  CheckCircle,
  XCircle,
  Loader2,
} from '@phosphor-icons/react';

interface ConnectionStatus {
  connected: boolean;
  host: string;
  blockHeight: number;
  syncProgress: number;
  lastUpdate: Date;
  latency: number;
}

interface SmartStatusIndicatorProps {
  className?: string;
  showDetails?: boolean;
  compact?: boolean;
}

export function SmartStatusIndicator({
  className = '',
  showDetails = false,
  compact = false,
}: SmartStatusIndicatorProps) {
  const [status, setStatus] = useState<ConnectionStatus>({
    connected: false,
    host: '',
    blockHeight: 0,
    syncProgress: 0,
    lastUpdate: new Date(),
    latency: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const startTime = Date.now();
        const response = await fetch('/api/blockchain-info');
        const latency = Date.now() - startTime;

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            setStatus({
              connected: true,
              host: process.env.NEXT_PUBLIC_DAEMON_HOST || '192.168.86.89',
              blockHeight: data.data.blocks || 0,
              syncProgress: Math.round(
                (data.data.verificationProgress || 0) * 100
              ),
              lastUpdate: new Date(),
              latency,
            });
            setLastError(null);
          } else {
            throw new Error('Invalid response data');
          }
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (error) {
        setStatus(prev => ({
          ...prev,
          connected: false,
          lastUpdate: new Date(),
        }));
        setLastError(error instanceof Error ? error.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 10000); // More frequent updates
    return () => clearInterval(interval);
  }, []);

  const getStatusInfo = () => {
    if (isLoading) {
      return {
        icon: Loader2,
        color: 'text-verus-teal',
        bgColor: 'bg-verus-teal/20',
        borderColor: 'border-yellow-500/30',
        label: 'Checking...',
        status: 'loading',
        pulse: true,
      };
    }

    if (!status.connected) {
      return {
        icon: XCircle,
        color: 'text-red-400',
        bgColor: 'bg-red-500/20',
        borderColor: 'border-red-500/30',
        label: 'Disconnected',
        status: 'error',
        pulse: false,
      };
    }

    if (status.syncProgress > 0 && status.syncProgress < 100) {
      return {
        icon: Clock,
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/20',
        borderColor: 'border-blue-500/30',
        label: 'Syncing',
        status: 'syncing',
        pulse: true,
      };
    }

    if (status.latency > 1000) {
      return {
        icon: Warning,
        color: 'text-verus-cyan',
        bgColor: 'bg-verus-cyan/20',
        borderColor: 'border-orange-500/30',
        label: 'Slow',
        status: 'warning',
        pulse: false,
      };
    }

    return {
      icon: CheckCircle,
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
      borderColor: 'border-green-500/30',
      label: 'Connected',
      status: 'success',
      pulse: false,
    };
  };

  const statusInfo = getStatusInfo();
  const Icon = statusInfo.icon;

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatLatency = (latency: number) => {
    if (latency < 100) return `${latency}ms`;
    if (latency < 1000) return `${(latency / 1000).toFixed(1)}s`;
    return `${(latency / 1000).toFixed(1)}s`;
  };

  if (compact) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div
          className={`relative p-1 rounded-full ${statusInfo.bgColor} ${statusInfo.borderColor} border`}
        >
          <Icon
            className={`h-3 w-3 ${statusInfo.color} ${statusInfo.pulse ? 'animate-pulse' : ''}`}
          />
          {statusInfo.pulse && (
            <div
              className={`absolute inset-0 rounded-full ${statusInfo.bgColor} animate-ping`}
            />
          )}
        </div>
        <span className={`text-xs font-medium ${statusInfo.color}`}>
          {statusInfo.label}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {/* Status Icon */}
      <div
        className={`relative p-2 rounded-lg ${statusInfo.bgColor} ${statusInfo.borderColor} border`}
      >
        <Icon
          className={`h-4 w-4 ${statusInfo.color} ${statusInfo.pulse ? 'animate-pulse' : ''}`}
        />
        {statusInfo.pulse && (
          <div
            className={`absolute inset-0 rounded-lg ${statusInfo.bgColor} animate-ping`}
          />
        )}
      </div>

      {/* Status Text */}
      <div className="flex flex-col">
        <div className="flex items-center space-x-2">
          <span className={`text-sm font-medium ${statusInfo.color}`}>
            {statusInfo.label}
          </span>
          {status.connected && (
            <span className="text-xs text-white/60">{status.host}</span>
          )}
        </div>

        {showDetails && status.connected && (
          <div className="flex items-center space-x-3 text-xs text-white/60 mt-1">
            <span>{status.blockHeight.toLocaleString()} blocks</span>
            {status.syncProgress > 0 && status.syncProgress < 100 && (
              <span>{status.syncProgress}% synced</span>
            )}
            <span>{formatLatency(status.latency)}</span>
            <span>{formatTime(status.lastUpdate)}</span>
          </div>
        )}
      </div>

      {/* Error Message */}
      {lastError && (
        <div className="text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded">
          {lastError}
        </div>
      )}
    </div>
  );
}
