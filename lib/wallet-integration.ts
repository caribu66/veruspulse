/**
 * Wallet Integration Utilities for Verus Ecosystem
 *
 * This module provides utilities to integrate with various Verus wallets
 * including desktop wallets, mobile wallets, and web wallets.
 */

export interface WalletInfo {
  name: string;
  type: 'desktop' | 'mobile' | 'web';
  scheme: string;
  downloadUrl?: string;
  icon?: string;
  description: string;
}

export const VERUS_WALLETS: WalletInfo[] = [
  {
    name: 'Verus Desktop Wallet',
    type: 'desktop',
    scheme: 'verus://',
    downloadUrl: 'https://github.com/VerusCoin/Verus-Desktop',
    description: 'Official Verus desktop wallet',
  },
  {
    name: 'Verus Mobile Wallet',
    type: 'mobile',
    scheme: 'verusmobile://',
    downloadUrl: 'https://github.com/VerusCoin/Verus-Mobile',
    description: 'Official Verus mobile wallet',
  },
  {
    name: 'Verus Web Wallet',
    type: 'web',
    scheme: 'https://wallet.verus.io',
    description: 'Official Verus web wallet',
  },
  {
    name: 'Verus CLI',
    type: 'desktop',
    scheme: 'verus-cli://',
    downloadUrl: 'https://github.com/VerusCoin/Verus-CLI',
    description: 'Command line interface',
  },
];

export interface DonationParams {
  address: string;
  amount?: number;
  label?: string;
  message?: string;
}

/**
 * Generate deep link URL for wallet integration
 */
export function generateWalletDeepLink(
  wallet: WalletInfo,
  params: DonationParams
): string {
  const { address, amount, label, message } = params;

  switch (wallet.type) {
    case 'desktop':
    case 'mobile':
      // For native apps, use custom scheme
      const urlParams = new URLSearchParams();
      urlParams.set('address', address);
      if (amount) urlParams.set('amount', amount.toString());
      if (label) urlParams.set('label', label);
      if (message) urlParams.set('message', message);

      return `${wallet.scheme}send?${urlParams.toString()}`;

    case 'web':
      // For web wallets, use HTTP/HTTPS with query params
      const webParams = new URLSearchParams();
      webParams.set('address', address);
      if (amount) webParams.set('amount', amount.toString());
      if (label) webParams.set('label', label);
      if (message) webParams.set('message', message);

      return `${wallet.scheme}?${webParams.toString()}`;

    default:
      return `${wallet.scheme}send?address=${address}`;
  }
}

/**
 * Detect if a wallet is available on the system
 */
export async function detectWallet(wallet: WalletInfo): Promise<boolean> {
  if (wallet.type === 'web') {
    // For web wallets, we can't detect availability
    return true;
  }

  try {
    // Try to create a hidden iframe to test the scheme
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = wallet.scheme;
    document.body.appendChild(iframe);

    // Clean up immediately
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 100);

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Simple wallet opening - just open download pages or web wallet
 */
export function openWallet(wallet: WalletInfo, params: DonationParams): void {
  if (wallet.type === 'web') {
    // For web wallet, open with donation parameters
    const webUrl = `https://wallet.verus.io?address=${params.address}&amount=${params.amount || ''}&label=${params.label || ''}`;
    window.open(webUrl, '_blank', 'noopener,noreferrer');
  } else if (wallet.downloadUrl) {
    // For desktop/mobile wallets, just open download page
    window.open(wallet.downloadUrl, '_blank', 'noopener,noreferrer');
  }
}

/**
 * Generate QR code data for wallet integration
 */
export function generateQRCodeData(params: DonationParams): string {
  const { address, amount, label, message } = params;

  // Create a simple payment URI format
  let uri = `verus:${address}`;
  const queryParams = [];

  if (amount) queryParams.push(`amount=${amount}`);
  if (label) queryParams.push(`label=${encodeURIComponent(label)}`);
  if (message) queryParams.push(`message=${encodeURIComponent(message)}`);

  if (queryParams.length > 0) {
    uri += `?${queryParams.join('&')}`;
  }

  return uri;
}

/**
 * Copy donation information to clipboard
 */
export async function copyDonationInfo(params: DonationParams): Promise<void> {
  const { address, amount, label } = params;

  let text = address;
  if (amount) {
    text = `${amount} VRSC to ${address}`;
  }
  if (label) {
    text += ` (${label})`;
  }

  try {
    await navigator.clipboard.writeText(text);
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    throw error;
  }
}

/**
 * Get user's preferred wallet from localStorage
 */
export function getPreferredWallet(): WalletInfo | null {
  try {
    const stored = localStorage.getItem('preferred-wallet');
    if (stored) {
      const walletName = JSON.parse(stored);
      return VERUS_WALLETS.find(w => w.name === walletName) || null;
    }
  } catch (error) {
    console.error('Failed to get preferred wallet:', error);
  }
  return null;
}

/**
 * Set user's preferred wallet in localStorage
 */
export function setPreferredWallet(wallet: WalletInfo): void {
  try {
    localStorage.setItem('preferred-wallet', JSON.stringify(wallet.name));
  } catch (error) {
    console.error('Failed to set preferred wallet:', error);
  }
}
