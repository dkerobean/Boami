import { NextRequest, NextResponse } from 'next/server';
import {
  authenticateUser,
  requireAuth,
  requireRole,
  requireActiveSubscription,
  requireAdmin,
  requireManagerOrAdmin,
  requireAuthWithRateLimit,
  AuthResult,
  AuthenticatedUser
} from './subscription-auth';

/**
 * API Authentication Middleware
 * Provides reusable middleware functions for protecting API routes
 */

/**
 * Higher-order function to wrap API route handlers with authentication
 */
export function withAuth<T extends any[]>(
  handler: (request: NextRequest, user: AuthenticatedUser, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const authResult = await authenticateUser(request);

    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        {
          success: false,
          error: authResult.error || 'Authentication required'
        },
        { status: authResult.statusCode || 401 }
      );
    }

    return handler(request, authResult.user, ...args);
  };
}

/**
 * Higher-order function to wrap API route handlers with role-based authorization
 */
export function withRole<T extends any[]>(
  requiredRole: string | string[],
  handler: (request: NextRequest, user: AuthenticatedUser, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const authResult = await requireRole(requiredRole)(request);

    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        {
          success: false,
          error: authResult.error || 'Authorization required'
        },
        { status: authResult.statusCode || 403 }
      );
    }

    return handler(request, authResult.user, ...args);
  };
}

/**
 * Higher-order function to wrap API route handlers with admin authorization
 */
export function withAdmin<T extends any[]>(
  handler: (request: NextRequest, user: AuthenticatedUser, ...args: T) => Promise<NextResponse>
) {
  return withRole('admin', handler);
}

/**
 * Higher-order function to wrap API route handlers with manager/admin authorization
 */
export function withManagerOrAdmin<T extends any[]>(
  handler: (request: NextRequest, user: AuthenticatedUser, ...args: T) => Promise<NextResponse>
) {
  return withRole(['admin', 'manager'], handler);
}

/**
 * Higher-order function to wrap API route handlers with active subscription requirement
 */
export function withActiveSubscription<T extends any[]>(
  handler: (request: NextRequest, user: AuthenticatedUser, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const authResult = await requireActiveSubscription()(request);

    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        {
          success: false,
          error: authResult.error || 'Active subscription required',
          upgradeRequired: authResult.statusCode === 402
        },
        { status: authResult.statusCode || 402 }
      );
    }

    return handler(request, authResult.user, ...args);
  };
}

/**
 * Higher-order function to wrap API route handlers with rate limiting
 */
export function withRateLimit<T extends any[]>(
  maxRequests: number = 10,
  windowMs: number = 60000,
  handler: (request: NextRequest, user: AuthenticatedUser, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const authResult = await requireAuthWithRateLimit(maxRequests, windowMs)(request);

    if (!authResult.success) {
      const response = NextResponse.json(
        {
          success: false,
          error: authResult.error || 'Request failed'
        },
        { status: authResult.statusCode || 500 }
      );

      // Add rate limit headers
      if (authResult.rateLimit) {
        response.headers.set('X-RateLimit-Limit', maxRequests.toString());
        response.headers.set('X-RateLimit-Remaining', authResult.rateLimit.remaining.toString());
        response.headers.set('X-RateLimit-Reset', authResult.rateLimit.resetTime.toString());
      }

      return response;
    }

    if (!authResult.user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required'
        },
        { status: 401 }
      );
    }

    const response = await handler(request, authResult.user, ...args);

    // Add rate limit headers to successful responses
    if (authResult.rateLimit) {
      response.headers.set('X-RateLimit-Limit', maxRequests.toString());
      response.headers.set('X-RateLimit-Remaining', authResult.rateLimit.remaining.toString());
      response.headers.set('X-RateLimit-Reset', authResult.rateLimit.resetTime.toString());
    }

    return response;
  };
}

/**
 * Utility function to extract user ID from authenticated request
 */
export function getUserId(request: NextRequest): string | null {
  return (request as any).user?.id || null;
}

/**
 * Utility function to check if request is from admin user
 */
export function isRequestFromAdmin(request: NextRequest): boolean {
  return (request as any).user?.role === 'admin';
}

/**
 * Utility function to check if request is from user with active subscription
 */
export function hasActiveSubscriptionInRequest(request: NextRequest): boolean {
  return (request as any).user?.subscription?.isActive === true;
}

/**
 * Middleware for handling CORS in subscription API routes
 */
export function withCORS<T extends any[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_BASE_URL || '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    const response = await handler(request, ...args);

    // Add CORS headers to all responses
    response.headers.set('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_BASE_URL || '*');
    response.headers.set('Access-Control-Allow-Credentials', 'true');

    return response;
  };
}

/**
 * Comprehensive middleware that combines authentication, authorization, and rate limiting
 */
export function withFullAuth<T extends any[]>(
  options: {
    requireAuth?: boolean;
    requireRole?: string | string[];
    requireActiveSubscription?: boolean;
    rateLimit?: { maxRequests: number; windowMs: number };
    cors?: boolean;
  } = {},
  handler: (request: NextRequest, user?: AuthenticatedUser, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    let wrappedHandler = handler;

    // Apply CORS if requested
    if (options.cors) {
      wrappedHandler = withCORS(wrappedHandler);
    }

    // Apply rate limiting if specified
    if (options.rateLimit) {
      const { maxRequests, windowMs } = options.rateLimit;
      if (options.requireAuth !== false) {
        wrappedHandler = withRateLimit(maxRequests, windowMs, wrappedHandler as any);
      }
    }

    // Apply active subscription requirement if specified
    if (options.requireActiveSubscription) {
      wrappedHandler = withActiveSubscription(wrappedHandler as any);
    }

    // Apply role-based authorization if specified
    if (options.requireRole) {
      wrappedHandler = withRole(options.requireRole, wrappedHandler as any);
    }

    // Apply authentication if required (default: true)
    if (options.requireAuth !== false) {
      wrappedHandler = withAuth(wrappedHandler as any);
    }

    return wrappedHandler(request, ...args);
  };
}

/**
 * Predefined middleware combinations for common use cases
 */

// Public API (no auth required)
export const withPublicAPI = <T extends any[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>
) => withFullAuth({ requireAuth: false, cors: true }, handler);

// Basic authenticated API
export const withAuthenticatedAPI = <T extends any[]>(
  handler: (request: NextRequest, user: AuthenticatedUser, ...args: T) => Promise<NextResponse>
) => withFullAuth({ cors: true }, handler);

// Admin-only API
export const withAdminAPI = <T extends any[]>(
  handler: (request: NextRequest, user: AuthenticatedUser, ...args: T) => Promise<NextResponse>
) => withFullAuth({ requireRole: 'admin', cors: true }, handler);

// Subscription-required API
export const withSubscriptionAPI = <T extends any[]>(
  handler: (request: NextRequest, user: AuthenticatedUser, ...args: T) => Promise<NextResponse>
) => withFullAuth({ requireActiveSubscription: true, cors: true }, handler);

// Rate-limited public API
export const withRateLimitedAPI = <T extends any[]>(
  maxRequests: number = 10,
  windowMs: number = 60000,
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>
) => withFullAuth({
  requireAuth: false,
  rateLimit: { maxRequests, windowMs },
  cors: true
}, handler);

/**
 * Error response helper
 */
export function createErrorResponse(
  error: string,
  statusCode: number = 500,
  additionalData?: any
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error,
      ...additionalData
    },
    { status: statusCode }
  );
}

/**
 * Success response helper
 */
export function createSuccessResponse(
  data?: any,
  message?: string,
  statusCode: number = 200
): NextResponse {
  return NextResponse.json(
    {
      success: true,
      ...(data && { data }),
      ...(message && { message })
    },
    { status: statusCode }
  );
}