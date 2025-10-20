import type { Metadata, Viewport } from 'next';
import { Poppins } from 'next/font/google';
import './globals.css';
import { ErrorBoundary } from '@/components/error-boundary';
import { GlobalErrorFallback } from '@/components/global-error-fallback';
import { ThemeProvider } from '@/contexts/theme-context';
import { SkipNavigation } from '@/components/skip-navigation';
import { MobileViewportFix } from '@/components/mobile-optimizations';
import { ToastProvider } from '@/components/ui/toast';
import { RealtimeDataProvider } from '@/components/realtime-data-provider';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-poppins',
});

export const metadata: Metadata = {
  title: 'VerusPulse - The Internet of Value',
  description:
    'Explore the Verus Protocol ecosystem - The Internet of Value. Track Smart Transactions, analyze PBaaS chains, monitor staking rewards, explore VerusID identity system, and discover protocol-level currencies across the multi-chain Verus network.',
  keywords:
    'Verus, blockchain, explorer, PBaaS, VerusID, staking, DeFi, cryptocurrency',
  authors: [{ name: 'VerusPulse' }],
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
        <link rel="icon" href="/verus-icon-white.svg" type="image/svg+xml" />
        <link rel="alternate icon" href="/favicon.ico" />
        <meta name="theme-color" content="#3165d4" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
      </head>
      <body className={poppins.className}>
        <ThemeProvider>
          <ToastProvider>
            <RealtimeDataProvider>
              <MobileViewportFix />
              <SkipNavigation />
              <ErrorBoundary fallback={<GlobalErrorFallback />}>
                {children}
              </ErrorBoundary>
            </RealtimeDataProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
