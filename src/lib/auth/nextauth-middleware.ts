import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth.config';

export interface AuthenticationResult {
  success: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
    firstName: string;
    lastName: string;
    role?: {
      id: string;
      name: string;
      permissions: string[];
    };
    isEmailVerified: boolean;
    profileImage?: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Unified authentication middleware for API endpoints using NextAuth
 * Replaces the old JWT-based authentication system
 */
export async function authenticateApiRequest(request?: NextRequest): Promise<AuthenticationResult> {
  try {
    console.log('🔐 Authenticating API request...');

    // Get session using NextAuth
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      console.log('❌ No session found');
      return {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required. Please sign in.'
        }
      };
    }

    console.log('✅ Session found for user:', session.user.email);

    // Extract user data from session
    const user = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      firstName: session.user.firstName,
      lastName: session.user.lastName,
      role: session.user.role,
      isEmailVerified: session.user.isEmailVerified,
      profileImage: session.user.profileImage
    };

    return {
      success: true,
      user
    };

  } catch (error: any) {
    console.error('🚨 Authentication error:', error);
    return {
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication failed. Please try signing in again.'
      }
    };
  }
}

/**
 * Require authentication for API endpoints
 * Throws an error if authentication fails
 */
export async function requireAuthentication(request?: NextRequest): Promise<AuthenticationResult['user']> {
  const authResult = await authenticateApiRequest(request);

  if (!authResult.success || !authResult.user) {
    throw new Error(authResult.error?.message || 'Authentication required');
  }

  return authResult.user;
}

/**
 * Check if user has specific permission
 */
export async function checkUserPermission(
  user: AuthenticationResult['user'],
  resource: string,
  action: string
): Promise<boolean> {
  if (!user?.role?.permissions) {
    return false;
  }

  // Check for specific permission
  const requiredPermission = `${resource}.${action}`;
  const hasSpecificPermission = user.role.permissions.includes(requiredPermission);

  // Check for manage permission (which includes all actions)
  const managePermission = `${resource}.manage`;
  const hasManagePermission = user.role.permissions.includes(managePermission);

  return hasSpecificPermission || hasManagePermission;
}

/**
 * Require specific permission for API endpoints
 */
export async function requirePermission(
  request: NextRequest,
  resource: string,
  action: string
): Promise<AuthenticationResult['user']> {
  const user = await requireAuthentication(request);

  const hasPermission = await checkUserPermission(user, resource, action);

  if (!hasPermission) {
    throw new Error(`Permission denied. Required: ${resource}.${action}`);
  }

  return user;
}

/**
 * Standard API response helper
 */
export function createApiResponse<T = any>(
  success: boolean,
  data?: T,
  error?: { code: string; message: string },
  status: number = 200
) {
  const response = {
    success,
    ...(data && { data }),
    ...(error && { error }),
    meta: {
      timestamp: new Date().toISOString()
    }
  };

  return { response, status };
}