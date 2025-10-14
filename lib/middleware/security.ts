import { NextRequest, NextResponse } from 'next/server';
import { RateLimiter } from '@/lib/utils/validation';

// Rate limiting instances
const apiRateLimiter = new RateLimiter(60000, 100); // 100 requests per minute
const searchRateLimiter = new RateLimiter(60000, 20); // 20 searches per minute

// Enhanced security headers following Mike Toutonghi's security-first approach
export function addSecurityHeaders(response: NextResponse): NextResponse {
  // Core security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  );

  // Enhanced CSP for Verus blockchain integration
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; " +
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https: blob:; " +
      "font-src 'self' data:; " +
      "connect-src 'self' http://localhost:* ws://localhost:* wss://localhost:* https://api.verus.io; " +
      "frame-ancestors 'none'; " +
      "base-uri 'self'; " +
      "form-action 'self';"
  );

  // Additional security headers for blockchain applications
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains'
  );
  response.headers.set('X-DNS-Prefetch-Control', 'off');
  response.headers.set('X-Download-Options', 'noopen');
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');

  return response;
}

// Rate limiting middleware
export function rateLimitMiddleware(request: NextRequest): NextResponse | null {
  const ip =
    request.headers.get('x-forwarded-for') ||
    request.headers.get('x-real-ip') ||
    'unknown';
  const pathname = request.nextUrl.pathname;

  let rateLimiter: RateLimiter;

  if (pathname.startsWith('/api/')) {
    rateLimiter = apiRateLimiter;
  } else if (pathname.includes('search')) {
    rateLimiter = searchRateLimiter;
  } else {
    return null; // No rate limiting for other routes
  }

  if (!rateLimiter.isAllowed(ip)) {
    return new NextResponse(
      JSON.stringify({
        success: false,
        error: 'Rate limit exceeded. Please try again later.',
        retryAfter: 60,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '60',
        },
      }
    );
  }

  return null;
}

// Input validation middleware
export function validateInput(request: NextRequest): NextResponse | null {
  const url = request.nextUrl;
  const searchParams = url.searchParams;

  // Validate common parameters
  const address = searchParams.get('address');
  const txId = searchParams.get('txid');
  const blockHash = searchParams.get('hash');

  if (address && !/^[a-zA-Z0-9@._-]+$/.test(address)) {
    return new NextResponse(
      JSON.stringify({
        success: false,
        error: 'Invalid address format',
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (txId && !/^[a-fA-F0-9]{64}$/.test(txId)) {
    return new NextResponse(
      JSON.stringify({
        success: false,
        error: 'Invalid transaction ID format',
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (blockHash && !/^[a-fA-F0-9]{64}$/.test(blockHash)) {
    return new NextResponse(
      JSON.stringify({
        success: false,
        error: 'Invalid block hash format',
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return null;
}

// CORS middleware
export function corsMiddleware(request: NextRequest): NextResponse | null {
  const origin = request.headers.get('origin');
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'https://verus-explorer.vercel.app', // Add your production domain
  ];

  if (origin && !allowedOrigins.includes(origin)) {
    return new NextResponse(
      JSON.stringify({
        success: false,
        error: 'CORS policy violation',
      }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return null;
}

// Main security middleware
export function securityMiddleware(request: NextRequest): NextResponse | null {
  // Apply rate limiting
  const rateLimitResponse = rateLimitMiddleware(request);
  if (rateLimitResponse) return rateLimitResponse;

  // Apply input validation
  const validationResponse = validateInput(request);
  if (validationResponse) return validationResponse;

  // Apply CORS
  const corsResponse = corsMiddleware(request);
  if (corsResponse) return corsResponse;

  return null;
}
