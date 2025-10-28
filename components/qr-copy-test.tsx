'use client';

import { useState } from 'react';
import { Copy, Check, QrCode } from '@phosphor-icons/react';
import QRCode from 'qrcode';

export default function QRAndCopyTest() {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [qrCodeDataURL, setQrCodeDataURL] = useState<string>('');

  const DONATION_ADDRESS = 'RPJ39AoZBN3s2uBaCAKdsT6rvSYCGRTwWE';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(DONATION_ADDRESS);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const generateQRCode = async () => {
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
  };

  const toggleQR = () => {
    if (!showQR) {
      generateQRCode();
    }
    setShowQR(!showQR);
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 space-y-4">
      <h2 className="text-xl font-semibold text-white">QR Code & Copy Test</h2>

      {/* Address Copy Section */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          VRSC Donation Address
        </label>
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <code className="text-sm text-blue-400 break-all font-mono flex-1 mr-3">
              {DONATION_ADDRESS}
            </code>
            <button
              onClick={handleCopy}
              className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex-shrink-0"
              title="Copy address"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-400" />
              ) : (
                <Copy className="h-4 w-4 text-white" />
              )}
            </button>
          </div>
          {copied && (
            <p className="text-green-400 text-sm mt-2">
              ✅ Address copied to clipboard!
            </p>
          )}
        </div>
      </div>

      {/* QR Code Section */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          QR Code
        </label>
        <div className="bg-gray-700 rounded-lg p-4">
          <button
            onClick={toggleQR}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors text-white mb-4"
          >
            <QrCode className="h-4 w-4" />
            <span className="text-sm font-medium">
              {showQR ? 'Hide QR Code' : 'Show QR Code'}
            </span>
          </button>

          {showQR && qrCodeDataURL && (
            <div className="bg-white p-4 rounded-lg shadow-lg">
              <img
                src={qrCodeDataURL}
                alt="VRSC Donation QR Code"
                className="w-48 h-48 mx-auto"
              />
              <p className="text-center text-xs text-gray-600 mt-2 font-medium">
                Scan to donate VRSC
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-300 mb-2">
          How to Test:
        </h3>
        <ul className="text-sm text-gray-300 space-y-1">
          <li>
            • <strong>Copy Address:</strong> Click the copy button next to the
            address
          </li>
          <li>
            • <strong>QR Code:</strong> Click "Show QR Code" to generate and
            display QR code
          </li>
          <li>
            • <strong>Mobile Test:</strong> Scan QR code with your phone's
            camera
          </li>
          <li>
            • <strong>Clipboard Test:</strong> Paste the copied address
            somewhere to verify
          </li>
        </ul>
      </div>
    </div>
  );
}
