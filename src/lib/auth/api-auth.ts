import { NextRequest } from 'next/server';
import { verifyJWT } from './jwt';
import { cookies } from 'next/headers';

export interface AuthResult {
  success: boolean;
  userId?: string;
  user?: any;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Authenticate API request using JWT token or cookies
 * Supports both Authorization header and cookie-based authentication
 */
export async function authenticateRequest(request: NextRequest): Promise<AuthResult> {
  try {
    // Method 1: Try JWT token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      const decoded = verifyJWT(token);

      if (decoded && decoded.userId) {
        return {
          success: true,
          userId: decoded.userId,
          user: decoded,
        };
      }
    }

    // Method 2: Try cookie-based authentication
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get('session') || cookieStore.get('authToken') || cookieStore.get('token');

    if (sessionCookie) {
      try {
        // Try to decode the cookie value as JWT
        const decoded = verifyJWT(sessionCookie.value);
        if (decoded && decoded.userId) {
          return {
            success: true,
            userId: decoded.userId,
            user: decoded,
          };
        }
      } catch (error) {
        // Cookie might not be a JWT, could be a session ID
        // For now, we'll skip this and return unauthorized
        console.log('Cookie authentication not implemented for session IDs');
      }
    }

    // Method 3: For development/testing - allow requests without auth
    if (process.env.NODE_ENV === 'development' && process.env.SKIP_AUTH === 'true') {
      return {
        success: true,
        userId: 'dev-user-123', // Default dev user ID
        user: {
          userId: 'dev-user-123',
          email: 'dev@example.com',
          role: 'user',
        },
      };
    }

    return {
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    };

  } catch (error) {
    console.error('Authentication error:', error);
    return {
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication failed',
      },
    };
  }
}

/**
 * Middleware function to authenticate API routes
 * Returns the authenticated user ID or throws an error
 */
export async function requireAuth(request: NextRequest): Promise<string> {
  const authResult = await authenticateRequest(request);

  if (!authResult.success || !authResult.userId) {
    throw new Error(authResult.error?.message || 'Authentication required');
  }

  return authResult.userId;
}