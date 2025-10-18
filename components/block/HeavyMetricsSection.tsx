'use client';

import { BlockDetailRow } from './BlockDetailRow';
import {
  Shield,
  Hammer,
  Warning,
  CheckCircle,
  Clock,
  TrendUp,
} from '@phosphor-icons/react';
import { Block } from '@/lib/types/block-types';

interface HeavyMetricsSectionProps {
  block: Block;
}

export function HeavyMetricsSection({ block }: HeavyMetricsSectionProps) {
  if (!block.feeTotal && block.feeTotal !== 0) {
    return null;
  }

  const formatFee = (fee: number) => {
    if (fee === 0) return '0 VRSC';
    if (fee < 0.000001) return `${(fee * 1000000).toFixed(2)} μVRSC`;
    if (fee < 0.001) return `${(fee * 1000).toFixed(3)} mVRSC`;
    return `${fee.toFixed(8)} VRSC`;
  };

  const formatFeePerByte = (feePerByte: number) => {
    if (feePerByte === 0) return '0 sat/B';
    if (feePerByte < 0.001)
      return `${(feePerByte * 1000000).toFixed(2)} μsat/B`;
    if (feePerByte < 1) return `${(feePerByte * 1000).toFixed(2)} msat/B`;
    return `${feePerByte.toFixed(3)} sat/B`;
  };

  const getMinerIcon = (minerType: string) => {
    return minerType === 'staker' ? (
      <Shield className="h-4 w-4 text-green-400" />
    ) : (
      <Hammer className="h-4 w-4 text-verus-cyan" />
    );
  };

  const getOrphanIcon = (isOrphan: boolean) => {
    return isOrphan ? (
      <Warning className="h-4 w-4 text-red-400" />
    ) : (
      <CheckCircle className="h-4 w-4 text-green-400" />
    );
  };

  const getOrphanStatusText = (isOrphan: boolean, confidence: string) => {
    if (!isOrphan) return 'Canonical';
    return `Orphan (${confidence} confidence)`;
  };

  const getOrphanStatusColor = (isOrphan: boolean, confidence: string) => {
    if (!isOrphan) return 'text-green-400';
    switch (confidence) {
      case 'high':
        return 'text-red-400';
      case 'medium':
        return 'text-verus-teal';
      case 'low':
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="bg-verus-blue/10 border border-verus-blue/20 rounded-lg p-4">
      <div className="flex items-center space-x-2 mb-4">
        <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
        <span className="text-verus-blue font-semibold">Heavy Metrics</span>
        {block.metricsError && (
          <span className="text-red-400 text-xs bg-red-500/20 px-2 py-1 rounded">
            Calculation Failed
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        {/* Fee Metrics */}
        <BlockDetailRow
          label="Total Fees"
          value={formatFee(block.feeTotal || 0)}
          copyable
          icon={<TrendUp className="h-4 w-4 text-verus-blue" />}
        />

        <BlockDetailRow
          label="Avg Fee/Byte"
          value={formatFeePerByte((block.feePerByteAvg || 0) * 100000000)}
          copyable
        />

        {/* Miner/Staker Identity */}
        {block.coinbasePayout && (
          <>
            <BlockDetailRow
              label="Miner/Staker"
              value={block.isShieldedPayout ? 'Shielded' : block.coinbasePayout}
              copyable={!block.isShieldedPayout}
              icon={getMinerIcon(block.minerType || 'miner')}
            />

            <BlockDetailRow
              label="Miner Type"
              value={block.minerType === 'staker' ? 'Staker' : 'Miner'}
              icon={getMinerIcon(block.minerType || 'miner')}
            />
          </>
        )}

        {/* Orphan Status */}
        {block.isOrphan !== undefined && (
          <>
            <BlockDetailRow
              label="Orphan Status"
              value={getOrphanStatusText(
                block.isOrphan,
                block.orphanConfidence || 'low'
              )}
              icon={getOrphanIcon(block.isOrphan)}
              className={getOrphanStatusColor(
                block.isOrphan,
                block.orphanConfidence || 'low'
              )}
            />

            {block.canonicalHash && (
              <BlockDetailRow
                label="Canonical Hash"
                value={block.canonicalHash}
                isHash
                copyable
              />
            )}
          </>
        )}

        {/* Propagation Metrics */}
        {block.propagationSeconds !== null &&
          block.propagationSeconds !== undefined && (
            <>
              <BlockDetailRow
                label="Propagation Time"
                value={`${block.propagationSeconds.toFixed(1)}s`}
                icon={<Clock className="h-4 w-4 text-blue-400" />}
              />

              <BlockDetailRow
                label="Tracked Txs"
                value={`${block.propagationTrackedTxs || 0}/${block.propagationTotalTxs || 0}`}
              />
            </>
          )}

        {/* Processing Stats */}
        {block.feeProcessedTxs !== undefined && (
          <BlockDetailRow
            label="Fee Processing"
            value={`${block.feeProcessedTxs}/${block.feeTotalTxs || 0} txs`}
          />
        )}
      </div>

      {/* Warnings */}
      {block.feeApproximate && (
        <div className="mt-4 p-3 bg-verus-teal/10 border border-verus-teal/20 rounded-lg">
          <div className="flex items-center space-x-2 text-verus-teal text-sm">
            <Warning className="h-4 w-4" />
            <span>Fee calculation is approximate due to lookup limits</span>
          </div>
        </div>
      )}

      {block.metricsError && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <div className="flex items-center space-x-2 text-red-400 text-sm">
            <Warning className="h-4 w-4" />
            <span>Heavy metrics calculation failed</span>
          </div>
        </div>
      )}
    </div>
  );
}
