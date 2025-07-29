import { Types } from 'mongoose';
import { Role, Permission, User } from '../database/models';
import { ROLES } from '../constants/permissions';

/**
 * Role management utilities
 */
export class RoleUtils {
  /**
   * Validate role data before creation/update
   */
  static validateRoleData(data: {
    name: string;
    description: string;
    permissions: Types.ObjectId[];
  }): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate name
    if (!data.name || data.name.trim().length === 0) {
      errors.push('Role name is required');
    } else if (data.name.trim().length > 50) {
      errors.push('Role name cannot exceed 50 characters');
    }

    // Validate description
    if (!data.description || data.description.trim().length === 0) {
      errors.push('Role description is required');
    } else if (data.description.trim().length > 255) {
      errors.push('Role description cannot exceed 255 characters');
    }

    // Validate permissions
    if (!data.permissions || !Array.isArray(data.permissions)) {
      errors.push('Permissions must be an array');
    } else if (data.permissions.length === 0) {
      errors.push('At least one permission is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if a role can be deleted (not system role and no users assigned)
   */
  static async canDeleteRole(roleId: Types.ObjectId | string): Promise<{
    canDelete: boolean;
    reason?: string;
    affectedUsers?: any[];
  }> {
    try {
      const role = await Role.findById(roleId);

      if (!role) {
        return { canDelete: false, reason: 'Role not found' };
      }

      // Check if it's a system role
      if (role.isSystem) {
        return { canDelete: false, reason: 'Cannot delete system role' };
      }

      // Check for users with this role
      const usersWithRole = await User.find({ role: roleId }).select('email firstName lastName');

      if (usersWithRole.length > 0) {
        return {
          canDelete: false,
          reason: `Cannot delete role with ${usersWithRole.length} assigned user(s)`,
          affectedUsers: usersWithRole.map(user => ({
            id: user._id,
            email: user.email,
            name: `${user.firstName} ${user.lastName}`
          }))
        };
      }

      return { canDelete: true };
    } catch (error) {
      console.error('Error checking if role can be deleted:', error);
      return { canDelete: false, reason: 'Error checking role deletion eligibility' };
    }
  }

  /**
   * Get role hierarchy level (for permission inheritance)
   */
  static getRoleHierarchyLevel(roleName: string): number {
    const hierarchy: Record<string, number> = {
      [ROLES.SUPER_ADMIN]: 5,
      [ROLES.ADMIN]: 4,
      [ROLES.MANAGER]: 3,
      [ROLES.USER]: 2,
      [ROLES.VIEWER]: 1
    };

    return hierarchy[roleName] || 0;
  }

  /**
   * Check if role A has higher privileges than role B
   */
  static hasHigherPrivileges(roleA: string, roleB: string): boolean {
    return this.getRoleHierarchyLevel(roleA) > this.getRoleHierarchyLevel(roleB);
  }

  /**
   * Get default role for new users
   */
  static async getDefaultRole(): Promise<any> {
    try {
      return await Role.findByName(ROLES.USER);
    } catch (error) {
      console.error('Error getting default role:', error);
      return null;
    }
  }

  /**
   * Clone a role with new name
   */
  static async cloneRole(
    sourceRoleId: Types.ObjectId | string,
    newName: string,
    newDescription?: string
  ): Promise<any> {
    try {
      const sourceRole = await Role.findById(sourceRoleId).populate('permissions');

      if (!sourceRole) {
        throw new Error('Source role not found');
      }

      const clonedRole = await Role.create({
        name: newName,
        description: newDescription || `Copy of ${sourceRole.description}`,
        permissions: sourceRole.permissions.map((p: any) => p._id),
        isSystem: false
      });

      return clonedRole;
    } catch (error) {
      console.error('Error cloning role:', error);
      throw error;
    }
  }

  /**
   * Get role impact analysis (users affected by role changes)
   */
  static async getRoleImpactAnalysis(roleId: Types.ObjectId | string): Promise<{
    userCount: number;
    users: any[];
    permissions: any[];
  }> {
    try {
      const [users, role] = await Promise.all([
        User.find({ role: roleId }).select('email firstName lastName lastLogin status'),
        Role.findById(roleId).populate('permissions')
      ]);

      return {
        userCount: users.length,
        users: users.map(user => ({
          id: user._id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          lastLogin: user.lastLogin,
          status: user.status
        })),
        permissions: role?.permissions || []
      };
    } catch (error) {
      console.error('Error getting role impact analysis:', error);
      return { userCount: 0, users: [], permissions: [] };
    }
  }

  /**
   * Merge permissions from multiple roles
   */
  static async mergeRolePermissions(roleIds: Types.ObjectId[]): Promise<Types.ObjectId[]> {
    try {
      const roles = await Role.find({ _id: { $in: roleIds } });
      const allPermissions = new Set<string>();

      roles.forEach(role => {
        role.permissions.forEach(permId => {
          allPermissions.add(permId.toString());
        });
      });

      return Array.from(allPermissions).map(id => new Types.ObjectId(id));
    } catch (error) {
      console.error('Error merging role permissions:', error);
      return [];
    }
  }

  /**
   * Get permission conflicts between roles
   */
  static async getPermissionConflicts(roleIds: Types.ObjectId[]): Promise<{
    conflicts: any[];
    overlaps: any[];
  }> {
    try {
      const roles = await Role.find({ _id: { $in: roleIds } }).populate('permissions');
      const permissionMap = new Map<string, string[]>();

      // Map permissions to roles
      roles.forEach(role => {
        role.permissions.forEach((perm: any) => {
          const permKey = `${perm.resource}.${perm.action}`;
          if (!permissionMap.has(permKey)) {
            permissionMap.set(permKey, []);
          }
          permissionMap.get(permKey)!.push(role.name);
        });
      });

      const conflicts: any[] = [];
      const overlaps: any[] = [];

      permissionMap.forEach((roleNames, permission) => {
        if (roleNames.length > 1) {
          overlaps.push({
            permission,
            roles: roleNames
          });
        }
      });

      return { conflicts, overlaps };
    } catch (error) {
      console.error('Error getting permission conflicts:', error);
      return { conflicts: [], overlaps: [] };
    }
  }

  /**
   * Validate permission assignment to role
   */
  static async validatePermissionAssignment(
    roleId: Types.ObjectId | string,
    permissionIds: Types.ObjectId[]
  ): Promise<{ isValid: boolean; errors: string[] }> {
    try {
      const errors: string[] = [];

      // Check if role exists
      const role = await Role.findById(roleId);
      if (!role) {
        errors.push('Role not found');
        return { isValid: false, errors };
      }

      // Check if all permissions exist
      const permissions = await Permission.find({ _id: { $in: permissionIds } });
      if (permissions.length !== permissionIds.length) {
        errors.push('One or more permissions not found');
      }

      // Check for system role modification restrictions
      if (role.isSystem) {
        errors.push('Cannot modify permissions of system role');
      }

      return {
        isValid: errors.length === 0,
        errors
      };
    } catch (error) {
      console.error('Error validating permission assignment:', error);
      return { isValid: false, errors: ['Validation error occurred'] };
    }
  }

  /**
   * Get recommended permissions for a role based on its name/type
   */
  static getRecommendedPermissions(roleName: string): string[] {
    const recommendations: Record<string, string[]> = {
      'Admin': [
        'users.manage', 'roles.read', 'finance.manage', 'products.manage',
        'reports.read', 'dashboard.read', 'settings.read'
      ],
      'Manager': [
        'users.read', 'finance.read', 'finance.update', 'products.read',
        'products.update', 'reports.read', 'reports.create', 'dashboard.read'
      ],
      'User': [
        'finance.read', 'finance.create', 'finance.update', 'products.read',
        'reports.read', 'dashboard.read'
      ],
      'Viewer': [
        'finance.read', 'products.read', 'reports.read', 'dashboard.read'
      ]
    };

    return recommendations[roleName] || [];
  }
}