import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { User, Subscription } from '../database/models';
import { connectDB } from '../database/mongoose-connection';
import { Types } from 'mongoose';

/**
 * Authentication and authorization utilities for subscription system
 */

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: 'admin' | 'user' | 'manager';
  isActive: boolean;
  isEmailVerified: boolean;
  subscription?: {
    id: string;
    status: string;
    planId: string;
    isActive: boolean;
  };
}

export interface AuthResult {
  success: boolean;
  user?: AuthenticatedUser;
  error?: string;
  statusCode?: number;
}

/**
 * Extract JWT token from request headers
 */
function extractToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');

  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Also check for token in cookies (for browser requests)
  const cookieToken = request.cookies.get('auth-token')?.va
  if (cookieToken) {
    return cookieToken;
  }

  return null;
}

/**
 * Verify JWT token and extract user information
 */
async function verifyToken(token: string): Promise<any> {
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET not configured');
    }

    const decoded = jwt.verify(token, secret);
    return decoded;
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    } else {
      throw new Error('Token verification failed');
    }
  }
}

/**
 * Authenticate user from request
 */
export async function authenticateUser(request: NextRequest): Promise<AuthResult> {
  try {
    await connectDB();

    const token = extractToken(request);
    if (!token) {
      return {
        success: false,
        error: 'No authentication token provided',
        statusCode: 401
      };
    }

    // Verify token
    const decoded = await verifyToken(token);
    if (!decoded || !decoded.userId) {
      return {
        success: false,
        error: 'Invalid token payload',
        statusCode: 401
      };
    }

    // Get user from database
    const user = await User.findById(decoded.userId);
    if (!user) {
      return {
        success: false,
        error: 'User not found',
        statusCode: 401
      };
    }

    // Check if user is active
    if (!user.isActive) {
      return {
        success: false,
        error: 'User account is deactivated',
        statusCode: 403
      };
    }

    // Get user's subscription
    const subscription = await Subscription.findByUserId(new Types.ObjectId(user._id));

    const authenticatedUser: AuthenticatedUser = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified,
      subscription: subscription ? {
        id: subscription._id.toString(),
        status: subscription.status,
        planId: subscription.planId.toString(),
        isActive: subscription.isActive()
      } : undefined
    };

    return {
      success: true,
      user: authenticatedUser
    };

  } catch (error: any) {
    console.error('Authentication error:', error);

    if (error.message.includes('expired')) {
      return {
        success: false,
        error: 'Token expired',
        statusCode: 401
      };
    }

    if (error.message.includes('Invalid token')) {
      return {
        success: false,
        error: 'Invalid authentication token',
        statusCode: 401
      };
    }

    return {
      success: false,
      error: 'Authentication failed',
      statusCode: 500
    };
  }
}

/**
 * Check if user has required role
 */
export function hasRole(user: AuthenticatedUser, requiredRole: string | string[]): boolean {
  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  return roles.includes(user.role);
}

/**
 * Check if user has admin privileges
 */
export function isAdmin(user: AuthenticatedUser): boolean {
  return user.role === 'admin';
}

/**
 * Check if user has manager or admin privileges
 */
export function isManagerOrAdmin(user: AuthenticatedUser): boolean {
  return ['admin', 'manager'].includes(user.role);
}

/**
 * Check if user has active subscription
 */
export function hasActiveSubscription(user: AuthenticatedUser): boolean {
  return user.subscription?.isActive === true;
}

/**
 * Check if user has specific subscription status
 */
export function hasSubscriptionStatus(user: AuthenticatedUser, status: string | string[]): boolean {
  if (!user.subscription) return false;

  const statuses = Array.isArray(status) ? status : [status];
  return statuses.includes(user.subscription.status);
}

/**
 * Middleware factory for protecting routes with authentication
 */
export function requireAuth() {
  return async (request: NextRequest): Promise<AuthResult> => {
    return await authenticateUser(request);
  };
}

/**
 * Middleware factory for protecting routes with role-based authorization
 */
export function requireRole(requiredRole: string | string[]) {
  return async (request: NextRequest): Promise<AuthResult> => {
    const authResult = await authenticateUser(request);

    if (!authResult.success || !authResult.user) {
      return authResult;
    }

    if (!hasRole(authResult.user, requiredRole)) {
      return {
        success: false,
        error: 'Insufficient permissions',
        statusCode: 403
      };
    }

    return authResult;
  };
}

/**
 * Middleware factory for protecting routes that require active subscription
 */
export function requireActiveSubscription() {
  return async (request: NextRequest): Promise<AuthResult> => {
    const authResult = await authenticateUser(request);

    if (!authResult.success || !authResult.user) {
      return authResult;
    }

    if (!hasActiveSubscription(authResult.user)) {
      return {
        success: false,
        error: 'Active subscription required',
        statusCode: 402 // Payment Required
      };
    }

    return authResult;
  };
}

/**
 * Middleware factory for protecting admin routes
 */
export function requireAdmin() {
  return requireRole('admin');
}

/**
 * Middleware factory for protecting manager/admin routes
 */
export function requireManagerOrAdmin() {
  return requireRole(['admin', 'manager']);
}

/**
 * Rate limiting for subscription endpoints
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string,
  maxRequests: number = 10,
  windowMs: number = 60000
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const key = identifier;

  let record = rateLimitStore.get(key);

  // Reset if window has passed
  if (!record || now > record.resetTime) {
    record = {
      count: 0,
      resetTime: now + windowMs
    };
  }

  record.count++;
  rateLimitStore.set(key, record);

  // Clean up old entries periodically
  if (Math.random() < 0.01) { // 1% chance
    for (const [k, v] of rateLimitStore.entries()) {
      if (now > v.resetTime) {
        rateLimitStore.delete(k);
      }
    }
  }

  return {
    allowed: record.count <= maxRequests,
    remaining: Math.max(0, maxRequests - record.count),
    resetTime: record.resetTime
  };
}

/**
 * Middleware factory for rate limiting
 */
export function rateLimit(maxRequests: number = 10, windowMs: number = 60000) {
  return async (request: NextRequest): Promise<AuthResult & { rateLimit?: any }> => {
    // Use IP address as identifier
    const ip = request.headers.get('x-forwarded-for') ||
               request.headers.get('x-real-ip') ||
               'unknown';

    const rateLimitResult = checkRateLimit(ip, maxRequests, windowMs);

    if (!rateLimitResult.allowed) {
      return {
        success: false,
        error: 'Rate limit exceeded',
        statusCode: 429,
        rateLimit: rateLimitResult
      };
    }

    return {
      success: true,
      rateLimit: rateLimitResult
    };
  };
}

/**
 * Combined middleware for authentication + rate limiting
 */
export function requireAuthWithRateLimit(maxRequests: number = 10, windowMs: number = 60000) {
  return async (request: NextRequest): Promise<AuthResult & { rateLimit?: any }> => {
    // Check rate limit first
    const rateLimitResult = await rateLimit(maxRequests, windowMs)(request);
    if (!rateLimitResult.success) {
      return rateLimitResult;
    }

    // Then check authentication
    const authResult = await authenticateUser(request);

    return {
      ...authResult,
      rateLimit: rateLimitResult.rateLimit
    };
  };
}

/**
 * Utility to create API response with proper error handling
 */
export function createAuthResponse(authResult: AuthResult, successData?: any) {
  if (!authResult.success) {
    return {
      success: false,
      error: authResult.error,
      statusCode: authResult.statusCode || 500
    };
  }

  return {
    success: true,
    user: authResult.user,
    data: successData
  };
}