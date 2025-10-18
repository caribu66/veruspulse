'use client';

import { useState } from 'react';
import { VerusIDLoadingWithSync } from '@/components/verusid-loading-with-sync';
import {
  VerusIDLoadingState,
  SimpleVerusIDLoading,
  VerusIDErrorState,
} from '@/components/verusid-loading-state';

export default function LoadingTestPage() {
  const [testMode, setTestMode] = useState<
    'auto-sync' | 'loading' | 'simple' | 'error'
  >('auto-sync');
  const [errorMessage, setErrorMessage] = useState('Statistics not found');

  const handleSyncComplete = () => {
    console.log('Sync completed successfully!');
  };

  const handleSyncError = (error: string) => {
    console.error('Sync error:', error);
  };

  const handleRetry = () => {
    console.log('Retry clicked');
  };

  return (
    <div className="min-h-screen theme-bg-primary p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold theme-text-primary mb-4">
            VerusID Loading States Test
          </h1>
          <p className="theme-text-secondary text-lg">
            Test the new loading states and auto-sync functionality
          </p>
        </div>

        {/* Test Controls */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 mb-8">
          <h2 className="text-xl font-semibold theme-text-primary mb-4">
            Test Controls
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={() => setTestMode('auto-sync')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                testMode === 'auto-sync'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white/10 text-blue-200 hover:bg-white/20'
              }`}
            >
              Auto Sync
            </button>
            <button
              onClick={() => setTestMode('loading')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                testMode === 'loading'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white/10 text-blue-200 hover:bg-white/20'
              }`}
            >
              Loading State
            </button>
            <button
              onClick={() => setTestMode('simple')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                testMode === 'simple'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white/10 text-blue-200 hover:bg-white/20'
              }`}
            >
              Simple Loading
            </button>
            <button
              onClick={() => setTestMode('error')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                testMode === 'error'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white/10 text-blue-200 hover:bg-white/20'
              }`}
            >
              Error State
            </button>
          </div>

          {testMode === 'error' && (
            <div className="mt-4">
              <label className="block text-sm font-medium theme-text-secondary mb-2">
                Error Message:
              </label>
              <input
                type="text"
                value={errorMessage}
                onChange={e => setErrorMessage(e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg theme-text-primary placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter error message..."
              />
            </div>
          )}
        </div>

        {/* Test Results */}
        <div className="space-y-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <h2 className="text-xl font-semibold theme-text-primary mb-4">
              Test Result:{' '}
              {testMode.charAt(0).toUpperCase() +
                testMode.slice(1).replace('-', ' ')}{' '}
              State
            </h2>

            {/* Auto Sync Component */}
            {testMode === 'auto-sync' && (
              <VerusIDLoadingWithSync
                verusID="allbits.VRSC@"
                iaddr="iCSq1EkHys1vyxdPpzgJHJqHcjrxkHH6jc"
                onSyncComplete={handleSyncComplete}
                onSyncError={handleSyncError}
              />
            )}

            {/* Loading State Component */}
            {testMode === 'loading' && (
              <VerusIDLoadingState
                verusID="allbits.VRSC@"
                iaddr="iCSq1EkHys1vyxdPpzgJHJqHcjrxkHH6jc"
                message="Loading comprehensive staking statistics and UTXO analytics..."
                onRetry={handleRetry}
                showRetryButton={true}
              />
            )}

            {/* Simple Loading Component */}
            {testMode === 'simple' && (
              <SimpleVerusIDLoading message="Loading VerusID data..." />
            )}

            {/* Error State Component */}
            {testMode === 'error' && (
              <VerusIDErrorState
                error={errorMessage}
                onRetry={handleRetry}
                verusID="allbits.VRSC@"
                iaddr="iCSq1EkHys1vyxdPpzgJHJqHcjrxkHH6jc"
              />
            )}
          </div>

          {/* Instructions */}
          <div className="bg-blue-500/10 backdrop-blur-sm rounded-2xl p-6 border border-blue-500/20">
            <h3 className="text-lg font-semibold text-blue-400 mb-3">
              Instructions
            </h3>
            <div className="space-y-2 theme-text-secondary text-sm">
              <p>
                <strong>Auto Sync:</strong> Shows the full auto-sync experience
                with real progress tracking
              </p>
              <p>
                <strong>Loading State:</strong> Shows a comprehensive loading
                state with retry option
              </p>
              <p>
                <strong>Simple Loading:</strong> Shows a minimal loading
                indicator
              </p>
              <p>
                <strong>Error State:</strong> Shows error handling with
                customizable error message
              </p>
            </div>
          </div>

          {/* Component Info */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold theme-text-primary mb-3">
              Component Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm theme-text-muted">
              <div>
                <h4 className="font-semibold text-blue-300 mb-2">
                  Auto Sync Component
                </h4>
                <ul className="space-y-1">
                  <li>• Automatically triggers sync when data not found</li>
                  <li>• Real-time progress tracking</li>
                  <li>• Beautiful animations and progress bars</li>
                  <li>• Error handling with retry</li>
                  <li>• Estimated time remaining</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-blue-300 mb-2">
                  Loading States
                </h4>
                <ul className="space-y-1">
                  <li>• Multiple loading state variants</li>
                  <li>• Consistent design language</li>
                  <li>• Retry functionality</li>
                  <li>• Responsive design</li>
                  <li>• Accessibility support</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
