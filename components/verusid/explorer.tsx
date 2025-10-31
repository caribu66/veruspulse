'use client';

import React, { useState } from 'react';
import { VerusIDSearchBar } from './search-bar';
import { VerusIDDetailsView } from './details-view';
import { SlidePanel } from '@/components/ui/slide-panel';
import { useApiFetch } from '@/lib/hooks/use-retryable-fetch';
import { useToast } from '@/components/ui/toast';
import { SmartError } from '@/lib/utils/error-handler';
import { useTranslations } from 'next-intl';

/**
 * Refactored VerusID Explorer
 * Simplified from 1,566 lines to ~100 lines by extracting sub-components
 *
 * Architecture:
 * - VerusIDSearchBar: Search functionality (100 lines)
 * - VerusIDDetailsView: Details with tabs (150 lines)
 * - SlidePanel: Context-preserving detail view
 * - SmartError: Contextual error handling
 * - Toast: User feedback
 */

interface VerusID {
  name: string;
  identityaddress: string;
  primaryaddresses: string[];
  status: string;
  // ... other fields
}

interface VerusIDBalance {
  totalBalance: number;
  totalReceived: number;
  totalSent: number;
  primaryAddresses: string[];
  friendlyName: string;
  identityAddress: string;
}

export function VerusIDExplorerRefactored() {
  const [selectedIdentity, setSelectedIdentity] = useState<string | null>(null);
  const [verusID, setVerusID] = useState<VerusID | null>(null);
  const [balance, setBalance] = useState<VerusIDBalance | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any | null>(null);

  const { apiFetch } = useApiFetch();
  const { toast } = useToast();

  const handleSearch = async (identityName: string) => {
    setSelectedIdentity(identityName);
    setLoading(true);
    setError(null);

    try {
      // Fetch VerusID data
      const identityData = await toast.promise(
        apiFetch(`/api/verus-identity/${encodeURIComponent(identityName)}`),
        {
          loading: 'Searching for VerusID...',
          success: 'VerusID found!',
          error: 'Failed to find VerusID',
        }
      );

      if (identityData.success) {
        setVerusID(identityData.data);

        // Fetch balance data
        try {
          const balanceData = await apiFetch(
            `/api/verusid-balance?id=${encodeURIComponent(identityName)}`
          );
          if (balanceData.success) {
            setBalance(balanceData.data);
          }
        } catch (balanceError) {
          // Non-critical, continue without balance
        }
      } else {
        throw new Error(identityData.error || 'VerusID not found');
      }
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedIdentity(null);
    setVerusID(null);
    setBalance(null);
    setError(null);
  };

  const handleRetry = () => {
    if (selectedIdentity) {
      handleSearch(selectedIdentity);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Interface */}
      <VerusIDSearchBar onSelect={handleSearch} showRecentSearches />

      {/* Details Panel */}
      <SlidePanel
        isOpen={!!selectedIdentity}
        onClose={handleClose}
        title={selectedIdentity || 'VerusID Details'}
        width="xl"
      >
        {loading && (
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full" />
          </div>
        )}

        {error && !loading && (
          <SmartError
            error={error}
            onRetry={handleRetry}
            onBack={handleClose}
          />
        )}

        {!loading && !error && verusID && (
          <VerusIDDetailsView
            identityName={selectedIdentity!}
            verusID={verusID}
            balance={balance}
            onClose={handleClose}
          />
        )}
      </SlidePanel>
    </div>
  );
}
