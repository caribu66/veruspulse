'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { House, MagnifyingGlass, User } from '@phosphor-icons/react';
import { useMobileOptimizations } from './mobile-optimizations';
import { haptics } from '@/lib/utils/haptics';
import { useTranslations } from 'next-intl';

/**
 * Mobile Bottom Navigation Bar
 *
 * Provides easy thumb-reach navigation on mobile devices
 * Follows iOS/Android native app patterns
 */

interface NavItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
}

export function MobileBottomNav() {
  const tCommon = useTranslations('common');
  const tVerusId = useTranslations('verusid');

  const { isMobile } = useMobileOptimizations();
  const pathname = usePathname();

  // Don't show on desktop
  if (!isMobile) return null;

  const navItems: NavItem[] = [
    { icon: House, label: 'Home', href: '/' },
    { icon: MagnifyingGlass, label: tCommon("search"), href: '/verusid' },
    { icon: User, label: 'Browse', href: '/verusid/browse' },
  ];

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-lg border-t border-slate-700 safe-area-inset-bottom"
      role="navigation"
      aria-label="Mobile navigation"
    >
      <div className="flex justify-around items-center h-16 px-2">
        {navItems.map(item => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => haptics.selection()}
              className={`
                flex flex-col items-center justify-center flex-1 py-2 rounded-lg
                active:bg-white/10 transition-all duration-200 safe-touch-target
                ${active ? 'text-blue-400' : 'text-slate-400'}
              `}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
            >
              <Icon
                className={`h-6 w-6 transition-colors ${
                  active ? 'text-blue-400' : 'text-slate-400'
                }`}
              />
              <span
                className={`text-xs mt-1 font-medium ${
                  active ? 'text-blue-400' : 'text-slate-400'
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
