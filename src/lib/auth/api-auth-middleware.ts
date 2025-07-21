/**
 * API Authentication Middleware
 * Provides authentication protection for API endpoints with role-based access control
 */

import { NextRequest, NextResponse } from 'next/server';
import { JWTManager, IJWTPayload } from './jwt';
import { getAuthConfig } from './auth-config';

// Authentication result interface
export interface ApiAuthResult {
  success: boolean;
  user?: IJWTPayload;
  error?: {
    code: string;
    message: string;
    statusCode: number;
  };
}

// Middleware options interface
export interface ApiAuthMiddlewareOptions {
  requiredRole?: string;
  requiredRoles?: string[];
  requireEmailVerification?: boolean;
  allowAnonymous?: boolean;
  rateLimitKey?: string;
  customValidation?: (user: IJWTPayload) => boolean | Promise<boolean>;
}

// Error codes for API authentication
export const API_AUTH_ERRORS = {
  NO_TOKEN: {
    code: 'NO_TOKEN',
    message: 'Authentication token is required',
    statusCode: 401,
  },
  INVALID_TOKEN: {
    code: 'INVALID_TOKEN',
    message: 'Invalid authentication token',
    statusCode: 401,
  },
  TOKEN_EXPIRED: {
    code: 'TOKEN_EXPIRED',
    message: 'Authentication token has expired',
    statusCode: 401,
  },
  INSUFFICIENT_PERMISSIONS: {
    code: 'INSUFFICIENT_PERMISSIONS',
    message: 'Insufficient permissions to access this resource',
    statusCode: 403,
  },
  EMAIL_NOT_VERIFIED: {
    code: 'EMAIL_NOT_VERIFIED',
    message: 'Email verification is required',
    statusCode: 403,
  },
  ACCOUNT_INACTIVE: {
    code: 'ACCOUNT_INACTIVE',
    message: 'Account is inactive',
    statusCode: 403,
  },
  RATE_LIMITED: {
    code: 'RATE_LIMITED',
    message: 'Too many requests, please try again later',
    statusCode: 429,
  },
  CUSTOM_VALIDATION_FAILED: {
    code: 'CUSTOM_VALIDATION_FAILED',
    message: 'Custom validation failed',
    statusCode: 403,
  },
} as const;

/**
 * API Authentication Middleware Class
 */
export class ApiAuthMiddleware {
  /**
   * Authenticate API request using JWT token
   */
  static async authenticateRequest(
    request: NextRequest,
    options: ApiAuthMiddlewareOptions = {}
  ): Promise<ApiAuthResult> {
    try {
      // Allow anonymous access if specified
      if (options.allowAnonymous) {
        const token = this.extractToken(request);
        if (!token) {
          return { success: true };
        }
      }

      // Extract token from request
      const token = this.extractToken(request);
      if (!token) {
        return {
          success: false,
          error: API_AUTH_ERRORS.NO_TOKEN,
        };
      }

      // Check rate limiting if specified
      if (options.rateLimitKey) {
        const rateLimitResult = this.checkRateLimit(request, options.rateLimitKey);
        if (!rateLimitResult.allowed) {
          return {
            success: false,
            error: API_AUTH_ERRORS.RATE_LIMITED,
          };
        }
      }

      // Verify JWT token
      const user = JWTManager.verifyAccessToken(token);
      if (!user) {
        return {
          success: false,
          error: API_AUTH_ERRORS.INVALID_TOKEN,
        };
      }

      // Check if token is expired
      if (JWTManager.isTokenExpired(token)) {
        return {
          success: false,
          error: API_AUTH_ERRORS.TOKEN_EXPIRED,
        };
      }

      // Check email verification requirement
      if (options.requireEmailVerification && !user.isEmailVerified) {
        return {
          success: false,
          error: API_AUTH_ERRORS.EMAIL_NOT_VERIFIED,
        };
      }

      // Check role requirements
      if (options.requiredRole && !this.hasRole(user, options.requiredRole)) {
        return {
          success: false,
          error: API_AUTH_ERRORS.INSUFFICIENT_PERMISSIONS,
        };
      }

      if (options.requiredRoles && !this.hasAnyRole(user, options.requiredRoles)) {
        return {
          success: false,
          error: API_AUTH_ERRORS.INSUFFICIENT_PERMISSIONS,
        };
      }

      // Run custom validation if provided
      if (options.customValidation) {
        const customResult = await options.customValidation(user);
        if (!customResult) {
          return {
            success: false,
            error: API_AUTH_ERRORS.CUSTOM_VALIDATION_FAILED,
          };
        }
      }

      return {
        success: true,
        user,
      };
    } catch (error) {
      console.error('API authentication error:', error);
      return {
        success: false,
        error: API_AUTH_ERRORS.INVALID_TOKEN,
      };
    }
  }

  /**
   * Create authentication middleware function
   */
  static createMiddleware(options: ApiAuthMiddlewareOptions = {}) {
    return async (request: NextRequest): Promise<NextResponse | null> => {
      const authResult = await this.authenticateRequest(request, options);

      if (!authResult.success && authResult.error) {
        return this.createErrorResponse(authResult.error);
      }

      // Add user to request headers for downstream handlers
      if (authResult.user) {
        const response = NextResponse.next();
        response.headers.set('x-user-id', authResult.user.userId);
        response.headers.set('x-user-role', authResult.user.role);
        response.headers.set('x-user-email', authResult.user.email);
        return response;
      }

      return null; // Continue to next middleware/handler
    };
  }

  /**
   * Protect API route handler
   */
  static protect(options: ApiAuthMiddlewareOptions = {}) {
    return function (handler: Function) {
      return async function (request: NextRequest, context?: any) {
        const authResult = await ApiAuthMiddleware.authenticateRequest(request, options);

        if (!authResult.success && authResult.error) {
          return ApiAuthMiddleware.createErrorResponse(authResult.error);
        }

        // Add user to context
        const enhancedContext = {
          ...context,
          user: authResult.user,
          isAuthenticated: authResult.success,
        };

        return handler(request, enhancedContext);
      };
    };
  }

  /**
   * Extract JWT token from request
   */
  private static extractToken(request: NextRequest): string | null {
    // Method 1: Authorization header
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.replace('Bearer ', '');
    }

    // Method 2: Cookie
    const accessToken = request.cookies.get('accessToken')?.value;
    if (accessToken) {
      return accessToken;
    }

    // Method 3: Query parameter (less secure, for specific use cases)
    const tokenParam = request.nextUrl.searchParams.get('token');
    if (tokenParam) {
      return tokenParam;
    }

    return null;
  }

  /**
   * Check if user has required role
   */
  private static hasRole(user: IJWTPayload, requiredRole: string): boolean {
    return user.role === requiredRole;
  }

  /**
   * Check if user has any of the required roles
   */
  private static hasAnyRole(user: IJWTPayload, requiredRoles: string[]): boolean {
    return requiredRoles.includes(user.role);
  }

  /**
   * Check rate limiting
   */
  private static checkRateLimit(request: NextRequest, key: string): { allowed: boolean; remaining?: number } {
    // Simple rate limiting implementation
    // In production, use Redis or a proper rate limiting service
    const identifier = this.getRateLimitIdentifier(request, key);
    return JWTManager.checkRateLimit(identifier) ? { allowed: true } : { allowed: false };
  }

  /**
   * Get rate limit identifier
   */
  private static getRateLimitIdentifier(request: NextRequest, key: string): string {
    const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
    return `${key}:${ip}`;
  }

  /**
   * Create error response
   */
  private static createErrorResponse(error: typeof API_AUTH_ERRORS[keyof typeof API_AUTH_ERRORS]): NextResponse {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      },
      { status: error.statusCode }
    );
  }
}

/**
 * Convenience functions for common authentication patterns
 */

/**
 * Require authentication for API route
 */
export function requireAuth(options: Omit<ApiAuthMiddlewareOptions, 'allowAnonymous'> = {}) {
  return ApiAuthMiddleware.protect(options);
}

/**
 * Require admin role for API route
 */
export function requireAdmin(options: Omit<ApiAuthMiddlewareOptions, 'requiredRole'> = {}) {
  return ApiAuthMiddleware.protect({ ...options, requiredRole: 'admin' });
}

/**
 * Require moderator or admin role for API route
 */
export function requireModerator(options: Omit<ApiAuthMiddlewareOptions, 'requiredRoles'> = {}) {
  return ApiAuthMiddleware.protect({ ...options, requiredRoles: ['moderator', 'admin'] });
}

/**
 * Require email verification for API route
 */
export function requireEmailVerification(options: Omit<ApiAuthMiddlewareOptions, 'requireEmailVerification'> = {}) {
  return ApiAuthMiddleware.protect({ ...options, requireEmailVerification: true });
}

/**
 * Allow optional authentication (user can be authenticated or not)
 */
export function optionalAuth(options: Omit<ApiAuthMiddlewareOptions, 'allowAnonymous'> = {}) {
  return ApiAuthMiddleware.protect({ ...options, allowAnonymous: true });
}

/**
 * Higher-order function to create custom authentication middleware
 */
export function createAuthMiddleware(
  customOptions: ApiAuthMiddlewareOptions,
  customValidation?: (user: IJWTPayload) => boolean | Promise<boolean>
) {
  return ApiAuthMiddleware.protect({
    ...customOptions,
    customValidation,
  });
}

/**
 * Utility function to get authenticated user from request
 */
export async function getAuthenticatedUser(request: NextRequest): Promise<IJWTPayload | null> {
  const authResult = await ApiAuthMiddleware.authenticateRequest(request, { allowAnonymous: true });
  return authResult.user || null;
}

/**
 * Utility function to check if request is authenticated
 */
export async function isRequestAuthenticated(request: NextRequest): Promise<boolean> {
  const authResult = await ApiAuthMiddleware.authenticateRequest(request, { allowAnonymous: true });
  return authResult.success && !!authResult.user;
}

/**
 * Utility function to get user role from request
 */
export async function getUserRole(request: NextRequest): Promise<string | null> {
  const user = await getAuthenticatedUser(request);
  return user?.role || null;
}

/**
 * Utility function to check if user has specific role
 */
export async function userHasRole(request: NextRequest, role: string): Promise<boolean> {
  const userRole = await getUserRole(request);
  return userRole === role;
}

/**
 * Utility function to check if user has any of the specified roles
 */
export async function userHasAnyRole(request: NextRequest, roles: string[]): Promise<boolean> {
  const userRole = await getUserRole(request);
  return userRole ? roles.includes(userRole) : false;
}

/**
 * Create standardized API error responses
 */
export const ApiErrorResponses = {
  unauthorized: (message?: string) =>
    NextResponse.json(
      {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: message || 'Authentication required',
        },
      },
      { status: 401 }
    ),

  forbidden: (message?: string) =>
    NextResponse.json(
      {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: message || 'Access denied',
        },
      },
      { status: 403 }
    ),

  rateLimited: (message?: string) =>
    NextResponse.json(
      {
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: message || 'Too many requests',
        },
      },
      { status: 429 }
    ),

  badRequest: (message?: string) =>
    NextResponse.json(
      {
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: message || 'Invalid request',
        },
      },
      { status: 400 }
    ),

  internalError: (message?: string) =>
    NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: message || 'Internal server error',
        },
      },
      { status: 500 }
    ),
};

export default ApiAuthMiddleware;