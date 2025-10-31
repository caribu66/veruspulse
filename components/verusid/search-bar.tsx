'use client';

import React, { useState, useEffect } from 'react';
import { MagnifyingGlass, Clock } from '@phosphor-icons/react';
import { useTranslations } from 'next-intl';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { SmartSearch } from '@/components/ui/smart-search';

/**
 * VerusID Search Bar Component
 * Extracted from verusid-explorer.tsx for better modularity
 */

export interface VerusIDSearchBarProps {
  onSelect: (identityName: string) => void;
  initialValue?: string;
  showRecentSearches?: boolean;
}

export function VerusIDSearchBar({
  onSelect,
  initialValue = '',
  showRecentSearches = true,
}: VerusIDSearchBarProps) {
  const tVerusId = useTranslations('verusid');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Load recent searches from localStorage
  useEffect(() => {
    if (showRecentSearches) {
      try {
        const saved = localStorage.getItem('verusid-recent-searches');
        if (saved) {
          setRecentSearches(JSON.parse(saved));
        }
      } catch (error) {
        // Silent error handling for localStorage
      }
    }
  }, [showRecentSearches]);

  // Save search to recent
  const saveRecentSearch = (query: string) => {
    if (!showRecentSearches || !query.trim()) return;

    try {
      const updated = [query, ...recentSearches.filter(s => s !== query)].slice(
        0,
        5
      );

      setRecentSearches(updated);
      localStorage.setItem('verusid-recent-searches', JSON.stringify(updated));
    } catch (error) {
      // Silent error handling for localStorage
    }
  };

  const handleSelect = (result: any) => {
    saveRecentSearch(result.title);
    onSelect(result.title);
  };

  return (
    <Card variant="elevated" padding="lg">
      <CardHeader>
        <CardTitle as="h2">Find a VerusID</CardTitle>
        <CardDescription>
          Search by name (e.g., VerusPulse@) or I-address
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SmartSearch
          placeholder="Enter VerusID name or I-address..."
          onSelect={handleSelect}
          showRecentSearches={showRecentSearches}
          autoFocus
        />

        {/* Recent Searches Display */}
        {recentSearches.length > 0 && showRecentSearches && (
          <div className="mt-4">
            <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider">
              Recent Searches
            </p>
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((search, index) => (
                <button
                  key={index}
                  onClick={() => onSelect(search)}
                  className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-gray-300 hover:text-white transition-colors flex items-center gap-2"
                >
                  <Clock className="h-3 w-3" />
                  {search}
                </button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
