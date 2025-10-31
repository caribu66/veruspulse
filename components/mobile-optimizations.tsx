'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

// Mobile-specific optimizations hook
export function useMobileOptimizations() {
  const [isMobile, setIsMobile] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(0);

  useEffect(() => {
    // Check if we're in the browser
    if (typeof window === 'undefined') {
      return;
    }

    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      const touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const vh = window.innerHeight;

      setIsMobile(mobile);
      setIsTouchDevice(touch);
      setViewportHeight(vh);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    window.addEventListener('orientationchange', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('orientationchange', checkMobile);
    };
  }, []);

  return {
    isMobile,
    isTouchDevice,
    viewportHeight,
  };
}

// Mobile-friendly loading component
export function MobileLoadingSpinner({
  size = 'medium',
}: {
  size?: 'small' | 'medium' | 'large';
}) {
  const { isMobile } = useMobileOptimizations();
  const tCommon = useTranslations('common');

  const sizeClasses = {
    small: 'h-6 w-6',
    medium: isMobile ? 'h-8 w-8' : 'h-12 w-12',
    large: isMobile ? 'h-12 w-12' : 'h-16 w-16',
  } as const;

  return (
    <div className="flex items-center justify-center p-4">
      <div
        className={cn(
          'animate-spin rounded-full border-b-2 border-blue-500',
          sizeClasses[size]
        )}
        role="status"
        aria-label={tCommon("loading")}
      >
        <span className="sr-only">{tCommon("loading")}</span>
      </div>
    </div>
  );
}

// Mobile-optimized card component
export function MobileCard({
  children,
  className = '',
  onClick,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
  className?: string;
}) {
  const { isMobile, isTouchDevice } = useMobileOptimizations();

  return (
    <div
      className={cn(
        'theme-card rounded-xl transition-all duration-200',
        isMobile ? 'p-3' : 'p-6',
        onClick && 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]',
        isTouchDevice && 'touch-manipulation',
        className
      )}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
}

// Mobile-optimized button component
export function MobileButton({
  children,
  variant = 'primary',
  size = 'medium',
  className = '',
  onClick,
  disabled = false,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'small' | 'medium' | 'large';
}) {
  const { isMobile, isTouchDevice } = useMobileOptimizations();

  const variantClasses = {
    primary: 'theme-button',
    secondary: 'bg-white/10 hover:bg-white/20 text-white',
    ghost: 'bg-transparent hover:bg-white/10 text-white',
  } as const;

  const sizeClasses = {
    small: isMobile ? 'px-3 py-1.5 text-sm' : 'px-4 py-2 text-sm',
    medium: isMobile ? 'px-4 py-2 text-sm' : 'px-6 py-3 text-base',
    large: isMobile ? 'px-6 py-3 text-base' : 'px-8 py-4 text-lg',
  } as const;

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-medium',
        'transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50',
        variantClasses[variant],
        sizeClasses[size],
        isTouchDevice && 'touch-manipulation',
        disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95',
        className
      )}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}

// Mobile-optimized grid component
export function MobileGrid({
  children,
  cols = 1,
  gap = 4,
  className = '',
}: {
  children: React.ReactNode;
  cols?: number;
  gap?: number;
  className?: string;
}) {
  const { isMobile } = useMobileOptimizations();

  const gridCols = isMobile
    ? cols === 1 ? 'grid-cols-1' : 'grid-cols-2'
    : `grid-cols-${cols}`;

  const gridGap = isMobile ? 'gap-3' : `gap-${gap}`;

  return (
    <div className={cn('grid', gridCols, gridGap, className)}>
      {children}
    </div>
  );
}

// Mobile-optimized text component
export function MobileText({
  children,
  size = 'base',
  weight = 'normal',
  className = '',
}: {
  children: React.ReactNode;
  size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl';
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  className?: string;
}) {
  const { isMobile } = useMobileOptimizations();

  const getSizeClass = () => {
    if (isMobile) {
      switch (size) {
        case 'xs':
          return 'text-xs';
        case 'sm':
          return 'text-sm';
        case 'base':
          return 'text-sm';
        case 'lg':
          return 'text-base';
        case 'xl':
          return 'text-lg';
        case '2xl':
          return 'text-xl';
        default:
          return 'text-sm';
      }
    }
    return `text-${size}`;
  };

  const getWeightClass = () => {
    return `font-${weight}`;
  };

  return (
    <span
      className={cn('theme-text-primary', getSizeClass(), getWeightClass(), className)}
    >
      {children}
    </span>
  );
}

// Mobile viewport height fix
export function MobileViewportFix() {
  // const { viewportHeight } = useMobileOptimizations();

  useEffect(() => {
    // Check if we're in the browser
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    // Fix for mobile viewport height issues
    const setVH = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    setVH();
    window.addEventListener('resize', setVH);
    window.addEventListener('orientationchange', setVH);

    return () => {
      window.removeEventListener('resize', setVH);
      window.removeEventListener('orientationchange', setVH);
    };
  }, []);

  return null;
}
