'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  CaretLeft,
  CaretRight,
  ArrowLeft,
  ArrowRight,
} from '@phosphor-icons/react';
import { useNavigationHistory } from '@/lib/hooks/use-navigation-history';

interface BlockNavigationProps {
  block: {
    height: number;
    previousblockhash?: string;
    nextblockhash?: string;
  };
}

export function BlockNavigation({
  block,
}: BlockNavigationProps) {
  const tCommon = useTranslations('common');
  const tBlocks = useTranslations('blocks');
  const { goBack } = useNavigationHistory();

  return (
    <div className="bg-gray-800/50 border border-gray-600/50 rounded-lg p-4">
      <div className="flex items-center justify-between">
        {/* Previous Block */}
        <div className="flex-1">
          {block.previousblockhash ? (
            <Link
              href={`/block/${block.previousblockhash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 text-blue-400 hover:text-blue-300 transition-colors group"
            >
              <CaretLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              <div className="text-left">
                <div className="text-xs text-gray-400">{tBlocks('previousBlockNav')}</div>
                <div className="font-semibold">#{block.height - 1}</div>
              </div>
            </Link>
          ) : (
            <div className="flex items-center space-x-2 text-gray-500">
              <CaretLeft className="h-4 w-4" />
              <div className="text-left">
                <div className="text-xs text-gray-400">{tBlocks('previousBlockNav')}</div>
                <div className="font-semibold">{tBlocks('genesis')}</div>
              </div>
            </div>
          )}
        </div>

        {/* Current Block */}
        <div className="flex-1 text-center">
          <div className="text-xs text-gray-400">{tBlocks('currentBlock')}</div>
          <div className="font-bold text-white">#{block.height}</div>
        </div>

        {/* Next Block */}
        <div className="flex-1">
          {block.nextblockhash ? (
            <Link
              href={`/block/${block.nextblockhash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 text-blue-400 hover:text-blue-300 transition-colors group ml-auto justify-end"
            >
              <div className="text-right">
                <div className="text-xs text-gray-400">{tBlocks('nextBlockNav')}</div>
                <div className="font-semibold">#{block.height + 1}</div>
              </div>
              <CaretRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          ) : (
            <div className="flex items-center space-x-2 text-gray-500 ml-auto justify-end">
              <div className="text-right">
                <div className="text-xs text-gray-400">{tBlocks('nextBlockNav')}</div>
                <div className="font-semibold">{tBlocks('latest')}</div>
              </div>
              <CaretRight className="h-4 w-4" />
            </div>
          )}
        </div>
      </div>

      {/* Quick Navigation */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <div className="flex items-center justify-center space-x-4">
          <button
            onClick={() => goBack()}
            className="flex items-center space-x-1 text-gray-400 hover:text-white transition-colors text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{tCommon('back')}</span>
          </button>

          <span className="text-gray-600">•</span>

          <Link
            href={`/block/${block.height - 10}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-white transition-colors text-sm"
          >
            {tBlocks('blocks10')}
          </Link>

          <span className="text-gray-600">•</span>

          <Link
            href={`/block/${block.height + 10}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-white transition-colors text-sm"
          >
            {tBlocks('blocks10Plus')}
          </Link>
        </div>
      </div>
    </div>
  );
}
