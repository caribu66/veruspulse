'use client';

import { use, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { VerusIDStakingDashboard } from '@/components/verusid-staking-dashboard';
import { DonationBanner } from '@/components/donation-banner';
import { DonationWidget } from '@/components/donation-widget';
import { BackButton } from '@/components/ui/back-button';
// Removed direct import of server-side function
import { WarningCircle, Spinner } from '@phosphor-icons/react';

export default function VerusIDDetailPage({
  params,
}: {
  params: Promise<{ iaddr: string }>;
}) {
  const { iaddr } = use(params);
  const tVerusID = useTranslations('verusid');
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolvedIaddr, setResolvedIaddr] = useState<string | null>(null);

  // Get the returnTo parameter from URL
  const returnTo = searchParams.get('returnTo') || '/verusid';

  useEffect(() => {
    const resolveIdentity = async () => {
      try {
        setLoading(true);
        setError(null);

        // Check if this is already an I-address (starts with 'i')
        if (iaddr.startsWith('i') && iaddr.length > 20) {
          // It's already an I-address, use it directly
          setResolvedIaddr(iaddr);
          setLoading(false);
          return;
        }

        // It's a friendly name, resolve it
        const cleanName = iaddr.replace(/@$/, '');
        const searchName = cleanName.includes('@')
          ? cleanName
          : `${cleanName}@`;

        console.log(`Resolving VerusID: ${searchName}`);

        // Resolve the VerusID to get the I-address via API
        const response = await fetch('/api/verusid/resolve', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ verusId: searchName }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to resolve VerusID');
        }

        const identity = await response.json();

        if (identity && identity.identityAddress) {
          console.log(
            `Resolved ${searchName} to I-address: ${identity.identityAddress}`
          );
          setResolvedIaddr(identity.identityAddress);

          // Update the URL to use the I-address
          router.replace(`/verusid/${identity.identityAddress}`, {
            scroll: false,
          });
        } else {
          setError(`VerusID "${searchName}" not found on the blockchain`);
        }
      } catch (err: any) {
        console.error('Error resolving VerusID:', err);
        setError(err.message || `Failed to resolve VerusID "${iaddr}"`);
      } finally {
        setLoading(false);
      }
    };

    resolveIdentity();
  }, [iaddr, router]);

  if (loading) {
    return (
      <div className="min-h-screen theme-bg-primary p-4 sm:p-6 lg:p-8 flex items-center justify-center">
        <div className="bg-gradient-to-r from-slate-800/50 to-slate-700/50 backdrop-blur-sm rounded-3xl p-8 border border-slate-600/30 shadow-2xl text-center max-w-md w-full">
          <div className="flex flex-col items-center space-y-4">
            <Spinner className="h-12 w-12 text-verus-blue animate-spin" />
            <h2 className="text-xl font-semibold text-white">
              {tVerusID('resolvingVerusID')}
            </h2>
            <p className="text-gray-400 text-sm">
              {tVerusID('lookingUpOnBlockchain', { name: iaddr })}
            </p>
          </div>
        </div>
        <DonationWidget position="bottom-right" dismissible={true} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen theme-bg-primary p-4 sm:p-6 lg:p-8 flex items-center justify-center">
        <div className="bg-gradient-to-r from-red-500/10 to-red-600/10 backdrop-blur-sm rounded-3xl p-8 border border-red-500/30 shadow-2xl text-center max-w-md w-full">
          <div className="flex flex-col items-center space-y-4">
            <WarningCircle className="h-12 w-12 text-red-400" />
            <h2 className="text-xl font-semibold text-white">
              {tVerusID('verusIDNotFound')}
            </h2>
            <p className="text-red-300 text-sm">{error}</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <BackButton
                fallbackPath={returnTo}
                label={tVerusID('backToBrowse')}
                size="md"
                variant="default"
              />
              <button
                onClick={() => router.push(returnTo)}
                className="px-4 py-2 bg-verus-blue hover:bg-verus-blue/80 rounded-lg text-white text-sm font-medium transition-colors"
              >
                {tVerusID('browseVerusIDs')}
              </button>
            </div>
          </div>
        </div>
        <DonationWidget position="bottom-right" dismissible={true} />
      </div>
    );
  }

  if (resolvedIaddr) {
    return (
      <div className="min-h-screen theme-bg-primary p-2 sm:p-4 lg:p-6 xl:p-8">
        <VerusIDStakingDashboard
          iaddr={resolvedIaddr}
          layout="full"
          verusID={iaddr}
          showBackButton={true}
          returnTo={returnTo}
        />
        <DonationBanner />
        <DonationWidget position="bottom-right" dismissible={true} />
      </div>
    );
  }

  return null;
}
