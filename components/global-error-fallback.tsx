'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import {
  Warning,
  ArrowsClockwise,
  House,
  Bug,
  ArrowSquareOut,
} from '@phosphor-icons/react';
import { useNavigationHistory } from '@/lib/hooks/use-navigation-history';

export function GlobalErrorFallback() {
  const { goBack } = useNavigationHistory();

  const handleReload = () => {
    window.location.reload();
  };

  const handleReportBug = () => {
    // In a real app, this would open a bug report form or redirect to GitHub issues
    const bugReportUrl = 'https://github.com/veruscoin/verus-explorer/issues';
    window.open(bugReportUrl, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-100 to-slate-100 dark:from-slate-900 dark:via-blue-900 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white/80 dark:bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-gray-300 dark:border-white/20">
        <div className="text-center">
          <div className="mx-auto w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-6">
            <Warning className="h-10 w-10 text-red-400" />
          </div>

          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Oops! Something went wrong
          </h1>

          <p className="text-blue-600 dark:text-blue-200 mb-6 leading-relaxed">
            VerusPulse encountered an unexpected error. This might be due to a
            network issue, a temporary problem, or a bug in the application.
          </p>

          <div className="space-y-3 mb-8">
            <div className="bg-white/5 rounded-lg p-4 text-left">
              <h3 className="text-white font-semibold mb-2 flex items-center">
                <Bug className="h-4 w-4 mr-2" />
                What you can try:
              </h3>
              <ul className="text-blue-200 text-sm space-y-1">
                <li>• Refresh the page to reload the application</li>
                <li>• Check your internet connection</li>
                <li>• Try again in a few moments</li>
                <li>• Clear your browser cache if the problem persists</li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleReload}
              className="flex items-center justify-center space-x-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <ArrowsClockwise className="h-4 w-4" />
              <span>Reload Page</span>
            </button>

            <button
              onClick={() => goBack()}
              className="flex items-center justify-center space-x-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-white/20"
            >
              <House className="h-4 w-4" />
              <span>Go Back</span>
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-white/10">
            <button
              onClick={handleReportBug}
              className="flex items-center justify-center space-x-2 text-blue-400 hover:text-blue-300 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50 rounded"
            >
              <ArrowSquareOut className="h-4 w-4" />
              <span>Report this issue</span>
            </button>
          </div>

          {process.env.NODE_ENV === 'development' && (
            <div className="mt-6 p-4 bg-red-500/10 rounded-lg border border-red-500/20">
              <h3 className="text-red-400 font-semibold mb-2">
                Development Mode
              </h3>
              <p className="text-red-200 text-sm">
                Check the browser console for detailed error information.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
