import { RoleUtils } from '@/lib/utils/role.utils';
import { Role, Permission, User } from '@/lib/database/models';
import { connectToDatabase } from '@/lib/database/connection';
import mongoose, { Types } from 'mongoose';
import { ROLES } from '@/lib/constants/permissions';

describe('RoleUtils', () => {
  let testRole: any;
  let testPermissions: any[];
  let testUser: any;

  beforeAll(async () => {
    await connectToDatabase();
  });

  beforeEach(async () => {
    // Clear all collections
    await User.deleteMany({});
    await Role.deleteMany({});
    await Permission.deleteMany({});

    // Create test permissions
    testPermissions = await Permission.create([
      {
        name: 'Read Users',
        resource: 'users',
        action: 'read',
        description: 'Can view users'
      },
      {
        name: 'Create Users',
        resource: 'users',
        action: 'create',
        description: 'Can create users'
      }
    ]);

    // Create test role
    testRole = await Role.create({
      name: 'Test Role',
      description: 'Test role for unit tests',
      permissions: testPermissions.map(p => p._id),
      isSystem: false
    });

    // Create test user
 = await User.create({
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      role: testRole._id,
      status: 'active'
    });
  });

  describe('validateRoleData', () => {
    it('should validate correct role data', () => {
      const validData = {
        name: 'Valid Role',
        description: 'A valid role description',
        permissions: [new Types.ObjectId()]
      };

      const result = RoleUtils.validateRoleData(validData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty name', () => {
      const invalidData = {
        name: '',
        description: 'Valid description',
        permissions: [new Types.ObjectId()]
      };

      const result = RoleUtils.validateRoleData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Role name is required');
    });

    it('should reject name that is too long', () => {
      const invalidData = {
        name: 'A'.repeat(51),
        description: 'Valid description',
        permissions: [new Types.ObjectId()]
      };

      const result = RoleUtils.validateRoleData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Role name cannot exceed 50 characters');
    });

    it('should reject empty description', () => {
      const invalidData = {
        name: 'Valid Name',
        description: '',
        permissions: [new Types.ObjectId()]
      };

      const result = RoleUtils.validateRoleData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Role description is required');
    });

    it('should reject description that is too long', () => {
      const invalidData = {
        name: 'Valid Name',
        description: 'A'.repeat(256),
        permissions: [new Types.ObjectId()]
      };

      const result = RoleUtils.validateRoleData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Role description cannot exceed 255 characters');
    });

    it('should reject empty permissions array', () => {
      const invalidData = {
        name: 'Valid Name',
        description: 'Valid description',
        permissions: []
      };

      const result = RoleUtils.validateRoleData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('At least one permission is required');
    });

    it('should reject non-array permissions', () => {
      const invalidData = {
        name: 'Valid Name',
        description: 'Valid description',
        permissions: 'not-an-array' as any
      };

      const result = RoleUtils.validateRoleData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Permissions must be an array');
    });
  });

  describe('canDeleteRole', () => {
    it('should allow deletion of role with no assigned users', async () => {
      // Create a role with no users
      const emptyRole = await Role.create({
        name: 'Empty Role',
        description: 'Role with no users',
        permissions: [testPermissions[0]._id],
        isSystem: false
      });

      const result = await RoleUtils.canDeleteRole(emptyRole._id);

      expect(result.canDelete).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should prevent deletion of system role', async () => {
      const systemRole = await Role.create({
        name: 'System Role',
        description: 'System role',
        permissions: [testPermissions[0]._id],
        isSystem: true
      });

      const result = await RoleUtils.canDeleteRole(systemRole._id);

      expect(result.canDelete).toBe(false);
      expect(result.reason).toBe('Cannot delete system role');
    });

    it('should prevent deletion of role with assigned users', async () => {
      const result = await RoleUtils.canDeleteRole(testRole._id);

      expect(result.canDelete).toBe(false);
      expect(result.reason).toContain('Cannot delete role with 1 assigned user(s)');
      expect(result.affectedUsers).toHaveLength(1);
      expect(result.affectedUsers![0].email).toBe('test@example.com');
    });

    it('should handle non-existent role', async () => {
      const fakeId = new Types.ObjectId();
      const result = await RoleUtils.canDeleteRole(fakeId);

      expect(result.canDelete).toBe(false);
      expect(result.reason).toBe('Role not found');
    });
  });

  describe('getRoleHierarchyLevel', () => {
    it('should return correct hierarchy levels', () => {
      expect(RoleUtils.getRoleHierarchyLevel(ROLES.SUPER_ADMIN)).toBe(5);
      expect(RoleUtils.getRoleHierarchyLevel(ROLES.ADMIN)).toBe(4);
      expect(RoleUtils.getRoleHierarchyLevel(ROLES.MANAGER)).toBe(3);
      expect(RoleUtils.getRoleHierarchyLevel(ROLES.USER)).toBe(2);
      expect(RoleUtils.getRoleHierarchyLevel(ROLES.VIEWER)).toBe(1);
    });

    it('should return 0 for unknown role', () => {
      expect(RoleUtils.getRoleHierarchyLevel('Unknown Role')).toBe(0);
    });
  });

  describe('hasHigherPrivileges', () => {
    it('should correctly compare role privileges', () => {
      expect(RoleUtils.hasHigherPrivileges(ROLES.ADMIN, ROLES.USER)).toBe(true);
      expect(RoleUtils.hasHigherPrivileges(ROLES.USER, ROLES.ADMIN)).toBe(false);
      expect(RoleUtils.hasHigherPrivileges(ROLES.MANAGER, ROLES.MANAGER)).toBe(false);
    });
  });

  describe('cloneRole', () => {
    it('should successfully clone a role', async () => {
      const clonedRole = await RoleUtils.cloneRole(
        testRole._id,
        'Cloned Role',
        'Cloned role description'
      );

      expect(clonedRole.name).toBe('Cloned Role');
      expect(clonedRole.description).toBe('Cloned role description');
      expect(clonedRole.permissions).toHaveLength(testPermissions.length);
      expect(clonedRole.isSystem).toBe(false);
    });

    it('should use default description when not provided', async () => {
      const clonedRole = await RoleUtils.cloneRole(testRole._id, 'Cloned Role');

      expect(clonedRole.description).toBe(`Copy of ${testRole.description}`);
    });

    it('should throw error for non-existent source role', async () => {
      const fakeId = new Types.ObjectId();

      await expect(
        RoleUtils.cloneRole(fakeId, 'Cloned Role')
      ).rejects.toThrow('Source role not found');
    });
  });

  describe('getRoleImpactAnalysis', () => {
    it('should return correct impact analysis', async () => {
      const analysis = await RoleUtils.getRoleImpactAnalysis(testRole._id);

      expect(analysis.userCount).toBe(1);
      expect(analysis.users).toHaveLength(1);
      expect(analysis.users[0].email).toBe('test@example.com');
      expect(analysis.permissions).toHaveLength(testPermissions.length);
    });

    it('should return empty analysis for role with no users', async () => {
      const emptyRole = await Role.create({
        name: 'Empty Role',
        description: 'Role with no users',
        permissions: [],
        isSystem: false
      });

      const analysis = await RoleUtils.getRoleImpactAnalysis(emptyRole._id);

      expect(analysis.userCount).toBe(0);
      expect(analysis.users).toHaveLength(0);
      expect(analysis.permissions).toHaveLength(0);
    });
  });

  describe('mergeRolePermissions', () => {
    it('should merge permissions from multiple roles', async () => {
      const role2 = await Role.create({
        name: 'Role 2',
        description: 'Second test role',
        permissions: [testPermissions[1]._id],
        isSystem: false
      });

      const mergedPermissions = await RoleUtils.mergeRolePermissions([
        testRole._id,
        role2._id
      ]);

      expect(mergedPermissions).toHaveLength(2);
    });

    it('should handle duplicate permissions', async () => {
      const role2 = await Role.create({
        name: 'Role 2',
        description: 'Second test role',
        permissions: testPermissions.map(p => p._id), // Same permissions
        isSystem: false
      });

      const mergedPermissions = await RoleUtils.mergeRolePermissions([
        testRole._id,
        role2._id
      ]);

      expect(mergedPermissions).toHaveLength(2); // Should not duplicate
    });
  });

  describe('validatePermissionAssignment', () => {
    it('should validate correct permission assignment', async () => {
      const result = await RoleUtils.validatePermissionAssignment(
        testRole._id,
        testPermissions.map(p => p._id)
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject assignment to non-existent role', async () => {
      const fakeId = new Types.ObjectId();
      const result = await RoleUtils.validatePermissionAssignment(
        fakeId,
        testPermissions.map(p => p._id)
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Role not found');
    });

    it('should reject assignment of non-existent permissions', async () => {
      const fakePermissionId = new Types.ObjectId();
      const result = await RoleUtils.validatePermissionAssignment(
        testRole._id,
        [fakePermissionId]
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('One or more permissions not found');
    });

    it('should reject modification of system role', async () => {
      const systemRole = await Role.create({
        name: 'System Role',
        description: 'System role',
        permissions: [],
        isSystem: true
      });

      const result = await RoleUtils.validatePermissionAssignment(
        systemRole._id,
        testPermissions.map(p => p._id)
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Cannot modify permissions of system role');
    });
  });

  describe('getRecommendedPermissions', () => {
    it('should return correct recommendations for Admin', () => {
      const recommendations = RoleUtils.getRecommendedPermissions('Admin');

      expect(recommendations).toContain('users.manage');
      expect(recommendations).toContain('roles.read');
      expect(recommendations).toContain('finance.manage');
    });

    it('should return correct recommendations for Manager', () => {
      const recommendations = RoleUtils.getRecommendedPermissions('Manager');

      expect(recommendations).toContain('users.read');
      expect(recommendations).toContain('finance.read');
      expect(recommendations).not.toContain('users.manage');
    });

    it('should return empty array for unknown role', () => {
      const recommendations = RoleUtils.getRecommendedPermissions('Unknown');

      expect(recommendations).toHaveLength(0);
    });
  });
});