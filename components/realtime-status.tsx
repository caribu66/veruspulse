'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  WifiHigh,
  WifiSlash,
  WarningCircle,
  ArrowsClockwise,
  CheckCircle,
  Clock,
  Pulse,
} from '@phosphor-icons/react';
import { useRealtimeUpdates } from '@/lib/hooks/use-realtime-updates';

interface RealtimeStatusProps {
  className?: string;
  showDetails?: boolean;
}

export function RealtimeStatus({
  className = '',
  showDetails = false,
}: RealtimeStatusProps) {
  const tCommon = useTranslations('common');
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [updateCount, setUpdateCount] = useState(0);

  const {
    isConnected,
    connectionStatus,
    reconnectAttempts,
    lastUpdate,
    enableRealtime,
    disableRealtime,
  } = useRealtimeUpdates(update => {
    setLastUpdateTime(new Date());
    setUpdateCount(prev => prev + 1);
  });

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'connecting':
        return (
          <ArrowsClockwise className="h-4 w-4 text-yellow-400 animate-spin" />
        );
      case 'error':
        return <WarningCircle className="h-4 w-4 text-red-400" />;
      default:
        return <WifiSlash className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Live';
      case 'connecting':
        return 'Connecting...';
      case 'error':
        return tCommon('error');
      default:
        return 'Offline';
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'text-green-400 bg-green-500/10 border-green-500/20';
      case 'connecting':
        return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
      case 'error':
        return 'text-red-400 bg-red-500/10 border-red-500/20';
      default:
        return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
    }
  };

  const formatLastUpdate = () => {
    if (!lastUpdateTime) return 'Never';

    const now = new Date();
    const diff = now.getTime() - lastUpdateTime.getTime();
    const seconds = Math.floor(diff / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return lastUpdateTime.toLocaleTimeString();
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Status Indicator */}
      <div
        className={`
        flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium
        ${getStatusColor()}
      `}
      >
        {getStatusIcon()}
        <span>{getStatusText()}</span>
        {reconnectAttempts > 0 && (
          <span className="text-xs opacity-75">({reconnectAttempts}/5)</span>
        )}
      </div>

      {/* Additional Details */}
      {showDetails && (
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <div className="flex items-center gap-1">
            <Pulse className="h-3 w-3" />
            <span>{updateCount} updates</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{formatLastUpdate()}</span>
          </div>
        </div>
      )}

      {/* Connection Toggle */}
      <button
        onClick={isConnected ? disableRealtime : enableRealtime}
        className={`
          p-1.5 rounded-lg transition-colors
          ${
            isConnected
              ? 'text-red-400 hover:bg-red-500/10'
              : 'text-green-400 hover:bg-green-500/10'
          }
        `}
        title={
          isConnected
            ? 'Disconnect real-time updates'
            : 'Connect real-time updates'
        }
      >
        {isConnected ? (
          <WifiSlash className="h-4 w-4" />
        ) : (
          <WifiHigh className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}

// Compact version for smaller spaces
export function RealtimeStatusCompact({
  className = '',
}: {
  className?: string;
}) {
  const { isConnected, connectionStatus } = useRealtimeUpdates(() => {});

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'text-green-400';
      case 'connecting':
        return 'text-yellow-400';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <div
        className={`w-2 h-2 rounded-full ${getStatusColor().replace('text-', 'bg-')}`}
      />
      <span className={`text-xs ${getStatusColor()}`}>
        {isConnected ? 'Live' : 'Offline'}
      </span>
    </div>
  );
}

// Real-time update notification
export function RealtimeNotification({ update }: { update: any }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, [update]);

  if (!isVisible || !update) return null;

  const getUpdateIcon = () => {
    switch (update.type) {
      case 'block':
        return '🆕';
      case 'transaction':
        return '💸';
      case 'mempool':
        return '📝';
      case 'network':
        return '🌐';
      case 'staking':
        return '💰';
      default:
        return '📊';
    }
  };

  const getUpdateMessage = () => {
    switch (update.type) {
      case 'block':
        return `New block #${update.data?.height || 'N/A'}`;
      case 'transaction':
        return 'New transaction received';
      case 'mempool':
        return `Mempool updated: ${update.data?.size || 0} transactions`;
      case 'network':
        return 'Network metrics updated';
      case 'staking':
        return 'Staking data updated';
      default:
        return 'Data updated';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-3 shadow-lg animate-in slide-in-from-right">
      <div className="flex items-center gap-2">
        <span className="text-lg">{getUpdateIcon()}</span>
        <div>
          <div className="text-sm font-medium text-white">
            {getUpdateMessage()}
          </div>
          <div className="text-xs text-gray-400">
            {new Date(update.timestamp).toLocaleTimeString()}
          </div>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-white ml-2"
        >
          ×
        </button>
      </div>
    </div>
  );
}
