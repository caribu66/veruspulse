'use client';

import { useState, useEffect } from 'react';
import { WifiHigh, WifiSlash, HardDrives, Clock } from '@phosphor-icons/react';
import { useTranslations } from 'next-intl';

interface ConnectionStatusProps {
  className?: string;
}

interface DaemonStatus {
  connected: boolean;
  host: string;
  blockHeight: number;
  syncProgress: number;
  lastUpdate: Date;
  latency: number;
}

export function ConnectionStatus({
  className = '',
}: ConnectionStatusProps) {
  const tCommon = useTranslations('common');
  const tNetwork = useTranslations('network');
  const [status, setStatus] = useState<DaemonStatus>({
    connected: false,
    host: '',
    blockHeight: 0,
    syncProgress: 0,
    lastUpdate: new Date(),
    latency: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

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
          }
        }
      } catch (error) {
        setStatus(prev => ({
          ...prev,
          connected: false,
          lastUpdate: new Date(),
        }));
      } finally {
        setIsLoading(false);
      }
    };

    // Check immediately
    checkConnection();

    // Check every 30 seconds
    const interval = setInterval(checkConnection, 30000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusColor = () => {
    if (isLoading) return 'text-verus-teal';
    return status.connected ? 'text-green-400' : 'text-red-400';
  };

  const getStatusIcon = () => {
    if (isLoading) return <Clock className="h-4 w-4 animate-spin" />;
    return status.connected ? (
      <WifiHigh className="h-4 w-4" />
    ) : (
      <WifiSlash className="h-4 w-4" />
    );
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className="flex items-center space-x-1">
        <HardDrives className="h-4 w-4 text-blue-400" />
        <span className="text-sm text-white/80">Daemon:</span>
      </div>

      <div className="flex items-center space-x-1">
        {getStatusIcon()}
        <span className={`text-sm font-medium ${getStatusColor()}`}>
          {isLoading
            ? 'Checking...'
            : status.connected
              ? 'Connected'
              : 'Disconnected'}
        </span>
      </div>

      {status.connected && (
        <>
          <div className="hidden sm:flex items-center space-x-1 text-xs text-white/60">
            <span>{status.host}</span>
            <span>•</span>
            <span>{status.blockHeight.toLocaleString()} blocks</span>
            {status.syncProgress > 0 && status.syncProgress < 100 && (
              <>
                <span>•</span>
                <span>{status.syncProgress}% synced</span>
              </>
            )}
            <span>•</span>
            <span>{status.latency}ms</span>
          </div>

          {/* Inline Mini Progress Bar for Syncing */}
          {status.syncProgress > 0 && status.syncProgress < 100 && (
            <div className="hidden sm:flex items-center space-x-2">
              <div className="w-24 h-1.5 bg-slate-900/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-500"
                  style={{ width: `${status.syncProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="text-xs text-white/50">
            {formatTime(status.lastUpdate)}
          </div>
        </>
      )}
    </div>
  );
}
