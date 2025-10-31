'use client';

import React, { useState } from 'react';
import { Copy, Check } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

interface TruncatedAddressProps {
  address: string;
  maxLength?: number;
  showCopyButton?: boolean;
  className?: string;
  copyClassName?: string;
}

/**
 * Truncated Address Component
 * Displays long addresses in a mobile-friendly truncated format with copy functionality
 *
 * @example
 * <TruncatedAddress address="iPZkWmFAhQSFsgKiLExowaoXvzaor2bBZ5" maxLength={20} />
 */
export function TruncatedAddress({
  address,
  maxLength = 20,
  showCopyButton = true,
  className,
  copyClassName,
}: TruncatedAddressProps) {
  const [copied, setCopied] = useState(false);

  const truncateAddress = (addr: string, maxLen: number): string => {
    if (addr.length <= maxLen) return addr;

    // Show first 10 and last 8 characters with ellipsis in between
    const prefixLength = Math.floor((maxLen - 3) * 0.6);
    const suffixLength = Math.floor((maxLen - 3) * 0.4);

    return `${addr.slice(0, prefixLength)}...${addr.slice(-suffixLength)}`;
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      // Silent error handling for clipboard
    }
  };

  return (
    <div className={cn('flex items-center gap-2 min-w-0', className)}>
      <span
        className="truncate font-mono text-sm"
        title={address} // Full address on hover
      >
        {truncateAddress(address, maxLength)}
      </span>

      {showCopyButton && (
        <button
          onClick={copyToClipboard}
          className={cn(
            'flex-shrink-0 p-1 hover:bg-white/10 rounded transition-colors',
            copyClassName
          )}
          aria-label={copied ? 'Copied!' : 'Copy address'}
          title={copied ? 'Copied!' : 'Copy to clipboard'}
        >
          {copied ? (
            <Check size={16} className="text-green-400" />
          ) : (
            <Copy size={16} className="text-gray-400 hover:text-white" />
          )}
        </button>
      )}
    </div>
  );
}

interface TruncatedHashProps {
  hash: string;
  maxLength?: number;
  showCopyButton?: boolean;
  className?: string;
}

/**
 * Truncated Hash Component
 * Similar to TruncatedAddress but optimized for transaction hashes
 */
export function TruncatedHash({
  hash,
  maxLength = 16,
  showCopyButton = true,
  className,
}: TruncatedHashProps) {
  const [copied, setCopied] = useState(false);

  const truncateHash = (h: string, maxLen: number): string => {
    if (h.length <= maxLen) return h;
    return `${h.slice(0, 8)}...${h.slice(-6)}`;
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(hash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      // Silent error handling for clipboard
    }
  };

  return (
    <div className={cn('flex items-center gap-2 min-w-0', className)}>
      <code
        className="truncate text-sm bg-gray-200 dark:bg-black/20 px-2 py-1 rounded"
        title={hash}
      >
        {truncateHash(hash, maxLength)}
      </code>

      {showCopyButton && (
        <button
          onClick={copyToClipboard}
          className="flex-shrink-0 p-1 hover:bg-white/10 rounded transition-colors"
          aria-label={copied ? 'Copied!' : 'Copy hash'}
        >
          {copied ? (
            <Check size={14} className="text-green-400" />
          ) : (
            <Copy size={14} className="text-gray-400 hover:text-white" />
          )}
        </button>
      )}
    </div>
  );
}
