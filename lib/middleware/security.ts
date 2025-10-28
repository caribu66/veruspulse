import { NextRequest, NextResponse } from 'next/server';
import { nonceProvider } from '@/lib/utils/nonce-provider';
import { VerusValidator } from '@/lib/utils/verus-validator';
import {
  UserRateLimiter,
  RATE_LIMIT_CONFIGS,
} from '@/lib/utils/user-rate-limiter';

// User-based rate limiting instances
const apiRateLimiter = new UserRateLimiter(RATE_LIMIT_CONFIGS.API);
const searchRateLimiter = new UserRateLimiter(RATE_LIMIT_CONFIGS.SEARCH);
const authRateLimiter = new UserRateLimiter(RATE_LIMIT_CONFIGS.AUTH);

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

  // SECURITY: Strict CSP policy without unsafe directives
  const nonce = nonceProvider.getNonce();
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; " +
      "script-src 'self' 'nonce-" +
      nonce +
      "'; " +
      "style-src 'self' 'nonce-" +
      nonce +
      "'; " +
      "img-src 'self' data: https: blob:; " +
      "font-src 'self' data:; " +
      "connect-src 'self' http://localhost:* ws://localhost:* wss://localhost:* https://api.verus.io; " +
      "frame-ancestors 'none'; " +
      "base-uri 'self'; " +
      "form-action 'self'; " +
      "object-src 'none'; " +
      "worker-src 'self'; " +
      "manifest-src 'self'; " +
      'upgrade-insecure-requests;'
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
  const ipAddress =
    request.headers.get('x-forwarded-for') ||
    request.headers.get('x-real-ip') ||
    'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const pathname = request.nextUrl.pathname;

  // Extract user ID from cookies or headers if available
  const userId =
    request.cookies.get('user_id')?.value ||
    request.headers.get('x-user-id') ||
    undefined;

  const sessionId =
    request.cookies.get('session_id')?.value ||
    request.headers.get('x-session-id') ||
    undefined;

  // Create request object for rate limiter
  const req = {
    userId,
    sessionId,
    ipAddress,
    userAgent,
    pathname,
  };

  let limiter: UserRateLimiter;

  if (pathname.startsWith('/api/auth/')) {
    limiter = authRateLimiter;
  } else if (pathname.includes('search') || pathname.includes('lookup')) {
    limiter = searchRateLimiter;
  } else if (pathname.startsWith('/api/')) {
    limiter = apiRateLimiter;
  } else {
    return null; // No rate limiting for other routes
  }

  const { allowed, info } = limiter.isAllowed(req);

  if (!allowed) {
    return new NextResponse(
      JSON.stringify({
        success: false,
        error: 'Rate limit exceeded. Please try again later.',
        retryAfter: info.retryAfter,
        limit: info.limit,
        remaining: info.remaining,
        resetTime: new Date(info.resetTime).toISOString(),
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': info.retryAfter?.toString() || '60',
          'X-RateLimit-Limit': info.limit.toString(),
          'X-RateLimit-Remaining': info.remaining.toString(),
          'X-RateLimit-Reset': new Date(info.resetTime).toISOString(),
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

  // Collect all parameters for validation
  const params: Record<string, any> = {};
  searchParams.forEach((value, key) => {
    params[key] = value;
  });

  // Validate all parameters using VerusValidator
  const validation = VerusValidator.validateApiParams(params);

  if (!validation.valid) {
    return new NextResponse(
      JSON.stringify({
        success: false,
        error: 'Invalid input parameters',
        details: validation.errors,
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
