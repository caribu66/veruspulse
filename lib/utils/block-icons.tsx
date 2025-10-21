import React from 'react';
import { Coins, Hammer } from '@phosphor-icons/react';

export interface BlockIconProps {
  blocktype?: string;
  className?: string;
}

/**
 * Get the appropriate icon for a block type
 * @param blocktype - The block type ("mined" for PoW, "minted" for PoS)
 * @param className - Optional CSS classes for the icon
 * @returns JSX element with the appropriate icon
 */
export function getBlockIcon(blocktype?: string, className?: string) {
  const iconClass = className || 'h-4 w-4';

  if (blocktype === 'minted') {
    // Proof of Stake (PoS) - Staking/Coins icon
    return (
      <span title="Proof of Stake (PoS)">
        <Coins className={`${iconClass} text-green-400`} weight="fill" />
      </span>
    );
  } else {
    // Proof of Work (PoW) - Mining/Hammer icon
    return (
      <span title="Proof of Work (PoW)">
        <Hammer className={`${iconClass} text-yellow-400`} weight="fill" />
      </span>
    );
  }
}

/**
 * Get the block type label
 * @param blocktype - The block type
 * @returns Human-readable label
 */
export function getBlockTypeLabel(blocktype?: string): string {
  if (blocktype === 'minted') {
    return 'Minted (PoS)';
  } else {
    return 'Mined (PoW)';
  }
}

/**
 * Get the block type description
 * @param blocktype - The block type
 * @returns Description of the block type
 */
export function getBlockTypeDescription(blocktype?: string): string {
  if (blocktype === 'minted') {
    return 'Proof of Stake - Block minted by staking';
  } else {
    return 'Proof of Work - Block mined with computational power';
  }
}
