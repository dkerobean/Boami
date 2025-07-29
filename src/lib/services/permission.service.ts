import { Types } from 'mongoose';
import { User, Role, Permission } from '../database/models';
import { getImpliedPermissions, isValidPermission } from '../constants/permissions';

/**
 * Permission Service for handling role-based access control
 */
export class PermissionService {
  /**
   * Check if a user has a specific permission
   */
  static async checkPermission(
    userId: Types.ObjectId | string,
    resource: string,
    action: string
  ): Promise<boolean> {
    try {
      const user = await User.findById(userId).populate({
        path: 'role',
        populate: {
          path: 'permissions'
        }
      });

      if (!user || user.status !== 'active') {
        return false;
      }

      return await user.hasPermission(resource, action);
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  }

  /**
   * Check if a user has any of the specified permissions
   */
  static async checkAnyPermission(
    userId: Types.ObjectId | string,
    permissions: Array<{ resource: string; action: string }>
  ): Promise<boolean> {
    try {
      for (const { resource, action } of permissions) {
        const hasPermission = await this.checkPermission(userId, resource, action);
        if (hasPermission) {
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Error checking any permission:', error);
      return false;
    }
  }

  /**
   * Check if a user has all of the specified permissions
   */
  static async checkAllPermissions(
    userId: Types.ObjectId | string,
    permissions: Array<{ resource: string; action: string }>
  ): Promise<boolean> {
    try {
      for (const { resource, action } of permissions) {
        const hasPermission = await this.checkPermission(userId, resource, action);
        if (!hasPermission) {
          return false;
        }
      }
      return true;
    } catch (error) {
      console.error('Error checking all permissions:', error);
      return false;
    }
  }

  /**
   * Get all permissions for a user
   */
  static async getUserPermissions(userId: Types.ObjectId | string): Promise<string[]> {
    try {
      const user = await User.findById(userId);
      if (!user || user.status !== 'active') {
        return [];
      }

      const permissions = await user.getUserPermissions();
      return permissions.map(p => `${p.resource}.${p.action}`);
    } catch (error) {
      console.error('Error getting user permissions:', error);
      return [];
    }
  }

  /**
   * Get permission matrix for all roles
   */
  static async getPermissionMatrix(): Promise<any> {
    try {
      const roles = await Role.find().populate('permissions');
      const permissions = await Permission.find();

      const matrix: any = {};

      for (const role of roles) {
        matrix[role.name] = {
          id: role._id,
          description: role.description,
          isSystem: role.isSystem,
          permissions: role.permissions.map((p: any) => ({
            id: p._id,
            name: p.name,
            resource: p.resource,
            action: p.action,
            description: p.description
          }))
        };
      }

      return {
        roles: matrix,
        allPermissions: permissions.map(p => ({
          id: p._id,
          name: p.name,
          resource: p.resource,
          action: p.action,
          description: p.description
        }))
      };
    } catch (error) {
      console.error('Error getting permission matrix:', error);
      return { roles: {}, allPermissions: [] };
    }
  }

  /**
   * Enforce permission - throws error if user doesn't have permission
   */
  static async enforcePermission(
    userId: Types.ObjectId | string,
    resource: string,
    action: string
  ): Promise<void> {
    const hasPermission = await this.checkPermission(userId, resource, action);

    if (!hasPermission) {
      const error = new Error('Insufficient permissions');
      (error as any).statusCode = 403;
      (error as any).code = 'PERMISSION_DENIED';
      (error as any).details = {
        userId,
        resource,
        action,
        required: `${resource}.${action}`
      };
      throw error;
    }
  }

  /**
   * Check if user has role-based access to a feature
   */
  static async hasFeatureAccess(
    userId: Types.ObjectId | string,
    feature: string
  ): Promise<boolean> {
    try {
      const user = await User.findById(userId);
      if (!user || user.status !== 'active') {
        return false;
      }

      // Feature access mapping
      const featurePermissions: Record<string, Array<{ resource: string; action: string }>> = {
        'user-management': [
          { resource: 'users', action: 'read' },
          { resource: 'users', action: 'manage' }
        ],
        'role-management': [
          { resource: 'roles', action: 'read' },
          { resource: 'roles', action: 'manage' }
        ],
        'finance-management': [
          { resource: 'finance', action: 'read' }
        ],
        'product-management': [
          { resource: 'products', action: 'read' }
        ],
        'reports': [
          { resource: 'reports', action: 'read' }
        ],
        'settings': [
          { resource: 'settings', action: 'read' }
        ]
      };

      const requiredPermissions = featurePermissions[feature];
      if (!requiredPermissions) {
        return false;
      }

      return await this.checkAnyPermission(userId, requiredPermissions);
    } catch (error) {
      console.error('Error checking feature access:', error);
      return false;
    }
  }

  /**
   * Log permission check for security monitoring
   */
  static async logPermissionCheck(
    userId: Types.ObjectId | string,
    resource: string,
    action: string,
    granted: boolean,
    context?: any
  ): Promise<void> {
    try {
      // In a production environment, you would log this to a security monitoring system
      const logEntry = {
        timestamp: new Date(),
        userId,
        resource,
        action,
        granted,
        context,
        userAgent: context?.userAgent,
        ip: context?.ip
      };

      console.log('Permission Check:', logEntry);

      // TODO: Implement proper security logging
      // await SecurityLog.create(logEntry);
    } catch (error) {
      console.error('Error logging permission check:', error);
    }
  }

  /**
   * Validate permission string format
   */
  static validatePermissionString(permission: string): boolean {
    return isValidPermission(permission);
  }

  /**
   * Get implied permissions for a given permission
   */
  static getImpliedPermissions(resource: string, action: string): string[] {
    return getImpliedPermissions(resource, action);
  }

  /**
   * Check if a role exists and is valid
   */
  static async validateRole(roleId: Types.ObjectId | string): Promise<boolean> {
    try {
      const role = await Role.findById(roleId);
      return !!role;
    } catch (error) {
      console.error('Error validating role:', error);
      return false;
    }
  }

  /**
   * Get user's role information
   */
  static async getUserRole(userId: Types.ObjectId | string): Promise<any> {
    try {
      const user = await User.findById(userId).populate('role');
      return user?.role || null;
    } catch (error) {
      console.error('Error getting user role:', error);
      return null;
    }
  }
}