'use client';

import { VerusIDExplorer } from '@/components/verusid-explorer';
import { DonationBanner } from '@/components/donation-banner';
import { DonationWidget } from '@/components/donation-widget';

export default function VerusIDPage() {
  return (
    <div className="min-h-screen theme-bg-primary p-2 sm:p-4 lg:p-6 xl:p-8 overflow-hidden">
      <main className="w-full max-w-full" role="main">
        <h1 className="sr-only">VerusID Explorer</h1>
        <VerusIDExplorer />
        <DonationBanner />
        <DonationWidget position="bottom-right" dismissible={true} />
      </main>
    </div>
  );
}
