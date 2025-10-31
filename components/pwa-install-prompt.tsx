'use client';

import { useState, useEffect } from 'react';
import { Download, X } from '@phosphor-icons/react';
import { haptics } from '@/lib/utils/haptics';
import { useTranslations } from 'next-intl';

/**
 * PWA Install Prompt
 *
 * Shows a prompt to install the app when:
 * - User is on mobile
 * - App is not already installed
 * - Browser supports installation
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const tCommon = useTranslations('common');

  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed
    const isInStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes('android-app://');

    setIsStandalone(isInStandaloneMode);

    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Check if user has dismissed the prompt before
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      const dismissedTime = parseInt(dismissed);
      const daysSinceDismissed =
        (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) {
        // Don't show for 7 days after dismissal
        return;
      }
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // Show prompt after a short delay (better UX)
      setTimeout(() => {
        if (!isInStandaloneMode) {
          setShowPrompt(true);
        }
      }, 3000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      );
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    haptics.medium();

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        haptics.success();
      }

      setDeferredPrompt(null);
      setShowPrompt(false);
    } catch (error) {
      console.error('Install prompt error:', error);
      haptics.error();
    }
  };

  const handleDismiss = () => {
    haptics.light();
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    setShowPrompt(false);
  };

  // Don't show if already installed or prompt not available
  if (isStandalone || (!showPrompt && !isIOS)) {
    return null;
  }

  // iOS Install Instructions
  if (isIOS && !isStandalone) {
    return (
      <div className="fixed bottom-20 left-4 right-4 z-40 animate-slide-up">
        <div className="bg-blue-600 rounded-xl p-4 shadow-2xl border border-blue-500">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Download className="h-5 w-5 text-white flex-shrink-0" />
              <h3 className="text-white font-semibold text-sm">
                Install VerusPulse
              </h3>
            </div>
            <button
              onClick={handleDismiss}
              className="text-white/80 hover:text-white safe-touch-target"
              aria-label="Dismiss"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="text-white/90 text-xs leading-relaxed">
            Install this app on your iPhone: tap{' '}
            <span className="inline-flex items-center px-1 py-0.5 bg-white/20 rounded">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
            </span>{' '}
            then "Add to Home Screen"
          </p>
        </div>
      </div>
    );
  }

  // Android/Chrome Install Prompt
  if (showPrompt && deferredPrompt) {
    return (
      <div className="fixed bottom-20 left-4 right-4 z-40 animate-slide-up">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-4 shadow-2xl border border-blue-500">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center space-x-3">
              <div className="bg-white rounded-lg p-2">
                <img
                  src="/verus-icon-blue.svg"
                  alt="VerusPulse"
                  className="h-8 w-8"
                />
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">
                  Install VerusPulse
                </h3>
                <p className="text-white/80 text-xs">
                  Get the full app experience
                </p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="text-white/80 hover:text-white safe-touch-target"
              aria-label="Dismiss"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <button
            onClick={handleInstallClick}
            className="w-full bg-white text-blue-600 font-semibold py-3 px-4 rounded-lg hover:bg-blue-50 transition-colors flex items-center justify-center space-x-2 safe-touch-target"
          >
            <Download className="h-5 w-5" />
            <span>Install App</span>
          </button>
        </div>
      </div>
    );
  }

  return null;
}
