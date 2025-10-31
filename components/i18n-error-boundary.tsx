/**
 * i18n Error Boundary
 * Handles translation errors gracefully
 */

'use client';

import { Component, type ReactNode } from 'react';
import { WarningCircle } from '@phosphor-icons/react';
import { useTranslations } from 'next-intl';

interface Props {
  children: ReactNode;
  fallbackLocale?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class I18nErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: any) {
    console.error('i18n Error:', error, errorInfo);
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
          <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-200 dark:border-slate-700">
            <div className="flex items-start space-x-4">
              <WarningCircle className="h-6 w-6 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Translation Error
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                  There was an error loading translations. The application will
                  continue with default language.
                </p>
                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <pre className="text-xs bg-slate-100 dark:bg-slate-900 p-3 rounded overflow-auto">
                    {this.state.error.message}
                  </pre>
                )}
                <button
                  onClick={() => window.location.reload()}
                  className="mt-4 w-full px-4 py-2 bg-verus-blue text-white rounded-lg hover:bg-verus-blue/90 transition-colors"
                >
                  Reload Page
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
