'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  MagnifyingGlass,
  Database,
  Pulse,
  User,
  UsersThree,
  Hash,
  Clock,
  Copy,
  Check,
  ArrowSquareOut,
  WarningCircle,
  Info,
  ArrowsLeftRight,
} from '@phosphor-icons/react';

interface SearchResult {
  type: 'block' | 'transaction' | 'address' | 'verusid';
  data: unknown;
}

export function UniversalSearch() {
  const tBlocks = useTranslations('blocks');

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const search = async () => {
    if (!query.trim()) return;

    try {
      setLoading(true);
      setError(null);
      setResults([]);

      const trimmedQuery = query.trim();

      // Determine search type based on query format
      type SearchType =
        | 'auto'
        | 'verusid'
        | 'transaction'
        | 'block'
        | 'address';
      let searchType: SearchType = 'auto';

      if (trimmedQuery.startsWith('@')) {
        searchType = 'verusid';
      } else if (
        trimmedQuery.length === 64 &&
        /^[a-fA-F0-9]+$/.test(trimmedQuery)
      ) {
        // 64-char hex could be transaction or block - try transaction first
        searchType = 'transaction';
      } else if (/^[0-9]+$/.test(trimmedQuery)) {
        searchType = 'block';
      } else if (trimmedQuery.startsWith('R') && trimmedQuery.length > 20) {
        searchType = 'address';
      } else {
        searchType = 'auto';
      }

      // Perform search based on type
      const searchResults: SearchResult[] = [];

      // Type guard for API response
      const isValidResponse = (
        response: unknown
      ): response is { success: boolean; data: unknown } => {
        return (
          typeof response === 'object' &&
          response !== null &&
          'success' in response &&
          'data' in response &&
          typeof (response as { success: unknown }).success === 'boolean'
        );
      };

      if (searchType === 'verusid' || searchType === 'auto') {
        try {
          const response = await fetch('/api/verusid-lookup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identity: trimmedQuery }),
          });
          const result = await response.json();
          if (isValidResponse(result) && result.success && result.data) {
            searchResults.push({ type: 'verusid', data: result.data });
          }
        } catch (err) {
          // Silent error handling
        }
      }

      if (searchType === 'transaction' || searchType === 'auto') {
        try {
          const response = await fetch(`/api/transaction/${trimmedQuery}`);
          const result = await response.json();
          if (isValidResponse(result) && result.success && result.data) {
            searchResults.push({ type: 'transaction', data: result.data });
          }
        } catch (err) {
          // Silent error handling
        }
      }

      if (searchType === 'block' || searchType === 'auto') {
        try {
          const response = await fetch(`/api/block/${trimmedQuery}`);
          const result = await response.json();
          if (isValidResponse(result) && result.success && result.data) {
            searchResults.push({ type: 'block', data: result.data });
          }
        } catch (err) {
          // Silent error handling
        }
      }

      if (searchType === 'address' || searchType === 'auto') {
        try {
          const response = await fetch(`/api/address/${trimmedQuery}`);
          const result = await response.json();
          if (isValidResponse(result) && result.success && result.data) {
            searchResults.push({ type: 'address', data: result.data });
          }
        } catch (err) {
          // Silent error handling
        }
      }

      if (searchResults.length === 0) {
        setError('No results found for your search query');
      } else {
        setResults(searchResults);
      }
    } catch (err) {
      setError('MagnifyingGlass failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      // Silent error handling for clipboard
    }
  };

  const formatValue = (value: number) => {
    return (value / 100000000).toFixed(8) + ' VRSC';
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'block':
        return Database;
      case 'transaction':
        return ArrowsLeftRight;
      case 'address':
        return User;
      case 'verusid':
        return UsersThree;
      default:
        return Hash;
    }
  };

  const getResultColor = (type: string) => {
    switch (type) {
      case 'block':
        return 'text-blue-400';
      case 'transaction':
        return 'text-green-400';
      case 'address':
        return 'text-verus-blue';
      case 'verusid':
        return 'text-verus-teal';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="space-y-6 text-white">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-4">
          Universal MagnifyingGlass
        </h1>
        <p className="text-blue-200 text-lg mb-8">
          MagnifyingGlass for blocks, transactions, addresses, and VerusIDs
          across the Verus blockchain
        </p>
      </div>

      {/* MagnifyingGlass Input */}
      <div className="bg-gray-50 dark:bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-slate-300 dark:border-white/20">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Enter block height, transaction hash, address, or VerusID..."
              className="w-full px-6 py-4 bg-white dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
              onKeyPress={e => e.key === 'Enter' && search()}
            />
          </div>
          <button
            onClick={search}
            disabled={loading || !query.trim()}
            className="flex items-center space-x-3 px-8 py-4 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg"
          >
            <MagnifyingGlass className="h-5 w-5" />
            <span>{loading ? 'Searching...' : 'MagnifyingGlass'}</span>
          </button>
        </div>

        {/* MagnifyingGlass Examples */}
        <div className="mt-6">
          <div className="text-blue-200 dark:text-blue-200 text-blue-600 text-sm mb-3">
            MagnifyingGlass Examples:
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="bg-white/5 rounded-lg p-3">
              <div className="text-white font-semibold mb-1">
                {tBlocks('blockHeight')}
              </div>
              <div className="text-blue-300">751165</div>
            </div>
            <div className="bg-white/5 rounded-lg p-3">
              <div className="text-white font-semibold mb-1">
                Transaction Hash
              </div>
              <div className="text-blue-300 font-mono text-xs">
                d5bb54782656014028377cbfdc4ca7576a8b3110c8f3503ee1e761c5b248b965
              </div>
            </div>
            <div className="bg-white/5 rounded-lg p-3">
              <div className="text-white font-semibold mb-1">Address</div>
              <div className="text-blue-300 font-mono text-xs">R9vqQz8...</div>
            </div>
            <div className="bg-white/5 rounded-lg p-3">
              <div className="text-white font-semibold mb-1">VerusID</div>
              <div className="text-blue-300">@username</div>
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-white">
            MagnifyingGlass Results
          </h2>

          {results.map((result, index) => {
            const Icon = getResultIcon(result.type);
            const color = getResultColor(result.type);

            return (
              <div
                key={index}
                className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-white/10">
                      <Icon className={`h-5 w-5 ${color}`} />
                    </div>
                    <div>
                      <div className="text-white font-semibold capitalize">
                        {result.type} Result
                      </div>
                      <div className="text-blue-200 text-sm">
                        Found {result.type} information
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        JSON.stringify(result.data, null, 2),
                        `result-${index}`
                      )
                    }
                    className="flex items-center space-x-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded transition-colors border border-white/10 hover:border-white/20"
                  >
                    {copied === `result-${index}` ? (
                      <Check className="h-4 w-4 text-green-400" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    <span className="text-sm font-medium">Copy Data</span>
                  </button>
                </div>

                {/* Result Content */}
                <div className="bg-white/5 rounded-lg p-4">
                  <pre className="text-white text-sm overflow-x-auto">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6">
          <div className="flex items-center space-x-3">
            <WarningCircle className="h-5 w-5 text-red-400" />
            <div>
              <div className="text-red-400 font-semibold">
                MagnifyingGlass Error
              </div>
              <div className="text-red-300 text-sm">{error}</div>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          <span className="ml-3 text-blue-200">Searching blockchain...</span>
        </div>
      )}
    </div>
  );
}
