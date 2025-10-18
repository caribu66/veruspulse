'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Copy, Check, ArrowSquareOut } from '@phosphor-icons/react';

interface BlockDetailRowProps {
  label: string;
  value: string | number;
  isHash?: boolean;
  isLink?: boolean;
  link?: string;
  copyable?: boolean;
  icon?: React.ReactNode;
  tooltip?: string;
  className?: string;
}

export function BlockDetailRow({
  label,
  value,
  isHash = false,
  isLink = false,
  link,
  copyable = false,
  icon,
  tooltip,
  className = '',
}: BlockDetailRowProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!copyable) return;

    try {
      await navigator.clipboard.writeText(String(value));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const displayValue =
    value === null || typeof value === 'undefined' ? 'N/A' : String(value);

  return (
    <div
      className={`grid grid-cols-1 md:grid-cols-4 gap-4 border-b border-white/10 pb-3 pt-1 ${className}`}
      title={tooltip}
    >
      <div className="text-blue-200 font-medium min-w-0 md:col-span-1 flex items-center space-x-2">
        {icon}
        <span>{label}</span>
      </div>
      <div
        className={`text-white md:col-span-3 min-w-0 flex items-center justify-between ${
          isHash ? 'font-mono text-sm break-all overflow-wrap-anywhere' : ''
        }`}
      >
        <div className="flex-1 min-w-0">
          {isLink && link ? (
            <Link
              href={link}
              className="text-blue-400 hover:underline flex items-center space-x-1"
            >
              <span className="truncate">{displayValue}</span>
              <ArrowSquareOut className="h-3 w-3 flex-shrink-0" />
            </Link>
          ) : (
            <span className={isHash ? 'break-all' : ''}>{displayValue}</span>
          )}
        </div>

        {copyable && (
          <button
            onClick={handleCopy}
            className="ml-2 p-1 hover:bg-white/10 rounded transition-colors flex-shrink-0"
            title="Copy to clipboard"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-400" />
            ) : (
              <Copy className="h-4 w-4 text-gray-400 hover:text-white" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
