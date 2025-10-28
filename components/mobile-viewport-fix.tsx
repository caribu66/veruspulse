'use client';

import { useEffect } from 'react';

/**
 * Mobile Viewport Height Fix
 *
 * Fixes the viewport height issue on mobile browsers where 100vh
 * includes the address bar and bottom navigation, causing content
 * to be hidden when they're visible.
 *
 * Sets a CSS custom property --vh that can be used instead of vh units:
 * height: calc(var(--vh, 1vh) * 100)
 */
export function MobileViewportFix() {
  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    // Function to set the viewport height
    const setVH = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    // Set initial value
    setVH();

    // Update on resize and orientation change
    window.addEventListener('resize', setVH);
    window.addEventListener('orientationchange', setVH);

    // Cleanup
    return () => {
      window.removeEventListener('resize', setVH);
      window.removeEventListener('orientationchange', setVH);
    };
  }, []);

  return null;
}
