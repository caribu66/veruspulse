/**
 * Authentication and Authorization System
 * Provides JWT-based authentication and role-based access control
 */

import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { logger } from './logger';

export interface User {
  id: string;
  email?: string;
  name?: string;
  role: 'admin' | 'user' | 'guest';
  permissions: string[];
  createdAt: number;
  lastLogin: number;
}

export interface AuthToken {
  user: User;
  iat: number;
  exp: number;
  iss: string;
}

export interface AuthResult {
  success: boolean;
  user?: User;
  error?: string;
  token?: string;
}

export class AuthService {
  private static readonly JWT_SECRET = process.env.JWT_SECRET;
  private static readonly TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
  private static readonly REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days

  /**
   * Generate JWT secret key
   */
  private static getSecretKey(): Uint8Array {
    if (!this.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    return new TextEncoder().encode(this.JWT_SECRET);
  }

  /**
   * Create authentication token
   */
  static async createToken(user: User): Promise<string> {
    const secretKey = this.getSecretKey();
    const now = Date.now();

    const token = await new SignJWT({
      user: {
        ...user,
        lastLogin: now,
      },
      iat: Math.floor(now / 1000),
      exp: Math.floor((now + this.TOKEN_EXPIRY) / 1000),
      iss: 'verus-explorer',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(Math.floor((now + this.TOKEN_EXPIRY) / 1000))
      .sign(secretKey);

    return token;
  }

  /**
   * Verify authentication token
   */
  static async verifyToken(token: string): Promise<AuthResult> {
    try {
      const secretKey = this.getSecretKey();
      const { payload } = await jwtVerify(token, secretKey);

      const authToken = payload as unknown as AuthToken;

      // Check if token is expired
      if (authToken.exp < Math.floor(Date.now() / 1000)) {
        return {
          success: false,
          error: 'Token expired',
        };
      }

      return {
        success: true,
        user: authToken.user,
      };
    } catch (error) {
      logger.error('Token verification failed:', error);
      return {
        success: false,
        error: 'Invalid token',
      };
    }
  }

  /**
   * Get user from request
   */
  static async getUserFromRequest(request: Request): Promise<User | null> {
    try {
      // Try to get token from Authorization header
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const result = await this.verifyToken(token);
        if (result.success && result.user) {
          return result.user;
        }
      }

      // Try to get token from cookies
      const cookieStore = await cookies();
      const tokenCookie = cookieStore.get('auth_token');
      if (tokenCookie) {
        const result = await this.verifyToken(tokenCookie.value);
        if (result.success && result.user) {
          return result.user;
        }
      }

      return null;
    } catch (error) {
      logger.error('Failed to get user from request:', error);
      return null;
    }
  }

  /**
   * Check if user has permission
   */
  static hasPermission(user: User, permission: string): boolean {
    return user.permissions.includes(permission) || user.role === 'admin';
  }

  /**
   * Check if user has role
   */
  static hasRole(user: User, role: string): boolean {
    return user.role === role || user.role === 'admin';
  }

  /**
   * Create guest user
   */
  static createGuestUser(): User {
    return {
      id: 'guest_' + Date.now(),
      role: 'guest',
      permissions: ['read:public'],
      createdAt: Date.now(),
      lastLogin: Date.now(),
    };
  }

  /**
   * Create admin user (for testing)
   */
  static createAdminUser(id: string = 'admin'): User {
    return {
      id,
      email: 'admin@veruspulse.com',
      name: 'Administrator',
      role: 'admin',
      permissions: ['*'], // All permissions
      createdAt: Date.now(),
      lastLogin: Date.now(),
    };
  }
}

/**
 * Authentication Middleware
 */
export class AuthMiddleware {
  /**
   * Require authentication
   */
  static requireAuth(
    handler: (user: User, request: Request) => Promise<Response>
  ) {
    return async (request: Request): Promise<Response> => {
      const user = await AuthService.getUserFromRequest(request);

      if (!user) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Authentication required',
            code: 'AUTH_REQUIRED',
          }),
          {
            status: 401,
            headers: {
              'Content-Type': 'application/json',
              'WWW-Authenticate': 'Bearer',
            },
          }
        );
      }

      return handler(user, request);
    };
  }

  /**
   * Require specific permission
   */
  static requirePermission(
    permission: string,
    handler: (user: User, request: Request) => Promise<Response>
  ) {
    return async (request: Request): Promise<Response> => {
      const user = await AuthService.getUserFromRequest(request);

      if (!user) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Authentication required',
            code: 'AUTH_REQUIRED',
          }),
          {
            status: 401,
            headers: {
              'Content-Type': 'application/json',
              'WWW-Authenticate': 'Bearer',
            },
          }
        );
      }

      if (!AuthService.hasPermission(user, permission)) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Insufficient permissions',
            code: 'PERMISSION_DENIED',
            required: permission,
          }),
          {
            status: 403,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
      }

      return handler(user, request);
    };
  }

  /**
   * Require specific role
   */
  static requireRole(
    role: string,
    handler: (user: User, request: Request) => Promise<Response>
  ) {
    return async (request: Request): Promise<Response> => {
      const user = await AuthService.getUserFromRequest(request);

      if (!user) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Authentication required',
            code: 'AUTH_REQUIRED',
          }),
          {
            status: 401,
            headers: {
              'Content-Type': 'application/json',
              'WWW-Authenticate': 'Bearer',
            },
          }
        );
      }

      if (!AuthService.hasRole(user, role)) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Insufficient role',
            code: 'ROLE_DENIED',
            required: role,
            current: user.role,
          }),
          {
            status: 403,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
      }

      return handler(user, request);
    };
  }

  /**
   * Optional authentication (allows guest users)
   */
  static optionalAuth(
    handler: (user: User | null, request: Request) => Promise<Response>
  ) {
    return async (request: Request): Promise<Response> => {
      const user = await AuthService.getUserFromRequest(request);
      return handler(user, request);
    };
  }
}

/**
 * Permission definitions
 */
export const PERMISSIONS = {
  // Read permissions
  'read:public': 'Read public data',
  'read:blocks': 'Read block data',
  'read:transactions': 'Read transaction data',
  'read:addresses': 'Read address data',
  'read:verusids': 'Read VerusID data',
  'read:currencies': 'Read currency data',

  // Write permissions
  'write:comments': 'Write comments',
  'write:bookmarks': 'Create bookmarks',
  'write:reports': 'Create reports',

  // Admin permissions
  'admin:users': 'Manage users',
  'admin:settings': 'Manage settings',
  'admin:monitoring': 'Access monitoring data',
  'admin:rate-limits': 'Manage rate limits',
  'admin:circuit-breakers': 'Manage circuit breakers',

  // System permissions
  'system:health': 'Access health checks',
  'system:metrics': 'Access system metrics',
  'system:logs': 'Access system logs',
};

/**
 * Role definitions
 */
export const ROLES = {
  guest: {
    permissions: ['read:public'],
    description: 'Guest user with read-only access to public data',
  },
  user: {
    permissions: [
      'read:public',
      'read:blocks',
      'read:transactions',
      'read:addresses',
      'read:verusids',
      'read:currencies',
      'write:comments',
      'write:bookmarks',
    ],
    description:
      'Registered user with extended read access and basic write permissions',
  },
  admin: {
    permissions: ['*'],
    description: 'Administrator with full system access',
  },
};
