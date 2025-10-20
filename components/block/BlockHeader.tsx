'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Copy,
  Check,
  ArrowLeft,
  Gear,
  Shield,
  Hammer,
} from '@phosphor-icons/react';
import { Block } from '@/lib/types/block-types';
import { useNavigationHistory } from '@/lib/hooks/use-navigation-history';

interface BlockHeaderProps {
  block: Block;
  heavyMetrics: boolean;
  onToggleHeavyMetrics: () => void;
}

export function BlockHeader({
  block,
  heavyMetrics,
  onToggleHeavyMetrics,
}: BlockHeaderProps) {
  const [copied, setCopied] = useState(false);
  const { goBack } = useNavigationHistory();

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Silent error handling for clipboard
    }
  };

  const getBlockTypeIcon = () => {
    if (block.blocktype === 'staked' || block.validationtype === 'pos') {
      return <Shield className="h-5 w-5 text-green-400" />;
    }
    return <Hammer className="h-5 w-5 text-verus-cyan" />;
  };

  const getBlockTypeText = () => {
    if (block.blocktype === 'staked' || block.validationtype === 'pos') {
      return 'Proof of Stake';
    }
    return 'Proof of Work';
  };

  return (
    <div className="flex flex-col space-y-4">
      {/* Main Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-3 sm:space-y-0">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => goBack()}
            className="text-blue-400 hover:underline flex items-center space-x-1"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to blocks</span>
          </button>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={onToggleHeavyMetrics}
            className={`px-3 py-1 text-xs rounded transition-colors flex items-center space-x-2 ${
              heavyMetrics
                ? 'bg-verus-blue/20 text-verus-blue border border-verus-blue/30'
                : 'bg-white/10 text-gray-400 hover:bg-white/20'
            }`}
            title="Enable heavy metrics (fees, miner identity, orphan status, etc.)"
          >
            <Gear className="h-3 w-3" />
            <span>{heavyMetrics ? 'Heavy Metrics ON' : 'Heavy Metrics'}</span>
          </button>
        </div>
      </div>

      {/* Block Title and Type */}
      <div className="flex flex-col space-y-2">
        <div className="flex items-center space-x-3">
          <h1 className="text-3xl font-bold text-white">
            Block #{block.height.toLocaleString()}
          </h1>
          {getBlockTypeIcon()}
          <span className="text-sm text-gray-400">{getBlockTypeText()}</span>
        </div>

        {/* Block Hash */}
        <div className="flex items-center space-x-2">
          <span className="text-gray-400 text-sm">Hash:</span>
          <div className="flex items-center space-x-2 bg-gray-800/50 px-3 py-1 rounded-lg">
            <span className="font-mono text-white text-sm break-all">
              {block.hash}
            </span>
            <button
              onClick={() => handleCopy(block.hash)}
              className="p-1 hover:bg-white/10 rounded transition-colors flex-shrink-0"
              title="Copy block hash"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-400" />
              ) : (
                <Copy className="h-4 w-4 text-gray-400 hover:text-white" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
          <div className="text-blue-400 text-xs font-medium">Confirmations</div>
          <div className="text-white text-lg font-semibold">
            {block.confirmations ? block.confirmations.toLocaleString() : 'N/A'}
          </div>
        </div>

        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
          <div className="text-green-400 text-xs font-medium">Transactions</div>
          <div className="text-white text-lg font-semibold">
            {block.nTx || block.tx?.length || 0}
          </div>
        </div>

        <div className="bg-verus-blue/10 border border-verus-blue/20 rounded-lg p-3">
          <div className="text-verus-blue text-xs font-medium">Size</div>
          <div className="text-white text-lg font-semibold">
            {formatSize(block.size)}
          </div>
        </div>

        <div className="bg-verus-cyan/10 border border-verus-cyan/20 rounded-lg p-3">
          <div className="text-verus-cyan text-xs font-medium">Weight</div>
          <div className="text-white text-lg font-semibold">
            {formatWeight(block.weight || 0)}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatWeight(weight: number): string {
  if (weight === 0) return '0 WU';
  if (weight < 1000) return `${weight} WU`;
  if (weight < 1000000) return `${(weight / 1000).toFixed(1)} KWU`;
  return `${(weight / 1000000).toFixed(1)} MWU`;
}
