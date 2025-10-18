'use client';

import { useEffect } from 'react';
import { WarningCircle, ArrowsClockwise } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error);
  }, [error]);

  const handleGoBack = () => {
    // Check if there's history to go back to
    if (window.history.length > 1) {
      router.back();
    } else {
      // Fallback to home if no history
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-verus-blue/20 to-verus-green/20">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 text-center">
          <div className="flex justify-center mb-6">
            <div className="p-4 rounded-full bg-red-500/20">
              <WarningCircle className="h-12 w-12 text-red-400" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-white mb-4">
            Something went wrong!
          </h1>

          <p className="text-blue-200 mb-6">
            We encountered an unexpected error. This might be a temporary issue.
          </p>

          {process.env.NODE_ENV === 'development' && (
            <details className="mb-6 text-left">
              <summary className="text-blue-300 cursor-pointer mb-2">
                Error Details (Development)
              </summary>
              <pre className="bg-black/20 p-3 rounded text-xs text-red-300 overflow-auto">
                {error.message}
                {error.stack && `\n\n${error.stack}`}
              </pre>
            </details>
          )}

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={reset}
              className="flex items-center justify-center space-x-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors text-white font-medium"
            >
              <ArrowsClockwise className="h-4 w-4" />
              <span>Try Again</span>
            </button>

            <button
              onClick={handleGoBack}
              className="flex items-center justify-center space-x-2 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-white font-medium"
            >
              <span>Go Back</span>
            </button>
          </div>

          <div className="mt-6 text-xs text-blue-300">
            Error ID: {error.digest || 'unknown'}
          </div>
        </div>
      </div>
    </div>
  );
}
