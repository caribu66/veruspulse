'use client';

import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { Warning, ArrowsClockwise, House } from '@phosphor-icons/react';
import { useTranslations } from 'next-intl';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-100 to-slate-100 dark:from-slate-900 dark:via-blue-900 dark:to-slate-900 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white/80 dark:bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-gray-300 dark:border-white/20">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-6">
                <Warning className="h-8 w-8 text-red-400" />
              </div>

              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Something went wrong
              </h1>

              <p className="text-blue-600 dark:text-blue-200 mb-6">
                VerusPulse encountered an unexpected error. This might be due to
                a network issue or a temporary problem.
              </p>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="mb-6 p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                  <h3 className="text-red-400 font-semibold mb-2">
                    Error Details:
                  </h3>
                  <pre className="text-red-700 dark:text-red-200 text-sm overflow-auto">
                    {this.state.error.toString()}
                  </pre>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={this.handleReset}
                  className="flex items-center justify-center space-x-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
                >
                  <ArrowsClockwise className="h-4 w-4" />
                  <span>Try Again</span>
                </button>

                <button
                  onClick={() => {
                    // Use native history back for class components
                    // since we can't use hooks here
                    window.history.back();
                  }}
                  className="flex items-center justify-center space-x-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg transition-colors"
                >
                  <House className="h-4 w-4" />
                  <span>Go Back</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for functional components
export function useErrorHandler() {
  return (error: Error, errorInfo?: any) => {
    console.error('Error caught by useErrorHandler:', error, errorInfo);
    // You can add additional error reporting here (e.g., Sentry)
  };
}
