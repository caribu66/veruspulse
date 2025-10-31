'use client';

import { VerusIDExplorer } from '@/components/verusid-explorer';
import dynamic from 'next/dynamic';

// Dynamic imports to avoid SSR issues with QRCode library
const DonationBanner = dynamic(
  () =>
    import('@/components/donation-banner').then(mod => ({
      default: mod.DonationBanner,
    })),
  { ssr: false }
);
const DonationWidget = dynamic(
  () =>
    import('@/components/donation-widget').then(mod => ({
      default: mod.DonationWidget,
    })),
  { ssr: false }
);

export default function VerusIDPage() {
  return (
    <div className="min-h-screen theme-bg-primary p-2 sm:p-4 lg:p-6 xl:p-8 overflow-hidden">
      <main className="w-full max-w-full" role="main">
        <h1 className="sr-only">VerusID Explorer</h1>
        <VerusIDExplorer />
      </main>
    </div>
  );
}
