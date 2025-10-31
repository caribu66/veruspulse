/**
 * SEO Metadata Generation Utilities
 * Next.js 15 App Router Metadata API
 *
 * @see https://nextjs.org/docs/app/api-reference/functions/generate-metadata
 */

import type { Metadata } from 'next';

// Base configuration
const siteConfig = {
  name: 'VerusPulse',
  description: 'Real-time Verus blockchain explorer and network statistics. Track blocks, transactions, VerusID identities, and staking activity on the Verus network.',
  url: process.env.NEXT_PUBLIC_APP_URL || 'https://veruspulse.com',
  ogImage: '/og-image.png',
  twitterHandle: '@veruscoin',
  locale: 'en_US',
  author: 'VerusPulse Team',
} as const;

/**
 * Generate base metadata for all pages
 */
export function generateBaseMetadata(overrides?: Partial<Metadata>): Metadata {
  return {
    metadataBase: new URL(siteConfig.url),
    title: {
      default: siteConfig.name,
      template: `%s | ${siteConfig.name}`,
    },
    description: siteConfig.description,
    applicationName: siteConfig.name,
    authors: [{ name: siteConfig.author }],
    generator: 'Next.js',
    keywords: [
      'Verus',
      'VerusCoin',
      'blockchain explorer',
      'cryptocurrency',
      'VerusID',
      'PBaaS',
      'staking',
      'proof of stake',
      'blockchain analytics',
    ],
    referrer: 'origin-when-cross-origin',
    creator: siteConfig.author,
    publisher: siteConfig.author,
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    alternates: {
      canonical: siteConfig.url,
    },
    icons: {
      icon: [
        { url: '/verus-icon-blue.svg', type: 'image/svg+xml' },
        { url: '/favicon.ico', sizes: 'any' },
      ],
      apple: [
        { url: '/icons/icon-180x180.png', sizes: '180x180' },
        { url: '/icons/icon-152x152.png', sizes: '152x152' },
      ],
    },
    manifest: '/manifest.json',
    openGraph: {
      type: 'website',
      locale: siteConfig.locale,
      url: siteConfig.url,
      siteName: siteConfig.name,
      title: siteConfig.name,
      description: siteConfig.description,
      images: [
        {
          url: siteConfig.ogImage,
          width: 1200,
          height: 630,
          alt: `${siteConfig.name} - Verus Blockchain Explorer`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      site: siteConfig.twitterHandle,
      creator: siteConfig.twitterHandle,
      title: siteConfig.name,
      description: siteConfig.description,
      images: [siteConfig.ogImage],
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: 'black-translucent',
      title: siteConfig.name,
    },
    formatDetection: {
      telephone: false,
      email: false,
      address: false,
    },
    ...overrides,
  };
}

/**
 * Generate metadata for block pages
 */
export function generateBlockMetadata(params: {
  hash: string;
  height?: number;
  transactions?: number;
}): Metadata {
  const { hash, height, transactions } = params;
  const title = height ? `Block #${height}` : `Block ${hash.substring(0, 10)}...`;
  const description = `View detailed information for ${title} on the Verus blockchain${
    transactions ? `, including ${transactions} transaction${transactions !== 1 ? 's' : ''}` : ''
  }.`;

  return generateBaseMetadata({
    title,
    description,
    alternates: {
      canonical: `${siteConfig.url}/block/${hash}`,
    },
    openGraph: {
      type: 'website',
      url: `${siteConfig.url}/block/${hash}`,
      title: `${title} | ${siteConfig.name}`,
      description,
    },
    twitter: {
      card: 'summary',
      title: `${title} | ${siteConfig.name}`,
      description,
    },
  });
}

/**
 * Generate metadata for transaction pages
 */
export function generateTransactionMetadata(params: {
  txid: string;
  type?: string;
  amount?: number;
}): Metadata {
  const { txid, type, amount } = params;
  const title = `Transaction ${txid.substring(0, 10)}...`;
  const description = `View details for this ${type || 'transaction'} on the Verus blockchain${
    amount ? ` (${amount.toFixed(8)} VRSC)` : ''
  }.`;

  return generateBaseMetadata({
    title,
    description,
    alternates: {
      canonical: `${siteConfig.url}/transaction/${txid}`,
    },
    openGraph: {
      type: 'website',
      url: `${siteConfig.url}/transaction/${txid}`,
      title: `${title} | ${siteConfig.name}`,
      description,
    },
    robots: {
      index: true,
      follow: true,
    },
  });
}

/**
 * Generate metadata for address pages
 */
export function generateAddressMetadata(params: {
  address: string;
  balance?: number;
  transactions?: number;
}): Metadata {
  const { address, balance, transactions } = params;
  const shortAddress = `${address.substring(0, 8)}...${address.substring(address.length - 6)}`;
  const title = `Address ${shortAddress}`;
  const description = `View balance, transactions, and activity for Verus address ${shortAddress}${
    balance !== undefined ? `. Current balance: ${balance.toFixed(8)} VRSC` : ''
  }${transactions ? `. ${transactions} transaction${transactions !== 1 ? 's' : ''}` : ''}.`;

  return generateBaseMetadata({
    title,
    description,
    alternates: {
      canonical: `${siteConfig.url}/address/${address}`,
    },
    openGraph: {
      type: 'website',
      url: `${siteConfig.url}/address/${address}`,
      title: `${title} | ${siteConfig.name}`,
      description,
    },
    robots: {
      index: false, // Don't index individual addresses for privacy
      follow: true,
    },
  });
}

/**
 * Generate metadata for VerusID pages
 */
export function generateVerusIDMetadata(params: {
  name: string;
  friendlyName?: string;
  primaryAddress?: string;
  stakingRewards?: number;
}): Metadata {
  const { name, friendlyName, primaryAddress, stakingRewards } = params;
  const displayName = friendlyName || `${name}@`;
  const title = `VerusID: ${displayName}`;
  const description = `Explore ${displayName} identity on the Verus blockchain. View staking activity, transactions, and network participation${
    stakingRewards ? `. Total staking rewards: ${stakingRewards.toFixed(2)} VRSC` : ''
  }.`;

  return generateBaseMetadata({
    title,
    description,
    alternates: {
      canonical: `${siteConfig.url}/verusid/${primaryAddress || name}`,
    },
    openGraph: {
      type: 'profile',
      url: `${siteConfig.url}/verusid/${primaryAddress || name}`,
      title: `${title} | ${siteConfig.name}`,
      description,
    },
    twitter: {
      card: 'summary',
      title: `${title} | ${siteConfig.name}`,
      description,
    },
    robots: {
      index: true,
      follow: true,
    },
  });
}

/**
 * Generate JSON-LD structured data for rich results
 */
export function generateStructuredData(type: 'Organization' | 'WebApplication') {
  if (type === 'Organization') {
    return {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: siteConfig.name,
      url: siteConfig.url,
      logo: `${siteConfig.url}/verus-icon-blue.svg`,
      description: siteConfig.description,
      sameAs: [
        'https://twitter.com/veruscoin',
        'https://github.com/VerusCoin',
        'https://discord.gg/VRKMP2S',
      ],
    };
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: siteConfig.name,
    url: siteConfig.url,
    description: siteConfig.description,
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'All',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    featureList: [
      'Real-time blockchain monitoring',
      'Block explorer',
      'Transaction tracking',
      'VerusID identity system',
      'Staking statistics',
      'Network analytics',
    ],
  };
}

/**
 * Generate sitemap entry
 */
export interface SitemapEntry {
  url: string;
  lastModified?: Date;
  changeFrequency?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

export function generateSitemapEntry(
  path: string,
  options?: Partial<SitemapEntry>
): SitemapEntry {
  return {
    url: `${siteConfig.url}${path}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.7,
    ...options,
  };
}

/**
 * Static pages for sitemap
 */
export const staticPages: SitemapEntry[] = [
  generateSitemapEntry('/', {
    changeFrequency: 'hourly',
    priority: 1.0,
  }),
  generateSitemapEntry('/verusid/browse', {
    changeFrequency: 'daily',
    priority: 0.8,
  }),
];

export { siteConfig };

