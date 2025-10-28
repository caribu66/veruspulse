'use client';

import { useState } from 'react';
import {
  VERUS_WALLETS,
  generateWalletDeepLink,
  openWallet,
  type DonationParams,
} from '@/lib/wallet-integration';

export default function WalletTestComponent() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isTesting, setIsTesting] = useState(false);

  const testWalletIntegration = async () => {
    setIsTesting(true);
    setTestResults([]);

    const params: DonationParams = {
      address: 'RPJ39AoZBN3s2uBaCAKdsT6rvSYCGRTwWE',
      amount: 10,
      label: 'Test Donation',
    };

    const results: string[] = [];

    for (const wallet of VERUS_WALLETS) {
      try {
        const deepLink = generateWalletDeepLink(wallet, params);
        results.push(`✅ ${wallet.name}: ${deepLink}`);

        // Test wallet detection (simulated)
        const isAvailable = await detectWallet(wallet);
        results.push(
          `   Detection: ${isAvailable ? '✅ Available' : '❌ Not detected'}`
        );
      } catch (error) {
        results.push(`❌ ${wallet.name}: Error - ${error}`);
      }
    }

    setTestResults(results);
    setIsTesting(false);
  };

  const detectWallet = async (wallet: any): Promise<boolean> => {
    // Simulate wallet detection
    if (wallet.type === 'web') return true;

    try {
      // Try to create a hidden iframe to test the scheme
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = wallet.scheme;
      document.body.appendChild(iframe);

      // Clean up immediately
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 100);

      return true;
    } catch (error) {
      return false;
    }
  };

  const testActualWalletOpen = async (
    walletType: 'desktop' | 'mobile' | 'web'
  ) => {
    const wallet = VERUS_WALLETS.find(w => w.type === walletType);
    if (wallet) {
      try {
        await openWallet(wallet, {
          address: 'RPJ39AoZBN3s2uBaCAKdsT6rvSYCGRTwWE',
          amount: 10,
          label: 'Test Donation',
        });
        setTestResults(prev => [
          ...prev,
          `🚀 Opened ${wallet.name} successfully!`,
        ]);
      } catch (error) {
        setTestResults(prev => [
          ...prev,
          `❌ Failed to open ${wallet.name}: ${error}`,
        ]);
      }
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 space-y-4">
      <h2 className="text-xl font-semibold text-white">
        Wallet Integration Test
      </h2>

      <div className="flex gap-4">
        <button
          onClick={testWalletIntegration}
          disabled={isTesting}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
        >
          {isTesting ? 'Testing...' : 'Test Wallet Detection'}
        </button>

        <button
          onClick={() => testActualWalletOpen('desktop')}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
        >
          Test Desktop Wallet
        </button>

        <button
          onClick={() => testActualWalletOpen('mobile')}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
        >
          Test Mobile Wallet
        </button>

        <button
          onClick={() => testActualWalletOpen('web')}
          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
        >
          Test Web Wallet
        </button>
      </div>

      {testResults.length > 0 && (
        <div className="bg-gray-700 rounded-lg p-4">
          <h3 className="text-lg font-medium text-white mb-2">Test Results:</h3>
          <div className="space-y-1">
            {testResults.map((result, index) => (
              <div key={index} className="text-sm font-mono text-gray-300">
                {result}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-gray-700 rounded-lg p-4">
        <h3 className="text-lg font-medium text-white mb-2">
          Expected Deep Links:
        </h3>
        <div className="space-y-2 text-sm">
          <div className="text-gray-300">
            <strong>Desktop:</strong>{' '}
            verus://send?address=RPJ39AoZBN3s2uBaCAKdsT6rvSYCGRTwWE&amount=10&label=Test+Donation
          </div>
          <div className="text-gray-300">
            <strong>Mobile:</strong>{' '}
            verusmobile://send?address=RPJ39AoZBN3s2uBaCAKdsT6rvSYCGRTwWE&amount=10&label=Test+Donation
          </div>
          <div className="text-gray-300">
            <strong>Web:</strong>{' '}
            https://wallet.verus.io?address=RPJ39AoZBN3s2uBaCAKdsT6rvSYCGRTwWE&amount=10&label=Test+Donation
          </div>
          <div className="text-gray-300">
            <strong>CLI:</strong>{' '}
            verus-cli://send?address=RPJ39AoZBN3s2uBaCAKdsT6rvSYCGRTwWE&amount=10&label=Test+Donation
          </div>
        </div>
      </div>
    </div>
  );
}
