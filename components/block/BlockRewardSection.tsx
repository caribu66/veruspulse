'use client';

import { BlockDetailRow } from './BlockDetailRow';
import { Coins, Shield, Hammer, TrendingUp, Clock } from 'lucide-react';
import { Block } from '@/lib/types/block-types';

interface BlockRewardSectionProps {
  block: Block;
}

export function BlockRewardSection({ block }: BlockRewardSectionProps) {
  if (!block.hasStakeReward && !block.reward) {
    return null;
  }

  const getRewardIcon = () => {
    if (
      block.stakeRewardInfo?.blockType === 'pos' ||
      block.blocktype === 'staked'
    ) {
      return <Shield className="h-5 w-5 text-green-400" />;
    }
    return <Hammer className="h-5 w-5 text-orange-400" />;
  };

  const getRewardColor = () => {
    if (
      block.stakeRewardInfo?.blockType === 'pos' ||
      block.blocktype === 'staked'
    ) {
      return 'bg-green-500/10 border-green-500/20';
    }
    return 'bg-yellow-500/10 border-yellow-500/20';
  };

  const getRewardDotColor = () => {
    if (
      block.stakeRewardInfo?.blockType === 'pos' ||
      block.blocktype === 'staked'
    ) {
      return 'bg-green-400';
    }
    return 'bg-yellow-400';
  };

  return (
    <div className={`${getRewardColor()} border rounded-lg p-4`}>
      <div className="flex items-center space-x-2 mb-4">
        <div className={`w-2 h-2 ${getRewardDotColor()} rounded-full`}></div>
        <span className="text-white font-semibold flex items-center space-x-2">
          {getRewardIcon()}
          <span>Block Reward</span>
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <BlockDetailRow
          label="Reward Amount"
          value={`${(block.reward || 0).toFixed(8)} VRSC`}
          copyable
          icon={<Coins className="h-4 w-4 text-green-400" />}
        />

        {block.stakeRewardInfo && (
          <>
            <BlockDetailRow
              label="Block Type"
              value={
                block.stakeRewardInfo.blockType === 'pos'
                  ? 'Proof of Stake'
                  : 'Proof of Work'
              }
              icon={getRewardIcon()}
            />

            {block.stakeRewardInfo.stakeAmount && (
              <BlockDetailRow
                label="Stake Amount"
                value={`${block.stakeRewardInfo.stakeAmount.toFixed(8)} VRSC`}
                copyable
                icon={<TrendingUp className="h-4 w-4 text-blue-400" />}
              />
            )}

            {block.stakeRewardInfo.stakeAge && (
              <BlockDetailRow
                label="Stake Age"
                value={`${block.stakeRewardInfo.stakeAge} blocks`}
                icon={<Clock className="h-4 w-4 text-purple-400" />}
              />
            )}

            {block.stakeRewardInfo.stakedInputs && (
              <BlockDetailRow
                label="Staked Inputs"
                value={block.stakeRewardInfo.stakedInputs.toString()}
              />
            )}

            {block.stakeRewardInfo.rewardOutputs && (
              <BlockDetailRow
                label="Reward Outputs"
                value={block.stakeRewardInfo.rewardOutputs.toString()}
              />
            )}
          </>
        )}

        {block.stakeAmount && (
          <BlockDetailRow
            label="Stake Amount"
            value={`${block.stakeAmount.toFixed(8)} VRSC`}
            copyable
            icon={<TrendingUp className="h-4 w-4 text-blue-400" />}
          />
        )}

        {block.stakeAge && (
          <BlockDetailRow
            label="Stake Age"
            value={`${block.stakeAge} blocks`}
            icon={<Clock className="h-4 w-4 text-purple-400" />}
          />
        )}
      </div>
    </div>
  );
}
