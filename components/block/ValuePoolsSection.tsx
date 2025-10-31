'use client';

import { BlockDetailRow } from './BlockDetailRow';
import { Database, TrendUp, TrendDown, Minus } from '@phosphor-icons/react';
import { type Block } from '@/lib/types/block-types';
import { useTranslations } from 'next-intl';

interface ValuePoolsSectionProps {
  block: Block;
}

export function ValuePoolsSection({ block }: ValuePoolsSectionProps) {
  if (!block.valuePools || block.valuePools.length === 0) {
    return null;
  }

  const formatValue = (value: number) => {
    if (value === 0) return '0 VRSC';
    if (Math.abs(value) < 0.000001)
      return `${(value * 1000000).toFixed(2)} μVRSC`;
    if (Math.abs(value) < 0.001) return `${(value * 1000).toFixed(3)} mVRSC`;
    return `${value.toFixed(8)} VRSC`;
  };

  const getDeltaIcon = (delta: number) => {
    if (delta > 0) return <TrendUp className="h-4 w-4 text-green-400" />;
    if (delta < 0) return <TrendDown className="h-4 w-4 text-red-400" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const getDeltaColor = (delta: number) => {
    if (delta > 0) return 'text-green-400';
    if (delta < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  const getPoolName = (poolId: string) => {
    switch (poolId.toLowerCase()) {
      case 'sprout':
        return 'Sprout';
      case 'sapling':
        return 'Sapling';
      case 'transparent':
        return 'Transparent';
      default:
        return poolId;
    }
  };

  const getPoolIcon = (poolId: string) => {
    switch (poolId.toLowerCase()) {
      case 'sprout':
        return '🌱';
      case 'sapling':
        return '🌿';
      case 'transparent':
        return '💎';
      default:
        return '📊';
    }
  };

  return (
    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
      <div className="flex items-center space-x-2 mb-4">
        <Database className="h-5 w-5 text-blue-400" />
        <span className="text-blue-400 font-semibold">Value Pools</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        {block.valuePools.map(pool => (
          <div key={pool.id} className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="text-lg">{getPoolIcon(pool.id)}</span>
              <span className="text-white font-medium">
                {getPoolName(pool.id)}
              </span>
              {pool.monitored && (
                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
                  Monitored
                </span>
              )}
            </div>

            <div className="space-y-1">
              <BlockDetailRow
                label="Chain Value"
                value={formatValue(pool.chainValue)}
                copyable
                className="border-none pb-1 pt-0"
              />

              <BlockDetailRow
                label="Value Delta"
                value={formatValue(pool.valueDelta)}
                copyable
                icon={getDeltaIcon(pool.valueDelta)}
                className={`border-none pb-1 pt-0 ${getDeltaColor(pool.valueDelta)}`}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="text-center">
            <div className="text-gray-400">Total Pools</div>
            <div className="text-white font-semibold">
              {block.valuePools.length}
            </div>
          </div>
          <div className="text-center">
            <div className="text-gray-400">Monitored</div>
            <div className="text-white font-semibold">
              {block.valuePools.filter(p => p.monitored).length}
            </div>
          </div>
          <div className="text-center">
            <div className="text-gray-400">Total Delta</div>
            <div className="text-white font-semibold">
              {formatValue(
                block.valuePools.reduce((sum, pool) => sum + pool.valueDelta, 0)
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
