'use client';

import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from 'react';
import {
  MagnifyingGlass,
  X,
  Clock,
  Hash,
  User,
  Database,
  Activity,
  TrendUp,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

/**
 * Smart MagnifyingGlass Component with Autocomplete
 * Provides instant search across blocks, transactions, addresses, and VerusIDs
 *
 * @example
 * ```tsx
 * <SmartSearch
 *   placeholder="MagnifyingGlass blocks, transactions, addresses..."
 *   onSelect={(result) => console.log('Selected:', result)}
 * />
 * ```
 */

export interface SearchResult {
  id: string;
  type: 'block' | 'transaction' | 'address' | 'verusid';
  title: string;
  description?: string;
  metadata?: string;
  url?: string;
}

export interface SmartSearchProps {
  placeholder?: string;
  onSelect?: (result: SearchResult) => void;
  autoFocus?: boolean;
  showRecentSearches?: boolean;
  className?: string;
}

// Debounce utility
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function SmartSearch({
  placeholder = 'MagnifyingGlass blocks, transactions, addresses, VerusIDs...',
  onSelect,
  autoFocus = false,
  showRecentSearches = true,
  className,
}: SmartSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Debounce search query
  const debouncedQuery = useDebounce(query, 300);

  // Load recent searches from localStorage
  useEffect(() => {
    if (showRecentSearches) {
      try {
        const stored = localStorage.getItem('smart-search-recent');
        if (stored) {
          setRecentSearches(JSON.parse(stored));
        }
      } catch (error) {
        console.error('Failed to load recent searches:', error);
      }
    }
  }, [showRecentSearches]);

  // Save recent search
  const saveRecentSearch = useCallback(
    (searchQuery: string) => {
      if (!showRecentSearches || !searchQuery.trim()) return;

      try {
        const updated = [
          searchQuery,
          ...recentSearches.filter(s => s !== searchQuery),
        ].slice(0, 5); // Keep only 5 recent

        setRecentSearches(updated);
        localStorage.setItem('smart-search-recent', JSON.stringify(updated));
      } catch (error) {
        console.error('Failed to save recent search:', error);
      }
    },
    [recentSearches, showRecentSearches]
  );

  // Perform search
  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);

    try {
      // Simulate API call - replace with actual API endpoint
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(searchQuery)}`
      );

      if (response.ok) {
        const data = await response.json();
        setResults(data.results || []);
      } else {
        // Fallback to mock data for demonstration
        const mockResults = generateMockResults(searchQuery);
        setResults(mockResults);
      }
    } catch (error) {
      console.error('MagnifyingGlass error:', error);
      // Fallback to mock data
      const mockResults = generateMockResults(searchQuery);
      setResults(mockResults);
    } finally {
      setLoading(false);
    }
  }, []);

  // Mock results generator (replace with real API)
  const generateMockResults = (searchQuery: string): SearchResult[] => {
    const q = searchQuery.toLowerCase();
    const mockResults: SearchResult[] = [];

    // Check if it looks like a block number
    if (/^\d+$/.test(q)) {
      mockResults.push({
        id: `block-${q}`,
        type: 'block',
        title: `Block #${q}`,
        description: 'View block details',
        url: `/block/${q}`,
      });
    }

    // Check if it looks like a hash
    if (q.length >= 8 && /^[0-9a-f]+$/.test(q)) {
      mockResults.push({
        id: `tx-${q}`,
        type: 'transaction',
        title: `Transaction ${q.slice(0, 16)}...`,
        description: 'View transaction details',
        url: `/transaction/${q}`,
      });
    }

    // Check if it looks like a VerusID
    if (q.endsWith('@') || q.includes('.vrsc')) {
      mockResults.push({
        id: `verusid-${q}`,
        type: 'verusid',
        title: q.endsWith('@') ? q : `${q}@`,
        description: 'View VerusID profile',
        metadata: 'VerusID',
        url: `/verusid?id=${q}`,
      });
    }

    // Check if it looks like an address
    if (q.startsWith('i') || q.startsWith('r') || q.length > 20) {
      mockResults.push({
        id: `address-${q}`,
        type: 'address',
        title: q,
        description: 'View address details',
        url: `/address/${q}`,
      });
    }

    return mockResults;
  };

  // MagnifyingGlass effect
  useEffect(() => {
    if (debouncedQuery) {
      performSearch(debouncedQuery);
      setIsOpen(true);
    } else {
      setResults([]);
      setIsOpen(false);
    }
  }, [debouncedQuery, performSearch]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setSelectedIndex(0);
  };

  // Handle result selection
  const handleSelectResult = useCallback(
    (result: SearchResult) => {
      saveRecentSearch(query);
      setQuery('');
      setIsOpen(false);

      if (onSelect) {
        onSelect(result);
      }

      if (result.url) {
        router.push(result.url);
      }
    },
    [query, onSelect, router, saveRecentSearch]
  );

  // Handle recent search selection
  const handleSelectRecentSearch = useCallback((recentQuery: string) => {
    setQuery(recentQuery);
    inputRef.current?.focus();
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (results[selectedIndex]) {
          handleSelectResult(results[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setQuery('');
        inputRef.current?.blur();
        break;
    }
  };

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(event.target as Node) &&
        resultsRef.current &&
        !resultsRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get icon for result type
  const getResultIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'block':
        return <Database className="h-4 w-4 text-blue-400" />;
      case 'transaction':
        return <Activity className="h-4 w-4 text-verus-blue" />;
      case 'address':
        return <User className="h-4 w-4 text-green-400" />;
      case 'verusid':
        return <Hash className="h-4 w-4 text-verus-teal" />;
      default:
        return <MagnifyingGlass className="h-4 w-4 text-gray-400" />;
    }
  };

  const showRecentSearchesPanel = !query && recentSearches.length > 0 && isOpen;
  const showResults = query && results.length > 0 && isOpen;
  const showNoResults = query && results.length === 0 && !loading && isOpen;

  return (
    <div className={cn('relative w-full', className)}>
      {/* MagnifyingGlass Input */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <MagnifyingGlass className="h-5 w-5 text-gray-400" />
        </div>

        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full pl-10 pr-10 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls="search-results"
          aria-label="MagnifyingGlass"
          role="combobox"
        />

        {query && (
          <button
            onClick={() => {
              setQuery('');
              setResults([]);
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded transition-colors"
            aria-label="Clear search"
          >
            <X className="h-4 w-4 text-gray-400" />
          </button>
        )}

        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        )}
      </div>

      {/* MagnifyingGlass Results Dropdown */}
      {(showResults || showRecentSearchesPanel || showNoResults) && (
        <div
          ref={resultsRef}
          id="search-results"
          role="listbox"
          className="absolute top-full mt-2 w-full bg-slate-900 border border-white/20 rounded-lg shadow-2xl max-h-96 overflow-y-auto z-50"
        >
          {/* Recent Searches */}
          {showRecentSearchesPanel && (
            <div className="p-2">
              <div className="px-3 py-2 text-xs text-gray-400 font-semibold uppercase tracking-wider">
                Recent Searches
              </div>
              {recentSearches.map((recentQuery, index) => (
                <button
                  key={index}
                  onClick={() => handleSelectRecentSearch(recentQuery)}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/10 rounded-lg transition-colors text-left"
                >
                  <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span className="text-sm text-white">{recentQuery}</span>
                </button>
              ))}
            </div>
          )}

          {/* MagnifyingGlass Results */}
          {showResults && (
            <div className="p-2">
              {results.map((result, index) => (
                <button
                  key={result.id}
                  onClick={() => handleSelectResult(result)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors text-left',
                    index === selectedIndex
                      ? 'bg-blue-500/20 border border-blue-500/50'
                      : 'hover:bg-white/10'
                  )}
                  role="option"
                  aria-selected={index === selectedIndex}
                >
                  <div className="flex-shrink-0">
                    {getResultIcon(result.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">
                      {result.title}
                    </div>
                    {result.description && (
                      <div className="text-xs text-gray-400 truncate">
                        {result.description}
                      </div>
                    )}
                  </div>
                  {result.metadata && (
                    <div className="flex-shrink-0 text-xs text-gray-400">
                      {result.metadata}
                    </div>
                  )}
                  <TrendUp className="h-4 w-4 text-gray-600 flex-shrink-0" />
                </button>
              ))}
            </div>
          )}

          {/* No Results */}
          {showNoResults && (
            <div className="p-8 text-center">
              <MagnifyingGlass className="h-12 w-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">
                No results found for &quot;{query}&quot;
              </p>
              <p className="text-gray-500 text-xs mt-1">
                Try searching for a block number, transaction hash, address, or
                VerusID
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
