'use client';

import { VerusIDExplorer } from '@/components/verusid-explorer';
import { DonationBanner } from '@/components/donation-banner';
import { DonationWidget } from '@/components/donation-widget';

export default function VerusIDPage() {
  return (
    <div className="min-h-screen theme-bg-primary p-4 sm:p-6 lg:p-8">
      <VerusIDExplorer />
      <DonationBanner />
      <DonationWidget position="bottom-right" dismissible={true} />
    </div>
  );
}
