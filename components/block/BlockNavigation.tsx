'use client';

import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
} from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';

interface BlockNavigationProps {
  block: {
    height: number;
    previousblockhash?: string;
    nextblockhash?: string;
  };
}

export function BlockNavigation({ block }: BlockNavigationProps) {
  const router = useRouter();

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
    <div className="bg-gray-800/50 border border-gray-600/50 rounded-lg p-4">
      <div className="flex items-center justify-between">
        {/* Previous Block */}
        <div className="flex-1">
          {block.previousblockhash ? (
            <Link
              href={`/block/${block.previousblockhash}`}
              className="flex items-center space-x-2 text-blue-400 hover:text-blue-300 transition-colors group"
            >
              <ChevronLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              <div className="text-left">
                <div className="text-xs text-gray-400">Previous Block</div>
                <div className="font-semibold">#{block.height - 1}</div>
              </div>
            </Link>
          ) : (
            <div className="flex items-center space-x-2 text-gray-500">
              <ChevronLeft className="h-4 w-4" />
              <div className="text-left">
                <div className="text-xs text-gray-400">Previous Block</div>
                <div className="font-semibold">Genesis</div>
              </div>
            </div>
          )}
        </div>

        {/* Current Block */}
        <div className="flex-1 text-center">
          <div className="text-xs text-gray-400">Current Block</div>
          <div className="font-bold text-white">#{block.height}</div>
        </div>

        {/* Next Block */}
        <div className="flex-1">
          {block.nextblockhash ? (
            <Link
              href={`/block/${block.nextblockhash}`}
              className="flex items-center space-x-2 text-blue-400 hover:text-blue-300 transition-colors group ml-auto justify-end"
            >
              <div className="text-right">
                <div className="text-xs text-gray-400">Next Block</div>
                <div className="font-semibold">#{block.height + 1}</div>
              </div>
              <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          ) : (
            <div className="flex items-center space-x-2 text-gray-500 ml-auto justify-end">
              <div className="text-right">
                <div className="text-xs text-gray-400">Next Block</div>
                <div className="font-semibold">Latest</div>
              </div>
              <ChevronRight className="h-4 w-4" />
            </div>
          )}
        </div>
      </div>

      {/* Quick Navigation */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <div className="flex items-center justify-center space-x-4">
          <button
            onClick={handleGoBack}
            className="flex items-center space-x-1 text-gray-400 hover:text-white transition-colors text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Go Back</span>
          </button>

          <span className="text-gray-600">•</span>

          <Link
            href={`/block/${block.height - 10}`}
            className="text-gray-400 hover:text-white transition-colors text-sm"
          >
            -10 blocks
          </Link>

          <span className="text-gray-600">•</span>

          <Link
            href={`/block/${block.height + 10}`}
            className="text-gray-400 hover:text-white transition-colors text-sm"
          >
            +10 blocks
          </Link>
        </div>
      </div>
    </div>
  );
}
