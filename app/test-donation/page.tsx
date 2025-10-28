'use client';

import { useState } from 'react';
import { DonationWidget } from '@/components/donation-widget';
import { DonationBanner } from '@/components/donation-banner';
import QRCode from 'qrcode';

export default function DonationTestPage() {
  const [testQR, setTestQR] = useState<string>('');
  const [testAddress] = useState('RPJ39AoZBN3s2uBaCAKdsT6rvSYCGRTwWE');

  const testQRGeneration = async () => {
    try {
      const qrDataURL = await QRCode.toDataURL(testAddress, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
      setTestQR(qrDataURL);
    } catch (error) {
      console.error('QR generation test failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-white text-center">
          Donation System Test Page
        </h1>

        {/* Test Controls */}
        <div className="bg-gray-800 rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold text-white">Test Controls</h2>

          <div className="flex gap-4">
            <button
              onClick={testQRGeneration}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Test QR Generation
            </button>
          </div>

          {testQR && (
            <div className="mt-4">
              <h3 className="text-lg font-medium text-white mb-2">
                Generated QR Code:
              </h3>
              <div className="bg-white p-4 rounded-lg inline-block">
                <img src={testQR} alt="Test QR Code" className="w-48 h-48" />
              </div>
            </div>
          )}
        </div>

        {/* Test Components */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            Test Components
          </h2>
          <p className="text-gray-300 mb-4">
            The donation banner and widget are rendered below for testing:
          </p>

          <div className="space-y-4">
            <div className="bg-gray-700 rounded-lg p-4">
              <h3 className="font-medium text-white mb-2">Donation Banner</h3>
              <DonationBanner />
            </div>

            <div className="bg-gray-700 rounded-lg p-4">
              <h3 className="font-medium text-white mb-2">Donation Widget</h3>
              <DonationWidget position="bottom-right" dismissible={true} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
