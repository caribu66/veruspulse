import { AnimationShowcase } from '@/components/animation-showcase';

export const dynamic = 'force-dynamic';

export default function AnimationShowcasePage() {
  return (
    <div className="min-h-screen theme-bg-primary p-4 sm:p-6 lg:p-8">
      <AnimationShowcase />
    </div>
  );
}
