'use client';

import { useState, useRef, useCallback } from 'react';
import { ArrowsClockwise } from '@phosphor-icons/react';
import { haptics } from '@/lib/utils/haptics';
import { useTranslations } from 'next-intl';

/**
 * Pull-to-Refresh Component
 *
 * Provides intuitive pull-down-to-refresh gesture for mobile
 * Shows visual feedback during pull and refresh
 */

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  disabled?: boolean;
  threshold?: number;
}

export function PullToRefresh({
  onRefresh,
  children,
  disabled = false,
  threshold = 80,
}: PullToRefreshProps) {
  const tCommon = useTranslations('common');
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled || isRefreshing) return;

      // Only start if at top of scroll
      const container = containerRef.current;
      if (container && container.scrollTop === 0) {
        startY.current = e.touches[0].clientY;
      }
    },
    [disabled, isRefreshing]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (disabled || isRefreshing || startY.current === 0) return;

      const currentY = e.touches[0].clientY;
      const distance = Math.max(0, currentY - startY.current);

      // Apply resistance curve (gets harder to pull as you go further)
      const resistance = 0.5;
      const adjustedDistance = Math.min(distance * resistance, threshold * 1.5);

      setPullDistance(adjustedDistance);

      if (adjustedDistance >= threshold && !isPulling) {
        setIsPulling(true);
        haptics.light();
      } else if (adjustedDistance < threshold && isPulling) {
        setIsPulling(false);
      }
    },
    [disabled, isRefreshing, isPulling, threshold]
  );

  const handleTouchEnd = useCallback(async () => {
    if (disabled || isRefreshing) return;

    if (isPulling && pullDistance >= threshold) {
      setIsRefreshing(true);
      haptics.medium();

      try {
        await onRefresh();
        haptics.success();
      } catch (error) {
        haptics.error();
        console.error('Refresh failed:', error);
      } finally {
        setIsRefreshing(false);
      }
    }

    setPullDistance(0);
    setIsPulling(false);
    startY.current = 0;
  }, [disabled, isRefreshing, isPulling, pullDistance, threshold, onRefresh]);

  const pullProgress = Math.min((pullDistance / threshold) * 100, 100);

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative overflow-auto"
    >
      {/* Pull indicator */}
      <div
        className="flex justify-center items-center transition-all duration-200 overflow-hidden"
        style={{
          height: pullDistance,
          opacity: pullDistance / threshold,
        }}
      >
        <div className="flex flex-col items-center space-y-2 py-2">
          <div className="relative">
            {/* Progress circle */}
            <svg className="w-8 h-8 transform -rotate-90">
              <circle
                cx="16"
                cy="16"
                r="14"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                className="text-slate-700"
              />
              <circle
                cx="16"
                cy="16"
                r="14"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                className="text-blue-400 transition-all duration-150"
                strokeDasharray={`${(pullProgress / 100) * 88} 88`}
              />
            </svg>
            {/* Icon */}
            <ArrowsClockwise
              className={`absolute inset-0 m-auto h-4 w-4 text-blue-400 ${
                isRefreshing ? 'animate-spin' : ''
              } ${isPulling && !isRefreshing ? 'animate-pulse' : ''}`}
              weight="bold"
            />
          </div>
          <span className="text-xs font-medium text-blue-400">
            {isRefreshing
              ? 'Refreshing...'
              : isPulling
                ? 'Release to refresh'
                : 'Pull to refresh'}
          </span>
        </div>
      </div>

      {children}
    </div>
  );
}
