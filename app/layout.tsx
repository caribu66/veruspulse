import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ErrorBoundary } from '@/components/error-boundary';
import { GlobalErrorFallback } from '@/components/global-error-fallback';
import { ThemeProvider } from '@/components/theme-provider';
import { SkipNavigation } from '@/components/skip-navigation';
import { MobileViewportFix } from '@/components/mobile-optimizations';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Verus Explorer - The Internet of Value',
  description:
    'Explore the Verus Protocol ecosystem - The Internet of Value. Track Smart Transactions, analyze PBaaS chains, monitor staking rewards, explore VerusID identity system, and discover protocol-level currencies across the multi-chain Verus network.',
  keywords:
    'Verus, blockchain, explorer, PBaaS, VerusID, staking, DeFi, cryptocurrency',
  authors: [{ name: 'Verus Explorer' }],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/5049.png" type="image/png" />
        <link rel="alternate icon" href="/favicon.ico" />
        <meta name="theme-color" content="#0f172a" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
      </head>
      <body className={inter.className}>
        <ThemeProvider>
          <MobileViewportFix />
          <SkipNavigation />
          <ErrorBoundary fallback={<GlobalErrorFallback />}>
            {children}
          </ErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  );
}
