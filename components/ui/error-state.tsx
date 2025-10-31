'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import {
  XCircle,
  WarningCircle,
  Info,
  CheckCircle,
  ArrowClockwise
} from '@phosphor-icons/react';
import { Button } from './button';

/**
 * Standardized Error State Components
 * Provides consistent error handling and user feedback
 */

export interface ErrorStateProps {
  /** Error title */
  title?: string;
  /** Error message */
  message: string;
  /** Error type */
  type?: 'error' | 'warning' | 'info' | 'success';
  /** Show retry button */
  showRetry?: boolean;
  /** Retry callback */
  onRetry?: () => void;
  /** Additional action button */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Show as inline (compact) */
  inline?: boolean;
  /** Custom icon */
  icon?: React.ReactNode;
  /** Custom className */
  className?: string;
}

/**
 * Error State Component
 * Displays error messages with optional retry functionality
 */
export function ErrorState({
  title,
  message,
  type = 'error',
  showRetry = false,
  onRetry,
  action,
  inline = false,
  icon,
  className,
}: ErrorStateProps) {
  const tCommon = useTranslations('common');
  const icons = {
    error: <XCircle className="h-12 w-12" weight="fill" />,
    warning: <WarningCircle className="h-12 w-12" weight="fill" />,
    info: <Info className="h-12 w-12" weight="fill" />,
    success: <CheckCircle className="h-12 w-12" weight="fill" />,
  };

  const colors = {
    error: {
      icon: 'text-verus-red',
      bg: 'bg-red-50 dark:bg-red-900/10',
      border: 'border-verus-red/20',
      title: 'text-verus-red',
      text: 'text-red-700 dark:text-red-400',
    },
    warning: {
      icon: 'text-yellow-500',
      bg: 'bg-yellow-50 dark:bg-yellow-900/10',
      border: 'border-yellow-500/20',
      title: 'text-yellow-700 dark:text-yellow-500',
      text: 'text-yellow-700 dark:text-yellow-400',
    },
    info: {
      icon: 'text-verus-blue',
      bg: 'bg-blue-50 dark:bg-blue-900/10',
      border: 'border-verus-blue/20',
      title: 'text-verus-blue',
      text: 'text-blue-700 dark:text-blue-400',
    },
    success: {
      icon: 'text-verus-green',
      bg: 'bg-green-50 dark:bg-green-900/10',
      border: 'border-verus-green/20',
      title: 'text-verus-green',
      text: 'text-green-700 dark:text-green-400',
    },
  };

  const color = colors[type];

  if (inline) {
    return (
      <div
        className={cn(
          'flex items-start gap-3 p-4 rounded-lg border',
          color.bg,
          color.border,
          className
        )}
        role="alert"
      >
        <div className={cn('flex-shrink-0 mt-0.5', color.icon)}>
          {icon || <div className="h-5 w-5">{icons[type]}</div>}
        </div>
        <div className="flex-1 min-w-0">
          {title && (
            <h4 className={cn('font-semibold mb-1', color.title)}>
              {title}
            </h4>
          )}
          <p className={cn('text-sm', color.text)}>
            {message}
          </p>
        </div>
        {(showRetry || action) && (
          <div className="flex-shrink-0 flex gap-2">
            {showRetry && onRetry && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRetry}
                icon={<ArrowClockwise className="h-4 w-4" />}
                aria-label={tCommon("retry")}
              />
            )}
            {action && (
              <Button
                variant="ghost"
                size="sm"
                onClick={action.onClick}
              >
                {action.label}
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center p-8 rounded-lg border',
        color.bg,
        color.border,
        className
      )}
      role="alert"
    >
      <div className={cn('mb-4', color.icon)}>
        {icon || icons[type]}
      </div>

      {title && (
        <h3 className={cn('text-lg font-semibold mb-2', color.title)}>
          {title}
        </h3>
      )}

      <p className={cn('text-sm mb-4 max-w-md', color.text)}>
        {message}
      </p>

      {(showRetry || action) && (
        <div className="flex gap-3">
          {showRetry && onRetry && (
            <Button
              variant={type === 'error' ? 'danger' : 'primary'}
              onClick={onRetry}
              icon={<ArrowClockwise className="h-4 w-4" />}
            >
              Try Again
            </Button>
          )}
          {action && (
            <Button
              variant="secondary"
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Empty State Component
 * Shows when no data is available
 */
export interface EmptyStateProps {
  /** Icon to display */
  icon?: React.ReactNode;
  /** Title */
  title: string;
  /** Description */
  description?: string;
  /** Call-to-action button */
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  };
  /** Custom className */
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center p-12',
        'bg-gray-50 dark:bg-slate-900/50',
        'border-2 border-dashed border-gray-200 dark:border-slate-700',
        'rounded-lg',
        className
      )}
    >
      {icon && (
        <div className="mb-4 text-gray-400 dark:text-slate-500">
          {icon}
        </div>
      )}

      <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2">
        {title}
      </h3>

      {description && (
        <p className="text-sm text-gray-500 dark:text-slate-400 mb-4 max-w-md">
          {description}
        </p>
      )}

      {action && (
        <Button
          variant={action.variant || 'primary'}
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}

/**
 * Alert Component
 * In-page notifications and alerts
 */
export interface AlertProps {
  /** Alert type */
  variant?: 'error' | 'warning' | 'info' | 'success';
  /** Alert title */
  title?: string;
  /** Alert message */
  children: React.ReactNode;
  /** Show close button */
  dismissible?: boolean;
  /** Close callback */
  onClose?: () => void;
  /** Custom icon */
  icon?: React.ReactNode;
  /** Custom className */
  className?: string;
}

export function Alert({
  variant = 'info',
  title,
  children,
  dismissible = false,
  onClose,
  icon,
  className,
}: AlertProps) {
  const icons = {
    error: <XCircle className="h-5 w-5" weight="fill" />,
    warning: <WarningCircle className="h-5 w-5" weight="fill" />,
    info: <Info className="h-5 w-5" weight="fill" />,
    success: <CheckCircle className="h-5 w-5" weight="fill" />,
  };

  const styles = {
    error: 'bg-red-50 dark:bg-red-900/10 border-verus-red/20 text-red-800 dark:text-red-400',
    warning: 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-500/20 text-yellow-800 dark:text-yellow-400',
    info: 'bg-blue-50 dark:bg-blue-900/10 border-verus-blue/20 text-blue-800 dark:text-blue-400',
    success: 'bg-green-50 dark:bg-green-900/10 border-verus-green/20 text-green-800 dark:text-green-400',
  };

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 rounded-lg border',
        styles[variant],
        className
      )}
      role="alert"
    >
      <div className="flex-shrink-0 mt-0.5">
        {icon || icons[variant]}
      </div>

      <div className="flex-1 min-w-0">
        {title && (
          <h4 className="font-semibold mb-1">
            {title}
          </h4>
        )}
        <div className="text-sm">
          {children}
        </div>
      </div>

      {dismissible && (
        <button
          onClick={onClose}
          className="flex-shrink-0 hover:opacity-70 transition-opacity"
          aria-label="Close alert"
        >
          <XCircle className="h-5 w-5" weight="fill" />
        </button>
      )}
    </div>
  );
}

/**
 * Validation Message Component
 * Shows validation feedback for forms
 */
export interface ValidationMessageProps {
  /** Validation state */
  type: 'error' | 'warning' | 'success' | 'info';
  /** Message */
  message: string;
  /** Custom className */
  className?: string;
}

export function ValidationMessage({
  type,
  message,
  className,
}: ValidationMessageProps) {
  const icons = {
    error: <XCircle className="h-4 w-4" weight="fill" />,
    warning: <WarningCircle className="h-4 w-4" weight="fill" />,
    success: <CheckCircle className="h-4 w-4" weight="fill" />,
    info: <Info className="h-4 w-4" weight="fill" />,
  };

  const colors = {
    error: 'text-verus-red',
    warning: 'text-yellow-600 dark:text-yellow-500',
    success: 'text-verus-green',
    info: 'text-verus-blue',
  };

  return (
    <p
      className={cn(
        'flex items-center gap-1.5 text-sm',
        colors[type],
        className
      )}
      role={type === 'error' ? 'alert' : 'status'}
    >
      {icons[type]}
      <span>{message}</span>
    </p>
  );
}


