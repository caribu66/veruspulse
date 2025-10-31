'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  User,
  Shield,
  Coins,
  HardDrives,
  Question,
  ArrowSquareOut,
} from '@phosphor-icons/react';

interface KnownAddress {
  address: string;
  name: string;
  type: 'pool' | 'staker' | 'exchange' | 'service' | 'other';
  description?: string;
  website?: string;
  verified: boolean;
}

interface EnrichedAddressProps {
  address: string;
  showIcon?: boolean;
  showBadge?: boolean;
  showTooltip?: boolean;
  className?: string;
  linkToExplorer?: boolean;
}

/**
 * Display a blockchain address with enriched information
 * Shows friendly names for known pools, exchanges, and services
 * Inspired by Oink70's KnownStakingAddresses.sed
 */
export function EnrichedAddress({
  address,
  showIcon = true,
  showBadge = true,
  showTooltip = true,
  className = '',
  linkToExplorer = false,
}: EnrichedAddressProps) {
  const tCommon = useTranslations('common');
  const tBlocks = useTranslations('blocks');
  const tStaking = useTranslations('staking');
  const [knownAddress, setKnownAddress] = useState<KnownAddress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchKnownAddress = async () => {
      try {
        const response = await fetch(`/api/known-addresses?address=${address}`);
        const data = await response.json();

        if (data.success && data.data.length > 0) {
          setKnownAddress(data.data[0]);
        }
      } catch (error) {
        // Silent error handling for known address lookup
      } finally {
        setLoading(false);
      }
    };

    if (address) {
      fetchKnownAddress();
    }
  }, [address]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'pool':
        return Coins;
      case 'staker':
        return User;
      case 'exchange':
        return HardDrives;
      case 'service':
        return Shield;
      default:
        return Question;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'pool':
        return 'text-blue-400';
      case 'staker':
        return 'text-green-400';
      case 'exchange':
        return 'text-verus-blue';
      case 'service':
        return 'text-verus-teal';
      default:
        return 'text-gray-400';
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'pool':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'staker':
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'exchange':
        return 'bg-verus-blue/20 text-purple-300 border-verus-blue/30';
      case 'service':
        return 'bg-verus-teal/20 text-yellow-300 border-yellow-500/30';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const shortenAddress = (addr: string) => {
    if (addr.length <= 12) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (loading) {
    return (
      <span className={`font-mono text-sm ${className}`}>
        {shortenAddress(address)}
      </span>
    );
  }

  if (!knownAddress) {
    // Unknown address - show shortened version
    return (
      <span className={`font-mono text-sm text-gray-300 ${className}`}>
        {linkToExplorer ? (
          <a
            href={`/address/${address}`}
            className="hover:text-blue-400 transition-colors"
          >
            {shortenAddress(address)}
          </a>
        ) : (
          shortenAddress(address)
        )}
      </span>
    );
  }

  // Known address - show enriched info
  const Icon = getTypeIcon(knownAddress.type);
  const typeColor = getTypeColor(knownAddress.type);
  const badgeColor = getTypeBadge(knownAddress.type);

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {showIcon && (
        <div className={`flex-shrink-0 ${typeColor}`} title={knownAddress.type}>
          <Icon className="h-4 w-4" />
        </div>
      )}

      <div className="flex items-center gap-2">
        <span className="font-semibold text-white">{knownAddress.name}</span>

        {showBadge && (
          <span className={`text-xs px-2 py-0.5 rounded border ${badgeColor}`}>
            {knownAddress.type}
          </span>
        )}

        {knownAddress.verified && (
          <span title="Verified">
            <Shield className="h-3 w-3 text-green-400" />
          </span>
        )}

        {knownAddress.website && (
          <a
            href={knownAddress.website}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 transition-colors"
          >
            <ArrowSquareOut className="h-3 w-3" />
          </a>
        )}
      </div>

      {showTooltip && knownAddress.description && (
        <div className="group relative inline-block">
          <Question className="h-3 w-3 text-gray-400 cursor-help" />
          <div className="invisible group-hover:visible absolute z-50 w-64 p-2 mt-1 text-xs bg-gray-900 text-white rounded border border-gray-700 shadow-lg">
            {knownAddress.description}
            <div className="text-xs text-gray-400 mt-1 font-mono">
              {shortenAddress(address)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Simpler version that just shows the name or shortened address
 */
export function SimpleEnrichedAddress({ address }: { address: string }) {
  const [name, setName] = useState<string>(address);

  useEffect(() => {
    const fetchName = async () => {
      try {
        const response = await fetch(`/api/known-addresses?address=${address}`);
        const data = await response.json();

        if (data.success && data.data.length > 0) {
          setName(data.data[0].name);
        } else {
          setName(
            address.length > 12
              ? `${address.slice(0, 6)}...${address.slice(-4)}`
              : address
          );
        }
      } catch (error) {
        setName(
          address.length > 12
            ? `${address.slice(0, 6)}...${address.slice(-4)}`
            : address
        );
      }
    };

    if (address) {
      fetchName();
    }
  }, [address]);

  return <span className="font-mono text-sm">{name}</span>;
}
