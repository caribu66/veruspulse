'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Database,
  CircleNotch,
  ArrowsClockwise,
  WarningCircle,
  Clock,
  Lightning,
} from '@phosphor-icons/react';

interface VerusIDLoadingStateProps {
  verusID?: string;
  iaddr?: string;
  message?: string;
  onRetry?: () => void;
  showRetryButton?: boolean;
  className?: string;
}

export function VerusIDLoadingState({
  verusID,
  iaddr,
  message = 'Loading VerusID data...',
  onRetry,
  showRetryButton = false,
  className = '',
}: VerusIDLoadingStateProps) {
  const tCommon = useTranslations('common');
  const tVerusId = useTranslations('verusid');
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    if (onRetry && !isRetrying) {
      setIsRetrying(true);
      try {
        await onRetry();
      } finally {
        setIsRetrying(false);
      }
    }
  };

  return (
    <div
      className={`bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 ${className}`}
    >
      {/* Header */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center space-x-3 mb-4">
          <div className="relative p-3 rounded-xl bg-blue-500/20 border border-blue-500/30">
            <Database className="h-8 w-8 text-blue-400" />
            <div className="absolute inset-0 rounded-xl bg-blue-500/20 animate-pulse" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-blue-400">
              Loading Statistics
            </h3>
            {verusID && <p className="text-blue-200 text-sm">{verusID}</p>}
          </div>
        </div>
        <p className="text-blue-200 text-lg">{message}</p>
      </div>

      {/* Loading Animation */}
      <div className="flex items-center justify-center space-x-4 mb-6">
        <CircleNotch className="h-6 w-6 text-blue-400 animate-spin" />
        <span className="text-blue-300 text-lg">Please wait...</span>
      </div>

      {/* Progress Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white/5 rounded-lg p-4 text-center">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <Database className="h-4 w-4 text-green-400" />
            <span className="text-green-300 text-sm font-medium">Database</span>
          </div>
          <div className="text-white text-lg font-semibold">Connected</div>
        </div>

        <div className="bg-white/5 rounded-lg p-4 text-center">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <Lightning className="h-4 w-4 text-verus-teal" />
            <span className="text-yellow-300 text-sm font-medium">
              Processing
            </span>
          </div>
          <div className="text-white text-lg font-semibold">Active</div>
        </div>

        <div className="bg-white/5 rounded-lg p-4 text-center">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <Clock className="h-4 w-4 text-verus-blue" />
            <span className="text-purple-300 text-sm font-medium">ETA</span>
          </div>
          <div className="text-white text-lg font-semibold">~30s</div>
        </div>
      </div>

      {/* Retry Button */}
      {showRetryButton && onRetry && (
        <div className="text-center">
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors"
          >
            {isRetrying ? (
              <>
                <CircleNotch className="h-4 w-4 animate-spin" />
                <span>Retrying...</span>
              </>
            ) : (
              <>
                <ArrowsClockwise className="h-4 w-4" />
                <span>{tCommon("retry")}</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Footer Info */}
      {(verusID || iaddr) && (
        <div className="text-center text-sm text-blue-200/80 mt-6 pt-4 border-t border-white/10">
          <div className="flex items-center justify-center space-x-4">
            {verusID && (
              <>
                <span>VerusID: {verusID}</span>
                {iaddr && <span>•</span>}
              </>
            )}
            {iaddr && (
              <span>
                I-Address: {iaddr.slice(0, 8)}...{iaddr.slice(-8)}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Simple loading state for quick use
export function SimpleVerusIDLoading({
  message = 'Loading...',
}: {
  message?: string;
}) {
  const tCommon = useTranslations('common');
  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
      <div className="flex items-center justify-center space-x-3">
        <CircleNotch className="h-5 w-5 text-blue-400 animate-spin" />
        <span className="text-blue-300">{message || tCommon("loading")}</span>
      </div>
    </div>
  );
}

// Error state component
export function VerusIDErrorState({
  error,
  onRetry,
  verusID,
  iaddr,
  className = '',
}: {
  error: string;
  onRetry?: () => void;
  verusID?: string;
  iaddr?: string;
  className?: string;
}) {
  return (
    <div
      className={`bg-red-500/10 backdrop-blur-sm rounded-2xl p-8 border border-red-500/20 ${className}`}
    >
      <div className="flex items-start space-x-4">
        <WarningCircle className="h-6 w-6 text-red-400 flex-shrink-0 mt-1" />
        <div className="flex-1">
          <h3 className="text-red-400 font-semibold text-lg mb-2">
            Error Loading Statistics
          </h3>
          <p className="text-red-300 text-sm mb-4">{error}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg text-white text-sm font-medium transition-colors"
            >
              Retry
            </button>
          )}
        </div>
      </div>

      {(verusID || iaddr) && (
        <div className="mt-4 pt-4 border-t border-red-500/20">
          <div className="text-xs text-red-200/80">
            {verusID && <div>VerusID: {verusID}</div>}
            {iaddr && <div>I-Address: {iaddr}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
