'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { useTranslations } from 'next-intl';
import {
  X,
  CheckCircle,
  WarningCircle,
  Info,
  Warning,
  CircleNotch,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

/**
 * Toast Notification System
 * Provides contextual feedback for user actions with auto-dismiss and actions
 *
 * @example
 * ```tsx
 * const { toast } = useToast();
 *
 * toast.success('VerusID found!');
 * toast.error('Failed to load data', { action: { label: {tCommon("retry")}, onClick: retry } });
 * toast.loading('Searching...', searchPromise);
 * ```
 */

export type ToastVariant = 'success' | 'error' | 'warning' | 'info' | 'loading';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface Toast {
  id: string;
  variant: ToastVariant;
  message: string;
  description?: string;
  action?: ToastAction;
  duration?: number;
  dismissible?: boolean;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  toast: {
    success: (
      message: string,
      options?: Partial<Omit<Toast, 'id' | 'variant'>>
    ) => void;
    error: (
      message: string,
      options?: Partial<Omit<Toast, 'id' | 'variant'>>
    ) => void;
    warning: (
      message: string,
      options?: Partial<Omit<Toast, 'id' | 'variant'>>
    ) => void;
    info: (
      message: string,
      options?: Partial<Omit<Toast, 'id' | 'variant'>>
    ) => void;
    loading: (message: string, promise?: Promise<any>) => Promise<void>;
    promise: <T>(
      promise: Promise<T>,
      messages: {
        loading: string;
        success: string;
        error: string;
      }
    ) => Promise<T>;
  };
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function useToast() {
  const tCommon = useTranslations('common');
  const tVerusId = useTranslations('verusid');

  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

/**
 * Toast Provider Component
 * Wraps your app to enable toast notifications
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>): string => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: Toast = {
      id,
      duration: 5000, // Default 5 seconds
      dismissible: true,
      ...toast,
    };

    setToasts(prev => [...prev, newToast]);

    // Auto-dismiss after duration (unless loading)
    if (newToast.duration && newToast.variant !== 'loading') {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, newToast.duration);
    }

    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useMemo(
    () => ({
      success: (
        message: string,
        options: Partial<Omit<Toast, 'id' | 'variant'>> = {}
      ) => {
        addToast({ variant: 'success', message, duration: 3000, ...options });
      },

      error: (
        message: string,
        options: Partial<Omit<Toast, 'id' | 'variant'>> = {}
      ) => {
        addToast({ variant: 'error', message, duration: 5000, ...options });
      },

      warning: (
        message: string,
        options: Partial<Omit<Toast, 'id' | 'variant'>> = {}
      ) => {
        addToast({ variant: 'warning', message, duration: 4000, ...options });
      },

      info: (
        message: string,
        options: Partial<Omit<Toast, 'id' | 'variant'>> = {}
      ) => {
        addToast({ variant: 'info', message, duration: 4000, ...options });
      },

      loading: async (message: string, promise?: Promise<any>) => {
        const id = addToast({
          variant: 'loading',
          message,
          duration: 0,
          dismissible: false,
        });

        if (promise) {
          try {
            await promise;
            removeToast(id);
          } catch (error) {
            removeToast(id);
          }
        }
      },

      promise: async <T,>(
        promise: Promise<T>,
        messages: {
          loading: string;
          success: string;
          error: string;
        }
      ): Promise<T> => {
        const id = addToast({
          variant: 'loading',
          message: messages.loading,
          duration: 0,
          dismissible: false,
        });

        try {
          const result = await promise;
          removeToast(id);
          addToast({
            variant: 'success',
            message: messages.success,
            duration: 3000,
          });
          return result;
        } catch (error) {
          removeToast(id);
          addToast({
            variant: 'error',
            message: messages.error,
            duration: 5000,
          });
          throw error;
        }
      },
    }),
    [addToast, removeToast]
  );

  const value: ToastContextValue = {
    toasts,
    addToast,
    removeToast,
    toast,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

/**
 * Toast Container Component
 * Renders all active toasts
 */
interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div
      className="fixed bottom-0 right-0 z-50 p-4 md:p-6 flex flex-col gap-3 max-w-md w-full pointer-events-none"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map(toast => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onRemove={() => onRemove(toast.id)}
        />
      ))}
    </div>
  );
}

/**
 * Individual Toast Item Component
 */
interface ToastItemProps {
  toast: Toast;
  onRemove: () => void;
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const variantConfig = {
    success: {
      icon: <CheckCircle className="h-5 w-5" />,
      className: 'bg-green-900 border-green-500 text-green-100',
      iconColor: 'text-green-400',
    },
    error: {
      icon: <WarningCircle className="h-5 w-5" />,
      className: 'bg-red-900 border-red-500 text-red-100',
      iconColor: 'text-red-400',
    },
    warning: {
      icon: <Warning className="h-5 w-5" />,
      className: 'bg-yellow-900 border-yellow-500 text-yellow-100',
      iconColor: 'text-verus-teal',
    },
    info: {
      icon: <Info className="h-5 w-5" />,
      className: 'bg-blue-900 border-blue-500 text-blue-100',
      iconColor: 'text-blue-400',
    },
    loading: {
      icon: <CircleNotch className="h-5 w-5 animate-spin" />,
      className: 'bg-white dark:bg-slate-900 border-slate-500 text-slate-100',
      iconColor: 'text-slate-400',
    },
  };

  const config = variantConfig[toast.variant];

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 rounded-lg border shadow-lg backdrop-blur-sm',
        'pointer-events-auto',
        'animate-in slide-in-from-right duration-300',
        config.className
      )}
      role="alert"
      aria-live={toast.variant === 'error' ? 'assertive' : 'polite'}
    >
      {/* Icon */}
      <div className={cn('flex-shrink-0 mt-0.5', config.iconColor)}>
        {config.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">{toast.message}</p>
        {toast.description && (
          <p className="text-xs mt-1 opacity-90">{toast.description}</p>
        )}

        {/* Action Button */}
        {toast.action && (
          <button
            onClick={() => {
              toast.action!.onClick();
              onRemove();
            }}
            className="mt-2 text-xs font-medium underline hover:no-underline"
          >
            {toast.action.label}
          </button>
        )}
      </div>

      {/* Dismiss Button */}
      {toast.dismissible && (
        <button
          onClick={onRemove}
          className="flex-shrink-0 p-1 hover:bg-white/10 rounded transition-colors"
          aria-label="Dismiss notification"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

/**
 * Legacy toast hook for backward compatibility
 * Matches existing useToast interface
 */
export function useLegacyToast() {
  const { toast: toastMethods } = useToast();
  return toastMethods;
}
