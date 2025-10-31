'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Heart,
  X,
  Copy,
  Check,
  CurrencyBtc,
  QrCode,
} from '@phosphor-icons/react';
import Image from 'next/image';
// QRCode imported dynamically to avoid SSR issues

const DONATION_ADDRESSES = {
  VRSC: 'RPJ39AoZBN3s2uBaCAKdsT6rvSYCGRTwWE',
  BTC: '1F1r4evGaYFHxtpNizLWmvmfAB5bccNtgL',
} as const;

const SUGGESTED_AMOUNTS = {
  VRSC: [10, 25, 50, 100, 250],
  BTC: [0.001, 0.005, 0.01, 0.025, 0.05],
} as const;

export function DonationBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [qrCodeDataURL, setQrCodeDataURL] = useState<string>('');
  const [selectedCurrency, setSelectedCurrency] = useState<'VRSC' | 'BTC'>(
    'VRSC'
  );
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

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

  const generateQRCode = useCallback(async () => {
    try {
      // Dynamic import to avoid SSR issues
      const QRCode = (await import('qrcode')).default;
      const address = DONATION_ADDRESSES[selectedCurrency];
      const qrDataURL = await QRCode.toDataURL(address, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
      setQrCodeDataURL(qrDataURL);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  }, [selectedCurrency]);

  // Generate QR code when currency changes or QR is shown
  useEffect(() => {
    if (showQR) {
      generateQRCode();
    }
  }, [selectedCurrency, showQR, generateQRCode]);

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

  const handleCopyAmount = async (amount: number) => {
    try {
      const text = `${amount} ${selectedCurrency}`;
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Silent error handling for clipboard
    }
  };

  const toggleQR = () => {
    setShowQR(!showQR);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-gradient-to-r from-gray-900/95 via-gray-800/95 to-gray-900/95 backdrop-blur-md border-t border-verus-blue/20 shadow-2xl transform transition-transform duration-300 ease-in-out">
      <div className="container mx-auto px-4 py-2 sm:py-3 max-w-4xl">
        <div className="flex flex-col gap-2">
          {/* Header Row */}
          <div className="flex items-center gap-3 text-left">
            <div className="bg-verus-blue/20 rounded-full p-2 flex-shrink-0 shadow-lg border border-verus-blue/30">
              <Heart className="h-4 w-4 text-verus-blue fill-current animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-semibold text-sm">
                Help Keep VerusPulse Running!
              </h3>
              <p className="text-gray-400 text-xs leading-relaxed">
                Your donations help cover server costs and keep the network
                healthy.
              </p>
            </div>
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 p-1.5 hover:bg-white/10 rounded-lg transition-all duration-200 text-gray-400 hover:text-white hover:scale-105"
              title="Dismiss (will show again in 1 hour)"
              aria-label="Dismiss donation banner"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Currency Selection */}
          <div className="flex gap-1">
            <button
              onClick={() => setSelectedCurrency('VRSC')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                selectedCurrency === 'VRSC'
                  ? 'bg-verus-blue/30 text-white border border-verus-blue/50 shadow-lg'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-gray-600/30 hover:border-gray-500/50'
              }`}
            >
              <Image
                src="/verus-icon-blue.svg"
                alt="Verus"
                width={14}
                height={14}
                className="flex-shrink-0"
              />
              VRSC
            </button>
            <button
              onClick={() => setSelectedCurrency('BTC')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                selectedCurrency === 'BTC'
                  ? 'bg-orange-500/30 text-white border border-orange-500/50 shadow-lg'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-gray-600/30 hover:border-gray-500/50'
              }`}
            >
              <CurrencyBtc className="h-3 w-3 text-orange-400" />
              BTC
            </button>
          </div>

          {/* Address Row with QR Toggle */}
          <div className="flex items-center gap-2 bg-white/5 rounded-lg px-2.5 py-1.5 backdrop-blur-sm border border-gray-600/30">
            {selectedCurrency === 'VRSC' ? (
              <Image
                src="/verus-icon-blue.svg"
                alt="Verus"
                width={16}
                height={16}
                className="flex-shrink-0"
              />
            ) : (
              <CurrencyBtc className="h-4 w-4 text-orange-400 flex-shrink-0" />
            )}
            <code className="text-gray-300 font-mono text-xs truncate flex-1 min-w-0">
              {DONATION_ADDRESSES[selectedCurrency]}
            </code>
            <div className="flex gap-1">
              <button
                onClick={toggleQR}
                className="flex-shrink-0 p-1.5 hover:bg-white/10 rounded transition-colors"
                title="Toggle QR code"
                aria-label="Toggle QR code"
              >
                <QrCode className="h-4 w-4 text-gray-300 hover:text-white" />
              </button>
              <button
                onClick={handleCopy}
                className="flex-shrink-0 p-1.5 bg-white/5 hover:bg-white/15 rounded transition-colors border border-gray-600/30 hover:border-gray-500/50"
                title="Copy address"
                aria-label="Copy donation address"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-400" />
                ) : (
                  <Copy className="h-4 w-4 text-white" />
                )}
              </button>
            </div>
          </div>

          {/* QR Code Display */}
          {showQR && qrCodeDataURL && (
            <div className="flex justify-center pt-1">
              <div className="bg-white/10 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-gray-600/30">
                <Image
                  src={qrCodeDataURL}
                  alt={`${selectedCurrency} donation QR code`}
                  width={96}
                  height={96}
                  className="w-24 h-24"
                />
                <p className="text-center text-xs text-gray-300 mt-1 font-medium">
                  Scan to donate {selectedCurrency}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
