import { BrowseAllVerusIDs } from '@/components/browse-all-verusids';
import { DonationWidget } from '@/components/donation-widget';

export default function BrowseVerusIDsPage() {
  return (
    <div className="min-h-screen theme-bg-primary p-4 sm:p-6 lg:p-8">
      <BrowseAllVerusIDs />
      <DonationWidget position="bottom-right" dismissible={true} />
    </div>
  );
}

