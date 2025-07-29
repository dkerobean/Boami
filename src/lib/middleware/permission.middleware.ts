import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { PermissionService } from '../services/permission.service';

/**
 * Permission middleware options
 */
interface PermissionOptions {
  resource: string;
  action: string;
  requireAll?: boolean; // If true, user must have all permissions
}

/**
 * Multiple permissions check options
 */
interface MultiplePermissionOptions {
  permissions: Array<{ resource: string; action: string }>;
  requireAll?: boolean; // If true, user must have all permissions (default: false - any permission)
}

/**
 * Create permission middleware for API routes
 */
export function requirePermission(options: PermissionOptions | MultiplePermissionOptions) {
  return async (request: NextRequest) => {
    try {
      // Get the user token from the request
      const token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET
      });

      if (!token || !token.sub) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'Authentication required' },
          { status: 401 }
        );
      }

      const userId = token.sub;
      let hasPermission = false;

      // Check if it's a single permission or multiple permissions
      if ('resource' in options && 'action' in options) {
        // Single permission check
        hasPermission = await PermissionService.checkPermission(
          userId,
          options.resource,
          options.action
        );

        // Log the permission check
        await PermissionService.logPermissionCheck(
          userId,
          options.resource,
          options.action,
          hasPermission,
          {
            url: request.url,
            method: request.method,
            userAgent: request.headers.get('user-agent'),
            ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
          }
        );
      } else if ('permissions' in options) {
        // Multiple permissions check
        if (options.requireAll) {
          hasPermission = await PermissionService.checkAllPermissions(userId, options.permissions);
        } else {
          hasPermission = await PermissionService.checkAnyPermission(userId, options.permissions);
        }

        // Log each permission check
        for (const perm of options.permissions) {
          const individualCheck = await PermissionService.checkPermission(
            userId,
            perm.resource,
            perm.action
          );

          await PermissionService.logPermissionCheck(
            userId,
            perm.resource,
            perm.action,
            individualCheck,
            {
              url: request.url,
              method: request.method,
              userAgent: request.headers.get('user-agent'),
              ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
              multipleCheck: true,
              requireAll: options.requireAll
            }
          );
        }
      }

      if (!hasPermission) {
        return NextResponse.json(
          {
            error: 'Forbidden',
            message: 'Insufficient permissions',
            code: 'PERMISSION_DENIED'
          },
          { status: 403 }
        );
      }

      // Permission granted, continue to the next middleware or route handler
      return NextResponse.next();
    } catch (error) {
      console.error('Permission middleware error:', error);
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Permission check failed' },
        { status: 500 }
      );
    }
  };
}

/**
 * Middleware wrapper for Next.js API routes
 */
export function withPermission(
  handler: (req: NextRequest) => Promise<NextResponse>,
  options: PermissionOptions | MultiplePermissionOptions
) {
  return async (request: NextRequest) => {
    const permissionCheck = await requirePermission(options)(request);

    // If permission check failed, return the error response
    if (permissionCheck.status !== 200) {
      return permissionCheck;
    }

    // Permission granted, execute the handler
    return handler(request);
  };
}

/**
 * Higher-order function to create permission-protected API handlers
 */
export function createProtectedHandler(
  options: PermissionOptions | MultiplePermissionOptions
) {
  return function(handler: (req: NextRequest, context: any) => Promise<NextResponse>) {
    return async (request: NextRequest, context: any) => {
      const permissionCheck = await requirePermission(options)(request);

      if (permissionCheck.status !== 200) {
        return permissionCheck;
      }

      return handler(request, context);
    };
  };
}

/**
 * Utility function to check permissions in server components
 */
export async function checkServerPermission(
  userId: string,
  resource: string,
  action: string
): Promise<boolean> {
  try {
    return await PermissionService.checkPermission(userId, resource, action);
  } catch (error) {
    console.error('Server permission check error:', error);
    return false;
  }
}

/**
 * Utility function to enforce permissions in server components
 */
export async function enforceServerPermission(
  userId: string,
  resource: string,
  action: string
): Promise<void> {
  try {
    await PermissionService.enforcePermission(userId, resource, action);
  } catch (error) {
    throw error;
  }
}

/**
 * Feature-based permission check middleware
 */
export function requireFeatureAccess(feature: string) {
  return async (request: NextRequest) => {
    try {
      const token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET
      });

      if (!token || !token.sub) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'Authentication required' },
          { status: 401 }
        );
      }

      const hasAccess = await PermissionService.hasFeatureAccess(token.sub, feature);

      if (!hasAccess) {
        return NextResponse.json(
          {
            error: 'Forbidden',
            message: `Access denied to feature: ${feature}`,
            code: 'FEATURE_ACCESS_DENIED'
          },
          { status: 403 }
        );
      }

      return NextResponse.next();
    } catch (error) {
      console.error('Feature access middleware error:', error);
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Feature access check failed' },
        { status: 500 }
      );
    }
  };
}