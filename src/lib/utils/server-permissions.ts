import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth.config';
import { PermissionService } from '../services/permission.service';
import { redirect } from 'next/navigation';

/**
 * Server-side permission validation utilities
 */

/**
 * Get current user session on server side
 */
export async function getCurrentUser() {
  try {
    const session = await getServerSession(authOptions);
    return session?.user || null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Check permission on server side and return boolean
 */
export async function checkServerPermission(
  resource: string,
  action: string
): Promise<boolean> {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return false;
    }

    return await PermissionService.checkPermission(user.id, resource, action);
  } catch (error) {
    console.error('Server permission check error:', error);
    return false;
  }
}

/**
 * Enforce permission on server side - throws error or redirects if no permission
 */
export async function enforceServerPermission(
  resource: string,
  action: string,
  redirectTo?: string
): Promise<void> {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      if (redirectTo) {
        redirect('/auth/signin');
      } else {
        throw new Error('Authentication required');
      }
    }

    const hasPermission = await PermissionService.checkPermission(user.id, resource, action);

    if (!hasPermission) {
      if (redirectTo) {
        redirect(redirectTo);
      } else {
        const error = new Error('Insufficient permissions');
        (error as any).statusCode = 403;
        throw error;
      }
    }
  } catch (error) {
    if (redirectTo && error instanceof Error && error.message !== 'NEXT_REDIRECT') {
      redirect(redirectTo);
    }
    throw error;
  }
}

/**
 * Check multiple permissions on server side
 */
export async function checkServerPermissions(
  permissions: Array<{ resource: string; action: string }>,
  requireAll: boolean = false
): Promise<boolean> {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return false;
    }

    if (requireAll) {
      return await PermissionService.checkAllPermissions(user.id, permissions);
    } else {
      return await PermissionService.checkAnyPermission(user.id, permissions);
    }
  } catch (error) {
    console.error('Server permissions check error:', error);
    return false;
  }
}

/**
 * Check feature access on server side
 */
export async function checkServerFeatureAccess(feature: string): Promise<boolean> {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return false;
    }

    return await PermissionService.hasFeatureAccess(user.id, feature);
  } catch (error) {
    console.error('Server feature access check error:', error);
    return false;
  }
}

/**
 * Get user permissions on server side
 */
export async function getServerUserPermissions(): Promise<{
  permissions: string[];
  role: any;
}> {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return { permissions: [], role: null };
    }

    const [permissions, role] = await Promise.all([
      PermissionService.getUserPermissions(user.id),
      PermissionService.getUserRole(user.id)
    ]);

    return { permissions, role };
  } catch (error) {
    console.error('Error getting server user permissions:', error);
    return { permissions: [], role: null };
  }
}

/**
 * Higher-order function to protect server components
 */
export function withServerPermission(
  resource: string,
  action: string,
  redirectTo: string = '/unauthorized'
) {
  return function<T extends any[], R>(
    fn: (...args: T) => Promise<R>
  ) {
    return async (...args: T): Promise<R> => {
      await enforceServerPermission(resource, action, redirectTo);
      return fn(...args);
    };
  };
}

/**
 * Higher-order function to protect server components with multiple permissions
 */
export function withServerPermissions(
  permissions: Array<{ resource: string; action: string }>,
  requireAll: boolean = false,
  redirectTo: string = '/unauthorized'
) {
  return function<T extends any[], R>(
    fn: (...args: T) => Promise<R>
  ) {
    return async (...args: T): Promise<R> => {
      const hasPermission = await checkServerPermissions(permissions, requireAll);

      if (!hasPermission) {
        redirect(redirectTo);
      }

      return fn(...args);
    };
  };
}

/**
 * Higher-order function to protect server components with feature access
 */
export function withServerFeatureAccess(
  feature: string,
  redirectTo: string = '/unauthorized'
) {
  return function<T extends any[], R>(
    fn: (...args: T) => Promise<R>
  ) {
    return async (...args: T): Promise<R> => {
      const hasAccess = await checkServerFeatureAccess(feature);

      if (!hasAccess) {
        redirect(redirectTo);
      }

      return fn(...args);
    };
  };
}

/**
 * Utility to get user context for server components
 */
export async function getServerUserContext(): Promise<{
  user: any;
  permissions: string[];
  role: any;
  hasPermission: (resource: string, action: string) => Promise<boolean>;
  hasFeatureAccess: (feature: string) => Promise<boolean>;
}> {
  const user = await getCurrentUser();

  if (!user?.id) {
    return {
      user: null,
      permissions: [],
      role: null,
      hasPermission: async () => false,
      hasFeatureAccess: async () => false
    };
  }

  const { permissions, role } = await getServerUserPermissions();

  return {
    user,
    permissions,
    role,
    hasPermission: async (resource: string, action: string) =>
      await checkServerPermission(resource, action),
    hasFeatureAccess: async (feature: string) =>
      await checkServerFeatureAccess(feature)
  };
}

/**
 * Validate role hierarchy for role assignment
 */
export async function validateRoleAssignment(
  assignerUserId: string,
  targetRoleName: string
): Promise<{ canAssign: boolean; reason?: string }> {
  try {
    const assignerRole = await PermissionService.getUserRole(assignerUserId);

    if (!assignerRole) {
      return { canAssign: false, reason: 'Assigner role not found' };
    }

    // Super admins can assign any role
    if (assignerRole.name === 'Super Admin') {
      return { canAssign: true };
    }

    // Admins cannot assign Super Admin role
    if (assignerRole.name === 'Admin' && targetRoleName === 'Super Admin') {
      return { canAssign: false, reason: 'Cannot assign Super Admin role' };
    }

    // Users can only assign roles lower than their own
    const roleHierarchy = {
      'Super Admin': 5,
      'Admin': 4,
      'Manager': 3,
      'User': 2,
      'Viewer': 1
    };

    const assignerLevel = roleHierarchy[assignerRole.name as keyof typeof roleHierarchy] || 0;
    const targetLevel = roleHierarchy[targetRoleName as keyof typeof roleHierarchy] || 0;

    if (assignerLevel <= targetLevel) {
      return {
        canAssign: false,
        reason: 'Cannot assign role equal to or higher than your own'
      };
    }

    return { canAssign: true };
  } catch (error) {
    console.error('Error validating role assignment:', error);
    return { canAssign: false, reason: 'Validation error' };
  }
}