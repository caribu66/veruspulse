'use client';

import { useState, useEffect } from 'react';
import { Heart, X, Copy, Check, CurrencyBtc } from '@phosphor-icons/react';
import Image from 'next/image';

export function DonationBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<'VRSC' | 'BTC'>('VRSC');

  const DONATION_ADDRESSES = {
    VRSC: 'RPJ39AoZBN3s2uBaCAKdsT6rvSYCGRTwWE',
    BTC: '1F1r4evGaYFHxtpNizLWmvmfAB5bccNtgL'
  };

  useEffect(() => {
    // Check if banner has been dismissed
    const dismissed = localStorage.getItem('donation-banner-dismissed');
    const dismissedTime = dismissed ? parseInt(dismissed, 10) : 0;
    const now = Date.now();
    const oneHourInMs = 60 * 60 * 1000; // 1 hour in milliseconds

    // Show banner if never dismissed or if 1 hour has passed
    if (!dismissed || now - dismissedTime > oneHourInMs) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('donation-banner-dismissed', Date.now().toString());
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(DONATION_ADDRESSES[selectedCurrency]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Silent error handling for clipboard
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-gradient-to-r from-verus-blue to-verus-green backdrop-blur-md border-t border-verus-blue/30 shadow-2xl dark:from-verus-blue/95 dark:to-verus-green/95">
      <div className="container mx-auto px-4 py-2 sm:py-2.5">
        <div className="flex flex-col gap-2">
          {/* Message Row - Full Width on Mobile */}
          <div className="flex items-start gap-3 text-left">
            <div className="hidden sm:block bg-white/10 dark:bg-white/10 rounded-full p-2 flex-shrink-0">
              <Heart className="h-5 w-5 text-white fill-current" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm sm:text-base mb-1">
                Help Keep VerusPulse Running! 🚀
              </p>
              <p className="text-white dark:text-white/90 text-xs sm:text-sm">
                Running this explorer costs time and resources. Your donations
                help cover server costs.
              </p>
            </div>
            {/* Dismiss button inline on desktop */}
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 p-2 hover:bg-white/20 dark:hover:bg-white/10 rounded-lg transition-colors text-white/90 hover:text-white"
              title="Dismiss (will show again in 1 hour)"
              aria-label="Dismiss donation banner"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Currency Selection */}
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => setSelectedCurrency('VRSC')}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                selectedCurrency === 'VRSC'
                  ? 'bg-white/25 dark:bg-white/20 text-white border border-white/40 dark:border-white/30'
                  : 'bg-white/10 dark:bg-black/20 text-white/80 dark:text-white/70 hover:bg-white/20 dark:hover:bg-white/10 border border-white/20 dark:border-white/10'
              }`}
            >
              <Image
                src="/verus-icon-blue.svg"
                alt="Verus"
                width={16}
                height={16}
                className="flex-shrink-0"
              />
              VRSC
            </button>
            <button
              onClick={() => setSelectedCurrency('BTC')}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                selectedCurrency === 'BTC'
                  ? 'bg-white/25 dark:bg-white/20 text-white border border-white/40 dark:border-white/30'
                  : 'bg-white/10 dark:bg-black/20 text-white/80 dark:text-white/70 hover:bg-white/20 dark:hover:bg-white/10 border border-white/20 dark:border-white/10'
              }`}
            >
              <CurrencyBtc className="h-4 w-4 text-orange-400" />
              BTC
            </button>
          </div>

          {/* Address Row - Full Width, Better Mobile Handling */}
          <div className="flex items-center gap-2 bg-white/10 dark:bg-black/20 rounded-lg px-3 py-1.5 backdrop-blur-sm border border-white/30 dark:border-white/20 max-w-full overflow-hidden">
            {selectedCurrency === 'VRSC' ? (
              <Image
                src="/verus-icon-blue.svg"
                alt="Verus"
                width={20}
                height={20}
                className="flex-shrink-0"
              />
            ) : (
              <CurrencyBtc className="h-5 w-5 text-orange-400 flex-shrink-0" />
            )}
            <code className="text-white font-mono text-xs sm:text-sm truncate flex-1 min-w-0">
              {DONATION_ADDRESSES[selectedCurrency]}
            </code>
            <button
              onClick={handleCopy}
              className="flex-shrink-0 p-1.5 hover:bg-white/20 dark:hover:bg-white/10 rounded transition-colors"
              title="Copy address"
              aria-label="Copy donation address"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-300" />
              ) : (
                <Copy className="h-4 w-4 text-white" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
