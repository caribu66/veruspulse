import type { Metadata, Viewport } from 'next';
import { Poppins } from 'next/font/google';
import './globals.css';
import { ErrorBoundary } from '@/components/error-boundary';
import { GlobalErrorFallback } from '@/components/global-error-fallback';
import { ThemeProvider } from '@/contexts/theme-context';
import { SkipNavigation } from '@/components/skip-navigation';
import { MobileViewportFix } from '@/components/mobile-viewport-fix';
import { MobileBottomNav } from '@/components/mobile-bottom-nav';
import { PWAInstallPrompt } from '@/components/pwa-install-prompt';
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
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/verus-icon-blue.svg" type="image/svg+xml" />
        <link rel="alternate icon" href="/favicon.ico" />

        {/* PWA Manifest */}
        <link rel="manifest" href="/manifest.json" />

        {/* Theme Colors */}
        <meta name="theme-color" content="#3165d4" />
        <meta
          name="theme-color"
          media="(prefers-color-scheme: dark)"
          content="#0f172a"
        />
        <meta
          name="theme-color"
          media="(prefers-color-scheme: light)"
          content="#ffffff"
        />

        {/* Mobile Web App */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-title" content="VerusPulse" />

        {/* Apple iOS */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="apple-mobile-web-app-title" content="VerusPulse" />

        {/* Apple Touch Icons */}
        <link rel="apple-touch-icon" href="/icons/icon-180x180.png" />
        <link
          rel="apple-touch-icon"
          sizes="152x152"
          href="/icons/icon-152x152.png"
        />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/icons/icon-180x180.png"
        />
        <link
          rel="apple-touch-icon"
          sizes="167x167"
          href="/icons/icon-167x167.png"
        />

        {/* Apple Splash Screens */}
        <link
          rel="apple-touch-startup-image"
          href="/splash/iphone5.png"
          media="(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/iphone6.png"
          media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/iphoneplus.png"
          media="(device-width: 621px) and (device-height: 1104px) and (-webkit-device-pixel-ratio: 3)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/iphonex.png"
          media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/iphonexr.png"
          media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/iphonexsmax.png"
          media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/ipad.png"
          media="(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/ipadpro1.png"
          media="(device-width: 834px) and (device-height: 1112px) and (-webkit-device-pixel-ratio: 2)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/ipadpro3.png"
          media="(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/ipadpro2.png"
          media="(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)"
        />

        {/* Microsoft */}
        <meta name="msapplication-TileColor" content="#3165d4" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="msapplication-config" content="/browserconfig.xml" />

        {/* Preconnect for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
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
              <MobileBottomNav />
              <PWAInstallPrompt />
            </RealtimeDataProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
