'use client';

import React, { type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import {
  Warning,
  WarningCircle,
  Info,
  ArrowsClockwise,
  ArrowLeft,
  Question,
  ArrowSquareOut,
} from '@phosphor-icons/react';
import { Button, ButtonGroup } from '@/components/ui/button';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * Contextual Error Handling System
 * Provides smart error classification and recovery strategies
 */

export type ErrorType =
  | 'NETWORK_ERROR'
  | 'API_ERROR'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'TIMEOUT_ERROR'
  | 'PERMISSION_ERROR'
  | 'SERVER_ERROR'
  | 'UNKNOWN_ERROR';

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export type ErrorAction =
  | 'retry'
  | 'refresh'
  | 'go-back'
  | 'search-again'
  | 'contact-support'
  | 'check-status'
  | 'go-home';

export interface ErrorInfo {
  type: ErrorType;
  severity: ErrorSeverity;
  title: string;
  message: string;
  actions: ErrorAction[];
  technicalDetails?: string;
  icon?: ReactNode;
}

export interface ErrorConfig {
  title: string;
  message: string;
  actions: ErrorAction[];
  severity: ErrorSeverity;
  icon: ReactNode;
}

/**
 * Error message configuration
 */
export const ERROR_MESSAGES: Record<ErrorType, ErrorConfig> = {
  NETWORK_ERROR: {
    title: 'Connection Error',
    message:
      'Unable to connect to the Verus network. Please check your internet connection and try again.',
    actions: ['retry', 'check-status', 'refresh'],
    severity: 'high',
    icon: <Warning className="h-12 w-12" />,
  },
  API_ERROR: {
    title: 'Service Temporarily Unavailable',
    message:
      'The Verus API is experiencing issues. This usually resolves quickly. Please try again in a few moments.',
    actions: ['retry', 'refresh', 'contact-support'],
    severity: 'medium',
    icon: <WarningCircle className="h-12 w-12" />,
  },
  NOT_FOUND: {
    title: 'Not Found',
    message:
      "The VerusID, address, block, or transaction you're looking for doesn't exist or hasn't been synced yet.",
    actions: ['go-back', 'search-again', 'go-home'],
    severity: 'low',
    icon: <Info className="h-12 w-12" />,
  },
  VALIDATION_ERROR: {
    title: 'Invalid Input',
    message:
      'The information you entered is not in the correct format. Please check and try again.',
    actions: ['go-back'],
    severity: 'low',
    icon: <Info className="h-12 w-12" />,
  },
  TIMEOUT_ERROR: {
    title: 'Request Timeout',
    message:
      'The request took too long to complete. The network might be slow or experiencing high traffic.',
    actions: ['retry', 'refresh'],
    severity: 'medium',
    icon: <WarningCircle className="h-12 w-12" />,
  },
  PERMISSION_ERROR: {
    title: 'Access Denied',
    message:
      "You don't have permission to access this resource. Authentication may be required.",
    actions: ['go-back', 'go-home'],
    severity: 'medium',
    icon: <WarningCircle className="h-12 w-12" />,
  },
  SERVER_ERROR: {
    title: 'HardDrives Error',
    message:
      'An unexpected error occurred on the server. Our team has been notified.',
    actions: ['retry', 'contact-support', 'go-home'],
    severity: 'high',
    icon: <Warning className="h-12 w-12" />,
  },
  UNKNOWN_ERROR: {
    title: 'Unexpected Error',
    message:
      'Something unexpected happened. Please try again or contact support if the problem persists.',
    actions: ['retry', 'refresh', 'go-home'],
    severity: 'medium',
    icon: <WarningCircle className="h-12 w-12" />,
  },
};

/**
 * Classify error into appropriate error type
 */
export function classifyError(error: any): ErrorInfo {
  // Network errors
  if (
    error?.message?.includes('fetch') ||
    error?.message?.includes('network') ||
    error?.code === 'ECONNREFUSED' ||
    error?.name === 'NetworkError'
  ) {
    return {
      type: 'NETWORK_ERROR',
      ...ERROR_MESSAGES.NETWORK_ERROR,
      technicalDetails: error?.message,
    };
  }

  // API errors (status codes)
  if (error?.status || error?.response?.status) {
    const status = error.status || error.response.status;

    if (status === 404) {
      return {
        type: 'NOT_FOUND',
        ...ERROR_MESSAGES.NOT_FOUND,
        technicalDetails: error?.message || error?.response?.data?.message,
      };
    }

    if (status === 403 || status === 401) {
      return {
        type: 'PERMISSION_ERROR',
        ...ERROR_MESSAGES.PERMISSION_ERROR,
        technicalDetails: error?.message || error?.response?.data?.message,
      };
    }

    if (status >= 500) {
      return {
        type: 'SERVER_ERROR',
        ...ERROR_MESSAGES.SERVER_ERROR,
        technicalDetails: error?.message || error?.response?.data?.message,
      };
    }

    if (status >= 400) {
      return {
        type: 'API_ERROR',
        ...ERROR_MESSAGES.API_ERROR,
        technicalDetails: error?.message || error?.response?.data?.message,
      };
    }
  }

  // Timeout errors
  if (
    error?.message?.includes('timeout') ||
    error?.code === 'ETIMEDOUT' ||
    error?.name === 'TimeoutError'
  ) {
    return {
      type: 'TIMEOUT_ERROR',
      ...ERROR_MESSAGES.TIMEOUT_ERROR,
      technicalDetails: error?.message,
    };
  }

  // Validation errors
  if (
    error?.message?.includes('invalid') ||
    error?.message?.includes('validation') ||
    error?.name === 'ValidationError'
  ) {
    return {
      type: 'VALIDATION_ERROR',
      ...ERROR_MESSAGES.VALIDATION_ERROR,
      technicalDetails: error?.message,
    };
  }

  // Default to unknown error
  return {
    type: 'UNKNOWN_ERROR',
    ...ERROR_MESSAGES.UNKNOWN_ERROR,
    technicalDetails: error?.message || String(error),
  };
}

/**
 * Smart Error Display Component
 * Renders contextual error UI with recovery actions
 */
export interface SmartErrorProps {
  error: any;
  onRetry?: () => void;
  onBack?: () => void;
  className?: string;
}

export function SmartError({
  error,
  onRetry,
  onBack,
  className,
}: SmartErrorProps) {
  const t = useTranslations('errors');
  const errorInfo = classifyError(error);

  // Get translated error messages
  const getErrorTitle = (type: ErrorType): string => {
    const titles: Record<ErrorType, string> = {
      NETWORK_ERROR: t('connectionError'),
      API_ERROR: t('apiError'),
      NOT_FOUND: t('notFound'),
      VALIDATION_ERROR: t('validationError'),
      TIMEOUT_ERROR: t('timeoutError'),
      PERMISSION_ERROR: t('permissionError'),
      SERVER_ERROR: t('serverError'),
      UNKNOWN_ERROR: t('unknownError'),
    };
    return titles[type];
  };

  const getErrorMessage = (type: ErrorType): string => {
    const messages: Record<ErrorType, string> = {
      NETWORK_ERROR: t('connectionErrorMessage'),
      API_ERROR: t('apiErrorMessage'),
      NOT_FOUND: t('notFoundMessage'),
      VALIDATION_ERROR: t('validationErrorMessage'),
      TIMEOUT_ERROR: t('timeoutErrorMessage'),
      PERMISSION_ERROR: t('permissionErrorMessage'),
      SERVER_ERROR: t('serverErrorMessage'),
      UNKNOWN_ERROR: t('unknownErrorMessage'),
    };
    return messages[type];
  };

  const severityColors = {
    low: 'text-blue-400',
    medium: 'text-yellow-400',
    high: 'text-orange-400',
    critical: 'text-red-400',
  };

  const handleAction = (action: ErrorAction) => {
    switch (action) {
      case 'retry':
        onRetry?.();
        break;
      case 'refresh':
        window.location.reload();
        break;
      case 'go-back':
        onBack ? onBack() : window.history.back();
        break;
      case 'search-again':
        onBack?.();
        break;
      case 'go-home':
        window.location.href = '/';
        break;
      case 'check-status':
        window.open('https://status.verus.io', '_blank');
        break;
      case 'contact-support':
        // Open support modal or email
        window.location.href = 'mailto:support@verus.io';
        break;
    }
  };

  const getActionLabel = (action: ErrorAction): string => {
    const labels: Record<ErrorAction, string> = {
      retry: t('tryAgain'),
      refresh: t('refreshPage'),
      'go-back': t('goBack'),
      'search-again': t('searchAgain'),
      'contact-support': t('contactSupport'),
      'check-status': t('checkNetworkStatus'),
      'go-home': t('goHome'),
    };
    return labels[action];
  };

  const getActionIcon = (action: ErrorAction): ReactNode => {
    const icons: Record<ErrorAction, ReactNode> = {
      retry: <ArrowsClockwise className="h-4 w-4" />,
      refresh: <ArrowsClockwise className="h-4 w-4" />,
      'go-back': <ArrowLeft className="h-4 w-4" />,
      'search-again': <ArrowLeft className="h-4 w-4" />,
      'contact-support': <Question className="h-4 w-4" />,
      'check-status': <ArrowSquareOut className="h-4 w-4" />,
      'go-home': <ArrowLeft className="h-4 w-4" />,
    };
    return icons[action];
  };

  const getActionVariant = (
    action: ErrorAction
  ): 'primary' | 'secondary' | 'ghost' => {
    if (action === 'retry' || action === 'refresh') return 'primary';
    if (action === 'go-back' || action === 'search-again') return 'secondary';
    return 'ghost';
  };

  return (
    <div className={cn('flex items-center justify-center p-6', className)}>
      <Card variant="outlined" className="max-w-2xl w-full">
        <CardContent className="p-8">
          {/* Icon */}
          <div
            className={cn(
              'mx-auto w-16 h-16 flex items-center justify-center mb-6',
              severityColors[errorInfo.severity]
            )}
          >
            {errorInfo.icon}
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-white text-center mb-3">
            {getErrorTitle(errorInfo.type)}
          </h2>

          {/* Message */}
          <p className="text-gray-300 text-center mb-6 leading-relaxed">
            {getErrorMessage(errorInfo.type)}
          </p>

          {/* Actions */}
          <ButtonGroup
            orientation="horizontal"
            className="justify-center flex-wrap"
          >
            {errorInfo.actions.map(action => (
              <Button
                key={action}
                variant={getActionVariant(action)}
                onClick={() => handleAction(action)}
                icon={getActionIcon(action)}
              >
                {getActionLabel(action)}
              </Button>
            ))}
          </ButtonGroup>

          {/* Technical Details (development only) */}
          {process.env.NODE_ENV === 'development' &&
            errorInfo.technicalDetails && (
              <details className="mt-6 p-4 bg-black/20 rounded-lg">
                <summary className="text-sm text-gray-400 cursor-pointer hover:text-white transition-colors">
                  Technical Details (dev only)
                </summary>
                <pre className="text-xs text-red-300 mt-3 overflow-auto">
                  {errorInfo.technicalDetails}
                </pre>
                {error?.stack && (
                  <pre className="text-xs text-gray-500 mt-2 overflow-auto">
                    {error.stack}
                  </pre>
                )}
              </details>
            )}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Inline Error Component
 * Smaller error display for inline use
 */
export interface InlineErrorProps {
  error: any;
  onRetry?: () => void;
  className?: string;
}

export function InlineError({ error, onRetry, className }: InlineErrorProps) {
  const errorInfo = classifyError(error);

  return (
    <div
      className={cn(
        'bg-red-900/20 border border-red-500/30 rounded-lg p-4',
        className
      )}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <WarningCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-red-300">
            {errorInfo.title}
          </p>
          <p className="text-xs text-red-200 mt-1">{errorInfo.message}</p>
        </div>
        {onRetry && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRetry}
            icon={<ArrowsClockwise className="h-3 w-3" />}
            className="flex-shrink-0"
          >
            Retry
          </Button>
        )}
      </div>
    </div>
  );
}
