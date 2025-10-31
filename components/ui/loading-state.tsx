'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { CircleNotch, Spinner } from '@phosphor-icons/react';

/**
 * Standardized Loading State Components
 * Provides consistent loading indicators across the application
 */

export interface LoadingSpinnerProps {
  /** Size of spinner */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Color variant */
  variant?: 'primary' | 'white' | 'muted';
  /** Loading message */
  message?: string;
  /** Center in container */
  centered?: boolean;
  /** Full screen overlay */
  overlay?: boolean;
  /** Custom className */
  className?: string;
}

/**
 * Loading Spinner Component
 * Simple animated spinner for loading states
 */
export function LoadingSpinner({
  size = 'md',
  variant = 'primary',
  message,
  centered = false,
  overlay = false,
  className,
}: LoadingSpinnerProps) {
  const sizeMap = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12',
  };

  const colorMap = {
    primary: 'text-verus-blue',
    white: 'text-white',
    muted: 'text-gray-400 dark:text-slate-500',
  };

  const content = (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3',
        centered && 'min-h-[200px]',
        className
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className={cn('animate-spin', sizeMap[size], colorMap[variant])}>
        <CircleNotch className="h-full w-full" weight="bold" />
      </div>
      {message && (
        <p className="text-sm text-gray-600 dark:text-slate-400">{message}</p>
      )}
      <span className="sr-only">Loading</span>
    </div>
  );

  if (overlay) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        {content}
      </div>
    );
  }

  return content;
}

/**
 * Loading Skeleton Component
 * Placeholder for content while loading
 */
export interface LoadingSkeletonProps {
  /** Skeleton variant */
  variant?: 'text' | 'circular' | 'rectangular';
  /** Width */
  width?: string | number;
  /** Height */
  height?: string | number;
  /** Number of lines for text variant */
  lines?: number;
  /** Animation type */
  animation?: 'pulse' | 'wave' | 'none';
  /** Custom className */
  className?: string;
}

export function LoadingSkeleton({
  variant = 'rectangular',
  width,
  height,
  lines = 1,
  animation = 'pulse',
  className,
}: LoadingSkeletonProps) {
  const baseStyles = 'bg-gray-200 dark:bg-slate-700';

  const animationStyles = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer',
    none: '',
  };

  const variantStyles = {
    text: 'rounded h-4',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  if (variant === 'text' && lines > 1) {
    return (
      <div
        className={cn('space-y-2', className)}
        role="status"
        aria-label="Loading"
      >
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(
              baseStyles,
              variantStyles.text,
              animationStyles[animation]
            )}
            style={{
              width: i === lines - 1 ? '80%' : width || '100%',
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        baseStyles,
        variantStyles[variant],
        animationStyles[animation],
        className
      )}
      style={{
        width: width || (variant === 'circular' ? height : '100%'),
        height: height || (variant === 'text' ? '1rem' : '100%'),
      }}
      role="status"
      aria-label="Loading"
    />
  );
}

/**
 * Loading Card Skeleton
 * Pre-configured skeleton for card layouts
 */
export function LoadingCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('card-elevated p-6 space-y-4', className)}
      role="status"
      aria-label="Loading card"
    >
      <div className="flex items-center gap-3">
        <LoadingSkeleton variant="circular" width={48} height={48} />
        <div className="flex-1 space-y-2">
          <LoadingSkeleton variant="text" width="60%" />
          <LoadingSkeleton variant="text" width="40%" />
        </div>
      </div>
      <LoadingSkeleton variant="rectangular" height={120} />
      <div className="space-y-2">
        <LoadingSkeleton variant="text" />
        <LoadingSkeleton variant="text" />
        <LoadingSkeleton variant="text" width="80%" />
      </div>
    </div>
  );
}

/**
 * Loading Table Skeleton
 * Pre-configured skeleton for table layouts
 */
export function LoadingTableSkeleton({
  rows = 5,
  columns = 4,
  className,
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div
      className={cn('space-y-3', className)}
      role="status"
      aria-label="Loading table"
    >
      {/* Header */}
      <div className="flex gap-4 pb-3 border-b border-gray-200 dark:border-slate-700">
        {Array.from({ length: columns }).map((_, i) => (
          <LoadingSkeleton
            key={`header-${i}`}
            variant="text"
            width={`${100 / columns}%`}
          />
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="flex gap-4 py-3">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <LoadingSkeleton
              key={`cell-${rowIndex}-${colIndex}`}
              variant="text"
              width={`${100 / columns}%`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Loading Progress Bar
 * Shows progress for operations with known duration
 */
export interface LoadingProgressProps {
  /** Current progress (0-100) */
  progress: number;
  /** Show percentage text */
  showPercentage?: boolean;
  /** Progress label */
  label?: string;
  /** Color variant */
  variant?: 'primary' | 'success' | 'warning' | 'error';
  /** Size */
  size?: 'sm' | 'md' | 'lg';
  /** Custom className */
  className?: string;
}

export function LoadingProgress({
  progress,
  showPercentage = false,
  label,
  variant = 'primary',
  size = 'md',
  className,
}: LoadingProgressProps) {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  const sizeMap = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  const colorMap = {
    primary: 'bg-verus-blue',
    success: 'bg-verus-green',
    warning: 'bg-yellow-500',
    error: 'bg-verus-red',
  };

  return (
    <div
      className={cn('space-y-2', className)}
      role="progressbar"
      aria-valuenow={clampedProgress}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {(label || showPercentage) && (
        <div className="flex justify-between items-center text-sm">
          {label && (
            <span className="text-gray-700 dark:text-slate-300">{label}</span>
          )}
          {showPercentage && (
            <span className="font-medium text-gray-900 dark:text-slate-100">
              {Math.round(clampedProgress)}%
            </span>
          )}
        </div>
      )}
      <div
        className={cn(
          'w-full bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden',
          sizeMap[size]
        )}
      >
        <div
          className={cn(
            'h-full transition-all duration-300 ease-out rounded-full',
            colorMap[variant]
          )}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Loading Dots Component
 * Three-dot loading indicator
 */
export function LoadingDots({
  size = 'md',
  variant = 'primary',
  className,
}: {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'white' | 'muted';
  className?: string;
}) {
  const sizeMap = {
    sm: 'h-1.5 w-1.5',
    md: 'h-2 w-2',
    lg: 'h-3 w-3',
  };

  const colorMap = {
    primary: 'bg-verus-blue',
    white: 'bg-white',
    muted: 'bg-gray-400 dark:bg-slate-500',
  };

  return (
    <div
      className={cn('flex items-center gap-1.5', className)}
      role="status"
      aria-label="Loading"
    >
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className={cn('rounded-full', sizeMap[size], colorMap[variant])}
          style={{
            animation: 'pulse 1.4s ease-in-out infinite',
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
      <span className="sr-only">Loading</span>
    </div>
  );
}

/**
 * Inline Loading Component
 * Small loading indicator for inline use (buttons, etc.)
 */
export function InlineLoading({
  message,
  className,
}: {
  message?: string;
  className?: string;
}) {
  return (
    <span
      className={cn('inline-flex items-center gap-2', className)}
      role="status"
    >
      <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
      {message && <span className="text-sm">{message}</span>}
      <span className="sr-only">Loading</span>
    </span>
  );
}

/**
 * Loading Overlay Component
 * Semi-transparent overlay with loading indicator
 */
export interface LoadingOverlayProps {
  /** Show overlay */
  show: boolean;
  /** Loading message */
  message?: string;
  /** Progress value (optional) */
  progress?: number;
  /** Blur background */
  blur?: boolean;
  /** Custom className */
  className?: string;
}

export function LoadingOverlay({
  show,
  message = 'Loading...',
  progress,
  blur = true,
  className,
}: LoadingOverlayProps) {
  if (!show) return null;

  return (
    <div
      className={cn(
        'absolute inset-0 z-40 flex items-center justify-center',
        'bg-white/80 dark:bg-slate-900/80',
        blur && 'backdrop-blur-sm',
        className
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex flex-col items-center gap-4 p-6">
        <LoadingSpinner size="lg" variant="primary" />
        {message && (
          <p className="text-sm font-medium text-gray-700 dark:text-slate-300">
            {message}
          </p>
        )}
        {progress !== undefined && (
          <LoadingProgress
            progress={progress}
            showPercentage
            size="md"
            className="w-64"
          />
        )}
      </div>
    </div>
  );
}

/**
 * Loading State Container
 * Wrapper that shows loading state or content
 */
export interface LoadingStateProps {
  /** Loading state */
  loading: boolean;
  /** Loading component */
  loader?: React.ReactNode;
  /** Content to show when not loading */
  children: React.ReactNode;
  /** Minimum loading time (ms) - prevents flash */
  minLoadTime?: number;
}

export function LoadingState({
  loading,
  loader = <LoadingSpinner centered />,
  children,
}: LoadingStateProps) {
  if (loading) {
    return <>{loader}</>;
  }

  return <>{children}</>;
}
