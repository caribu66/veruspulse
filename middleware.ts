import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { locales, defaultLocale } from './i18n';

// Create the i18n middleware
const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed', // Don't show locale prefix for default language
});

export function middleware(request: NextRequest) {
  // Skip i18n for API routes, static files, and PWA files
  if (
    request.nextUrl.pathname.startsWith('/api') ||
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.includes('/icons/') ||
    request.nextUrl.pathname.includes('/splash/') ||
    request.nextUrl.pathname === '/manifest.json' ||
    request.nextUrl.pathname === '/browserconfig.xml' ||
    request.nextUrl.pathname === '/robots.txt' ||
    request.nextUrl.pathname === '/sitemap.xml' ||
    request.nextUrl.pathname.match(/\.(ico|png|jpg|jpeg|svg|webp|gif)$/i)
  ) {
    // Create response for API routes
    const response = NextResponse.next();

    // SECURITY: Restrict CORS to specific trusted domains only
    if (request.nextUrl.pathname.startsWith('/api/')) {
      const origin = request.headers.get('origin');
      const allowedOrigins = [
        'https://veruspulse.com',
        'https://www.veruspulse.com',
        'http://localhost:3000',
        'http://localhost:3004',
      ];

      // Only allow requests from trusted origins
      if (origin && allowedOrigins.includes(origin)) {
        response.headers.set('Access-Control-Allow-Origin', origin);
      } else {
        // For development, allow localhost with specific ports
        if (
          process.env.NODE_ENV === 'development' &&
          origin?.startsWith('http://localhost:')
        ) {
          response.headers.set('Access-Control-Allow-Origin', origin);
        }
      }

      response.headers.set(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, DELETE, OPTIONS'
      );
      response.headers.set(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, X-Requested-With'
      );
      response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
    }

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 200, headers: response.headers });
    }

    return response;
  }

  // Apply i18n middleware for all other routes
  return intlMiddleware(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
