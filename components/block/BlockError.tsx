'use client';

import { WarningCircle, ArrowsClockwise, House } from '@phosphor-icons/react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

interface BlockErrorProps {
  error: string;
  onRetry?: () => void;
  blockHash?: string;
}

export function BlockError({
  error,
  onRetry,
  blockHash,
}: BlockErrorProps) {
  const tCommon = useTranslations('common');
  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 text-white">
      <div className="bg-gray-900 border border-gray-600 rounded-xl w-full mx-auto max-w-4xl p-6 shadow-2xl">
        <div className="text-center py-12">
          <div className="flex justify-center mb-6">
            <div className="bg-red-500/10 border border-red-500/20 rounded-full p-4">
              <WarningCircle className="h-12 w-12 text-red-400" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-white mb-4">
            Block Not Found
          </h2>

          <div className="text-gray-400 mb-6 max-w-md mx-auto">
            {error || 'The requested block could not be found or is invalid.'}
          </div>

          {blockHash && (
            <div className="bg-gray-800/50 border border-gray-600/50 rounded-lg p-4 mb-6 max-w-md mx-auto">
              <div className="text-sm text-gray-400 mb-2">Block Hash:</div>
              <div className="font-mono text-white text-sm break-all">
                {blockHash}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-4">
            {onRetry && (
              <button
                onClick={onRetry}
                className="flex items-center space-x-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 px-4 py-2 rounded-lg transition-colors"
              >
                <ArrowsClockwise className="h-4 w-4" />
                <span>{tCommon("retry")}</span>
              </button>
            )}

            <Link
              href="/"
              className="flex items-center space-x-2 bg-gray-500/20 hover:bg-gray-500/30 text-gray-400 px-4 py-2 rounded-lg transition-colors"
            >
              <House className="h-4 w-4" />
              <span>Back to Blocks</span>
            </Link>
          </div>

          <div className="mt-8 text-sm text-gray-500">
            <p>Common issues:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Block hash is invalid or malformed</li>
              <li>Block is not yet mined or confirmed</li>
              <li>Network connectivity issues</li>
              <li>Block has been orphaned</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
