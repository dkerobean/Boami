import { NextRequest } from 'next/server';
import { authenticateRequest, AuthResult } from './api-auth';
import {
  ProductivityError,
  ProductivityErrorCode,
  createErrorResponse,
  generateRequestId
} from '@/lib/utils/productivity-error-handler';

/**
 * Enhanced authentication result for productivity features
 */
export interface ProductivityAuthResult extends AuthResult {
  requestId?: string;
  permissions?: string[];
  features?: string[];
}

/**
 * Productivity-specific authentication middleware
 * Provides enhanced authentication with feature-specific permissions
 */
export async function authenticateProductivityRequest(
  request: NextRequest,
  requiredFeature?: 'notes' | 'calendar' | 'kanban'
): Promise<ProductivityAuthResult> {
  const requestId = generateRequestId();

  try {
    // Use the base authentication
    const authResult = await authenticateRequest(request);

    if (!authResult.success) {
      return {
        ...authResult,
        requestId,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required for productivity features'
        }
      };
    }

    // Add productivity-specific enhancements
    const productivityResult: ProductivityAuthResult = {
      ...authResult,
      requestId,
      permissions: getUserPermissions(authResult.user),
      features: getAvailableFeatures(authResult.user)
    };

    // Check feature-specific permissions if required
    if (requiredFeature && !hasFeatureAccess(productivityResult, requiredFeature)) {
      return {
        success: false,
        requestId,
        error: {
          code: 'FORBIDDEN',
          message: `Access denied to ${requiredFeature} feature`
        }
      };
    }

    return productivityResult;

  } catch (error) {
    console.error('Productivity authentication error:', error);
    return {
      success: false,
      requestId,
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication failed'
      }
    };
  }
}

/**
 * Get user permissions based on user data
 */
function getUserPermissions(user: any): string[] {
  const permissions: string[] = ['read', 'write']; // Default permissions

  if (user?.role === 'admin') {
    permissions.push('admin', 'delete', 'manage_users');
  }

  if (user?.role === 'premium') {
    permissions.push('premium_features', 'export', 'advanced_search');
  }

  return permissions;
}

/**
 * Get available features for the user
 */
function getAvailableFeatures(user: any): string[] {
  const features: string[] = ['notes', 'calendar', 'kanban']; // Default features

  if (user?.role === 'premium') {
    features.push('advanced_kanban', 'calendar_sync', 'note_sharing');
  }

  if (user?.role === 'admin') {
    features.push('user_management', 'analytics', 'system_settings');
  }

  return features;
}

/**
 * Check if user has access to a specific feature
 */
function hasFeatureAccess(authResult: ProductivityAuthResult, feature: string): boolean {
  return authResult.features?.includes(feature) ?? true; // Default to true for basic features
}

/**
 * Middleware wrapper for productivity API routes
 * Automatically handles authentication and returns standardized error responses
 */
export function withProductivityAuth(
  handler: (request: NextRequest, authResult: ProductivityAuthResult) => Promise<Response>,
  requiredFeature?: 'notes' | 'calendar' | 'kanban'
) {
  return async (request: NextRequest): Promise<Response> => {
    const authResult = await authenticateProductivityRequest(request, requiredFeature);

    if (!authResult.success) {
      return createErrorResponse(
        authResult.error?.code as ProductivityErrorCode || ProductivityErrorCode.UNAUTHORIZED,
        authResult.error?.message || 'Authentication required',
        authResult.error?.code === 'FORBIDDEN' ? 403 : 401,
        undefined,
        authResult.requestId
      );
    }

    try {
      return await handler(request, authResult);
    } catch (error) {
      console.error('Productivity API error:', error);

      if (error instanceof ProductivityError) {
        return createErrorResponse(
          error.code,
          error.message,
          error.statusCode,
          error.details,
          authResult.requestId
        );
      }

      return createErrorResponse(
        ProductivityErrorCode.INTERNAL_ERROR,
        'An unexpected error occurred',
        500,
        undefined,
        authResult.requestId
      );
    }
  };
}

/**
 * Check if user has specific permission
 */
export function hasPermission(authResult: ProductivityAuthResult, permission: string): boolean {
  return authResult.permissions?.includes(permission) ?? false;
}

/**
 * Require specific permission or throw error
 */
export function requirePermission(authResult: ProductivityAuthResult, permission: string): void {
  if (!hasPermission(authResult, permission)) {
    throw new ProductivityError(
      ProductivityErrorCode.FORBIDDEN,
      `Permission '${permission}' is required for this operation`,
      403
    );
  }
}

/**
 * Check ownership of a resource
 */
export function checkResourceOwnership(
  authResult: ProductivityAuthResult,
  resourceUserId: string,
  allowAdmin: boolean = true
): boolean {
  // User owns the resource
  if (authResult.userId === resourceUserId) {
    return true;
  }

  // Admin can access all resources if allowed
  if (allowAdmin && hasPermission(authResult, 'admin')) {
    return true;
  }

  return false;
}

/**
 * Require resource ownership or throw error
 */
export function requireResourceOwnership(
  authResult: ProductivityAuthResult,
  resourceUserId: string,
  resourceType: string = 'resource',
  allowAdmin: boolean = true
): void {
  if (!checkResourceOwnership(authResult, resourceUserId, allowAdmin)) {
    throw new ProductivityError(
      ProductivityErrorCode.FORBIDDEN,
      `You don't have permission to access this ${resourceType}`,
      403
    );
  }
}

/**
 * Rate limiting check for productivity features
 */
export async function checkRateLimit(
  authResult: ProductivityAuthResult,
  feature: string,
  action: string
): Promise<boolean> {
  // Simple rate limiting logic - in production, this would use Redis or similar
  const rateLimitKey = `${authResult.userId}:${feature}:${action}`;

  // For now, return true (no rate limiting)
  // In production, implement actual rate limiting logic
  return true;
}

/**
 * Log authentication events for security monitoring
 */
export function logAuthEvent(
  authResult: ProductivityAuthResult,
  event: 'login' | 'access' | 'permission_denied' | 'rate_limit',
  details?: any
): void {
  const logData = {
    timestamp: new Date().toISOString(),
    requestId: authResult.requestId,
    userId: authResult.userId,
    event,
    details,
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
  };

  // In production, send to logging service
  console.log('Auth Event:', logData);
}

/**
 * Validate API key for external integrations
 */
export async function validateApiKey(apiKey: string): Promise<ProductivityAuthResult> {
  const requestId = generateRequestId();

  try {
    // In production, validate against database
    // For now, simple validation
    if (!apiKey || !apiKey.startsWith('pk_')) {
      return {
        success: false,
        requestId,
        error: {
          code: 'INVALID_API_KEY',
          message: 'Invalid API key format'
        }
      };
    }

    // Mock API key validation
    return {
      success: true,
      requestId,
      userId: 'api-user-' + apiKey.slice(-8),
      permissions: ['read', 'write'],
      features: ['notes', 'calendar', 'kanban']
    };

  } catch (error) {
    console.error('API key validation error:', error);
    return {
      success: false,
      requestId,
      error: {
        code: 'AUTH_ERROR',
        message: 'API key validation failed'
      }
    };
  }
}