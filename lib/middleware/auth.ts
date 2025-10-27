import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomBytes, createHmac } from 'crypto';

// Security constants
const CSRF_TOKEN_LENGTH = 32;
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

export interface AuthenticatedUser {
  id: string;
  login: string;
  name: string;
  email: string;
  avatar_url: string;
  sessionId: string;
  csrfToken: string;
}

export interface SessionData {
  user: AuthenticatedUser;
  expiresAt: number;
  lastActivity: number;
}

/**
 * Generate a secure CSRF token
 */
export function generateCSRFToken(): string {
  return randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
}

/**
 * Generate a secure session ID
 */
export function generateSessionId(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Create a secure session cookie
 */
export function createSecureCookie(
  name: string,
  value: string,
  maxAge: number = SESSION_TIMEOUT
) {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    name,
    value,
    options: {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict' as const,
      maxAge,
      path: '/',
    },
  };
}

/**
 * Verify CSRF token
 */
export function verifyCSRFToken(token: string, sessionToken: string): boolean {
  if (!token || !sessionToken) return false;

  // In a real implementation, you'd store and verify against stored tokens
  // For now, we'll use a simple comparison
  return token === sessionToken;
}

/**
 * Get current authenticated user from session
 */
export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');

    if (!sessionCookie) return null;

    const sessionData: SessionData = JSON.parse(sessionCookie.value);

    // Check if session has expired
    if (Date.now() > sessionData.expiresAt) {
      return null;
    }

    // Check if session is inactive for too long (2 hours)
    const inactivityTimeout = 2 * 60 * 60 * 1000;
    if (Date.now() - sessionData.lastActivity > inactivityTimeout) {
      return null;
    }

    return sessionData.user;
  } catch (error) {
    console.error('Error getting authenticated user:', error);
    return null;
  }
}

/**
 * Create a new authenticated session
 */
export async function createSession(
  user: Omit<AuthenticatedUser, 'sessionId' | 'csrfToken'>
): Promise<AuthenticatedUser> {
  const sessionId = generateSessionId();
  const csrfToken = generateCSRFToken();

  const authenticatedUser: AuthenticatedUser = {
    ...user,
    sessionId,
    csrfToken,
  };

  const sessionData: SessionData = {
    user: authenticatedUser,
    expiresAt: Date.now() + SESSION_TIMEOUT,
    lastActivity: Date.now(),
  };

  const cookieStore = await cookies();
  const sessionCookie = createSecureCookie(
    'session',
    JSON.stringify(sessionData)
  );
  cookieStore.set(
    sessionCookie.name,
    sessionCookie.value,
    sessionCookie.options
  );

  return authenticatedUser;
}

/**
 * Update session activity timestamp
 */
export async function updateSessionActivity(): Promise<void> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return;

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');

    if (!sessionCookie) return;

    const sessionData: SessionData = JSON.parse(sessionCookie.value);
    sessionData.lastActivity = Date.now();

    const updatedCookie = createSecureCookie(
      'session',
      JSON.stringify(sessionData)
    );
    cookieStore.set(
      updatedCookie.name,
      updatedCookie.value,
      updatedCookie.options
    );
  } catch (error) {
    console.error('Error updating session activity:', error);
  }
}

/**
 * Destroy the current session
 */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('session');
  cookieStore.delete('github_user');
  cookieStore.delete('github_token');
}

/**
 * Authentication middleware for protected routes
 */
export function requireAuth(request: NextRequest): NextResponse | null {
  // Skip authentication for public routes
  const publicRoutes = [
    '/api/health',
    '/api/blockchain-info',
    '/api/mining-info',
    '/api/network-info',
    '/api/verus-simple',
    '/api/verus-identities',
    '/api/verus-currencies',
    '/api/verus-pbaas',
    '/api/latest-blocks',
    '/api/latest-transactions',
    '/api/mempool/size',
    '/api/docs',
  ];

  if (publicRoutes.some(route => request.nextUrl.pathname.startsWith(route))) {
    return null; // Allow public access
  }

  // For protected routes, check authentication
  const authHeader = request.headers.get('authorization');
  const sessionCookie = request.cookies.get('session');

  if (!authHeader && !sessionCookie) {
    return NextResponse.json(
      {
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      },
      { status: 401 }
    );
  }

  return null; // Allow authenticated access
}

/**
 * CSRF protection middleware
 */
export function requireCSRF(request: NextRequest): NextResponse | null {
  // Skip CSRF for GET requests
  if (request.method === 'GET') {
    return null;
  }

  // Skip CSRF for public API routes
  const publicRoutes = [
    '/api/health',
    '/api/blockchain-info',
    '/api/mining-info',
    '/api/network-info',
    '/api/verus-simple',
    '/api/verus-identities',
    '/api/verus-currencies',
    '/api/verus-pbaas',
    '/api/latest-blocks',
    '/api/latest-transactions',
    '/api/mempool/size',
    '/api/docs',
  ];

  if (publicRoutes.some(route => request.nextUrl.pathname.startsWith(route))) {
    return null;
  }

  const csrfToken = request.headers.get('x-csrf-token');
  const sessionCookie = request.cookies.get('session');

  if (!csrfToken || !sessionCookie) {
    return NextResponse.json(
      {
        success: false,
        error: 'CSRF token required',
        code: 'CSRF_REQUIRED',
      },
      { status: 403 }
    );
  }

  try {
    const sessionData: SessionData = JSON.parse(sessionCookie.value);
    if (!verifyCSRFToken(csrfToken, sessionData.user.csrfToken)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid CSRF token',
          code: 'CSRF_INVALID',
        },
        { status: 403 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid session data',
        code: 'SESSION_INVALID',
      },
      { status: 403 }
    );
  }

  return null; // CSRF check passed
}

/**
 * Rate limiting middleware for authenticated users
 */
export function rateLimitAuth(request: NextRequest): NextResponse | null {
  const user = request.cookies.get('session');

  if (!user) {
    return null; // Not authenticated, skip rate limiting
  }

  // Implement per-user rate limiting here
  // This would track requests per user session
  // For now, we'll rely on the global rate limiter

  return null;
}
