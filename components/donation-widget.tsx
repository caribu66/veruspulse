'use client';

import { useState, useEffect, useCallback } from 'react';
import { Heart, X, Copy, Check, Gift, QrCode } from '@phosphor-icons/react';
import Image from 'next/image';
import QRCode from 'qrcode';

interface DonationWidgetProps {
  position?: 'bottom-right' | 'bottom-left';
  dismissible?: boolean;
}

export function DonationWidget({
  position = 'bottom-right',
  dismissible = true,
}: DonationWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [qrCodeDataURL, setQrCodeDataURL] = useState<string>('');

  // VRSC donation address - replace with your actual address
  const DONATION_ADDRESS = 'RPJ39AoZBN3s2uBaCAKdsT6rvSYCGRTwWE';

  useEffect(() => {
    // Check if user has dismissed the widget
    const dismissed = localStorage.getItem('donation-widget-dismissed');
    if (dismissed) {
      setIsDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('donation-widget-dismissed', 'true');
  };

  const generateQRCode = useCallback(async () => {
    try {
      const qrDataURL = await QRCode.toDataURL(DONATION_ADDRESS, {
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
  }, []);

  // Generate QR code when modal opens and QR is shown
  useEffect(() => {
    if (isOpen && showQR) {
      generateQRCode();
    }
  }, [isOpen, showQR, generateQRCode]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(DONATION_ADDRESS);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Silent error handling for clipboard
    }
  };

  const toggleQR = () => {
    setShowQR(!showQR);
  };

  if (isDismissed && !isOpen) {
    return null;
  }

  const positionClasses =
    position === 'bottom-right' ? 'bottom-6 right-6' : 'bottom-6 left-6';

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <div
          className={`fixed ${positionClasses} z-50 flex items-center gap-2`}
        >
          {dismissible && !isDismissed && (
            <button
              onClick={handleDismiss}
              className="bg-gray-800/90 hover:bg-gray-700 text-gray-400 hover:text-white rounded-full p-2 backdrop-blur-sm border border-gray-700 transition-all"
              title="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => setIsOpen(true)}
            className="group bg-gradient-to-r from-verus-blue to-verus-green hover:from-verus-blue-dark hover:to-verus-green-dark text-white rounded-full px-6 py-3 shadow-lg hover:shadow-xl transition-all duration-300 flex items-center space-x-2 animate-pulse hover:animate-none"
          >
            <Heart className="h-5 w-5 fill-current" />
            <span className="font-medium">Support Development</span>
          </button>
        </div>
      )}

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-verus-blue/30 shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-verus-blue/20 to-verus-green/20 border-b border-verus-blue/30 p-6 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-r from-verus-blue to-verus-green rounded-full p-2">
                  <Gift className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">
                    Support This Project
                  </h3>
                  <p className="text-sm text-gray-300">
                    Help us build amazing tools for the Verus community
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Donation Address */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  VRSC Donation Address
                </label>
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <code className="text-sm text-verus-blue/80 break-all font-mono">
                      {DONATION_ADDRESS}
                    </code>
                    <button
                      onClick={handleCopy}
                      className="ml-2 p-2 bg-verus-blue/20 hover:bg-verus-blue/20 rounded-lg transition-colors flex-shrink-0"
                      title="Copy address"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-400" />
                      ) : (
                        <Copy className="h-4 w-4 text-verus-blue/80" />
                      )}
                    </button>
                  </div>

                  {/* QR Code Section */}
                  <div className="flex flex-col items-center py-4 space-y-3">
                    <button
                      onClick={toggleQR}
                      className="flex items-center space-x-2 px-4 py-2 bg-verus-blue/20 hover:bg-verus-blue/30 border border-verus-blue/30 rounded-lg transition-colors text-verus-blue/80 hover:text-verus-blue"
                    >
                      <QrCode className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        {showQR ? 'Hide QR Code' : 'Show QR Code'}
                      </span>
                    </button>

                    {showQR && qrCodeDataURL && (
                      <div className="bg-white p-4 rounded-lg shadow-lg">
                        <Image
                          src={qrCodeDataURL}
                          alt="VRSC Donation QR Code"
                          width={200}
                          height={200}
                          className="w-48 h-48"
                        />
                        <p className="text-center text-xs text-gray-600 mt-2 font-medium">
                          Scan to donate VRSC
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Impact Statement */}
              <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-yellow-300 mb-2">
                  💡 Your Donation Helps Us:
                </h4>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Maintain and improve the explorer</li>
                  <li>• Add new features and analytics</li>
                  <li>• Cover server and infrastructure costs</li>
                  <li>• Support the Verus ecosystem</li>
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-700 p-4 bg-gray-900/50">
              <p className="text-xs text-gray-400 text-center">
                All donations are voluntary and non-refundable. Thank you for
                your support! ❤️
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
