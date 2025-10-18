'use client';

import { useState, useEffect } from 'react';
import { Heart, X, Copy, Check } from '@phosphor-icons/react';
import Image from 'next/image';

export function DonationBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  const DONATION_ADDRESS = 'RPJ39AoZBN3s2uBaCAKdsT6rvSYCGRTwWE';

  useEffect(() => {
    // Check if banner has been dismissed
    const dismissed = localStorage.getItem('donation-banner-dismissed');
    const dismissedTime = dismissed ? parseInt(dismissed, 10) : 0;
    const now = Date.now();
    const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;

    // Show banner if never dismissed or if 7 days have passed
    if (!dismissed || now - dismissedTime > sevenDaysInMs) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('donation-banner-dismissed', Date.now().toString());
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(DONATION_ADDRESS);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy address:', err);
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-gradient-to-r from-verus-blue/95 to-verus-green/95 backdrop-blur-md border-t border-verus-blue/50 shadow-2xl">
      <div className="container mx-auto px-4 py-3 sm:py-4">
        <div className="flex flex-col gap-3">
          {/* Message Row - Full Width on Mobile */}
          <div className="flex items-start gap-3 text-left">
            <div className="hidden sm:block bg-white/10 rounded-full p-2 flex-shrink-0">
              <Heart className="h-5 w-5 text-white fill-current" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm sm:text-base mb-1">
                Help Keep VerusPulse Running! 🚀
              </p>
              <p className="text-white/90 text-xs sm:text-sm">
                Running this explorer costs time and resources. Your donations
                help cover server costs.
              </p>
            </div>
            {/* Dismiss button inline on desktop */}
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 p-2 hover:bg-white/10 rounded-lg transition-colors text-white/80 hover:text-white"
              title="Dismiss (will show again in 7 days)"
              aria-label="Dismiss donation banner"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Address Row - Full Width, Better Mobile Handling */}
          <div className="flex items-center gap-2 bg-black/20 rounded-lg px-3 py-2.5 backdrop-blur-sm border border-white/20 max-w-full overflow-hidden">
            <Image
              src="/verus-icon-blue.svg"
              alt="Verus"
              width={20}
              height={20}
              className="flex-shrink-0"
            />
            <code className="text-white font-mono text-xs sm:text-sm truncate flex-1 min-w-0">
              {DONATION_ADDRESS}
            </code>
            <button
              onClick={handleCopy}
              className="flex-shrink-0 p-1.5 hover:bg-white/10 rounded transition-colors"
              title="Copy address"
              aria-label="Copy donation address"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-300" />
              ) : (
                <Copy className="h-4 w-4 text-white/80" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
