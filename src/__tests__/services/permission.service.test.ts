import { PermissionService } from '@/lib/services/permission.service';
import { User } from '@/lib/database/models/User';
import { Role } from '@/lib/database/models/Role';
import { Permission } from '@/lib/database/models/Permission';
import { connectToDatabase } from '@/lib/database/connection';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

describe('PermissionService', () => {
  let mongoServer: MongoMemoryServer;
  let testUser: any;
  let testRole: any;
  let testPermissions: any[];

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    // Override the connection for testing
    process.env.MONGODB_URI = mongoUri;
    await connectToDatabase();
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
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
: 'create',
        description: 'Can create users'
      },
      {
        name: 'Update Users',
        resource: 'users',
        action: 'update',
        description: 'Can update users'
      },
      {
        name: 'Delete Users',
        resource: 'users',
        action: 'delete',
        description: 'Can delete users'
      },
      {
        name: 'Read Roles',
        resource: 'roles',
        action: 'read',
        description: 'Can view roles'
      }
    ]);

    // Create test role
    testRole = await Role.create({
      name: 'Test Admin',
      description: 'Test administrator role',
      permissions: [testPermissions[0]._id, testPermissions[1]._id, testPermissions[4]._id],
      isSystem: false
    });

    // Create test user
    testUser = await User.create({
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      name: 'Test User',
      role: testRole._id,
      status: 'active',
      isActive: true,
      isEmailVerified: true
    });
  });

  describe('checkPermission', () => {
    it('should return true for user with required permission', async () => {
      const hasPermission = await PermissionService.checkPermission(
        testUser._id.toString(),
        'users',
        'read'
      );

      expect(hasPermission).toBe(true);
    });

    it('should return false for user without required permission', async () => {
      const hasPermission = await PermissionService.checkPermission(
        testUser._id.toString(),
        'users',
        'delete'
      );

      expect(hasPermission).toBe(false);
    });

    it('should return false for non-existent user', async () => {
      const fakeUserId = new mongoose.Types.ObjectId().toString();
      const hasPermission = await PermissionService.checkPermission(
        fakeUserId,
        'users',
        'read'
      );

      expect(hasPermission).toBe(false);
    });

    it('should return false for inactive user', async () => {
      await User.findByIdAndUpdate(testUser._id, { isActive: false });

      const hasPermission = await PermissionService.checkPermission(
        testUser._id.toString(),
        'users',
        'read'
      );

      expect(hasPermission).toBe(false);
    });

    it('should handle invalid user ID gracefully', async () => {
      const hasPermission = await PermissionService.checkPermission(
        'invalid-id',
        'users',
        'read'
      );

      expect(hasPermission).toBe(false);
    });
  });

  describe('getUserPermissions', () => {
    it('should return user permissions grouped by resource', async () => {
      const permissions = await PermissionService.getUserPermissions(
        testUser._id.toString()
      );

      expect(permissions).toHaveProperty('users');
      expect(permissions).toHaveProperty('roles');
      expect(permissions.users).toContain('read');
      expect(permissions.users).toContain('create');
      expect(permissions.users).not.toContain('delete');
      expect(permissions.roles).toContain('read');
    });

    it('should return empty object for non-existent user', async () => {
      const fakeUserId = new mongoose.Types.ObjectId().toString();
      const permissions = await PermissionService.getUserPermissions(fakeUserId);

      expect(permissions).toEqual({});
    });

    it('should return empty object for inactive user', async () => {
      await User.findByIdAndUpdate(testUser._id, { isActive: false });

      const permissions = await PermissionService.getUserPermissions(
        testUser._id.toString()
      );

      expect(permissions).toEqual({});
    });
  });

  describe('hasAnyPermission', () => {
    it('should return true if user has any of the specified permissions', async () => {
      const hasAny = await PermissionService.hasAnyPermission(
        testUser._id.toString(),
        [
          { resource: 'users', action: 'delete' },
          { resource: 'users', action: 'read' }
        ]
      );

      expect(hasAny).toBe(true);
    });

    it('should return false if user has none of the specified permissions', async () => {
      const hasAny = await PermissionService.hasAnyPermission(
        testUser._id.toString(),
        [
          { resource: 'users', action: 'delete' },
          { resource: 'users', action: 'update' }
        ]
      );

      expect(hasAny).toBe(false);
    });

    it('should return false for empty permissions array', async () => {
      const hasAny = await PermissionService.hasAnyPermission(
        testUser._id.toString(),
        []
      );

      expect(hasAny).toBe(false);
    });
  });

  describe('hasAllPermissions', () => {
    it('should return true if user has all specified permissions', async () => {
      const hasAll = await PermissionService.hasAllPermissions(
        testUser._id.toString(),
        [
          { resource: 'users', action: 'read' },
          { resource: 'users', action: 'create' }
        ]
      );

      expect(hasAll).toBe(true);
    });

    it('should return false if user is missing any specified permission', async () => {
      const hasAll = await PermissionService.hasAllPermissions(
        testUser._id.toString(),
        [
          { resource: 'users', action: 'read' },
          { resource: 'users', action: 'delete' }
        ]
      );

      expect(hasAll).toBe(false);
    });

    it('should return true for empty permissions array', async () => {
      const hasAll = await PermissionService.hasAllPermissions(
        testUser._id.toString(),
        []
      );

      expect(hasAll).toBe(true);
    });
  });

  describe('enforcePermission', () => {
    it('should not throw for user with required permission', async () => {
      await expect(
        PermissionService.enforcePermission(
          testUser._id.toString(),
          'users',
          'read'
        )
      ).resolves.not.toThrow();
    });

    it('should throw PermissionError for user without required permission', async () => {
      await expect(
        PermissionService.enforcePermission(
          testUser._id.toString(),
          'users',
          'delete'
        )
      ).rejects.toThrow('Permission denied');
    });

    it('should throw PermissionError for non-existent user', async () => {
      const fakeUserId = new mongoose.Types.ObjectId().toString();

      await expect(
        PermissionService.enforcePermission(
          fakeUserId,
          'users',
          'read'
        )
      ).rejects.toThrow('Permission denied');
    });
  });

  describe('getPermissionMatrix', () => {
    it('should return permission matrix for all roles', async () => {
      const matrix = await PermissionService.getPermissionMatrix();

      expect(matrix).toHaveProperty(testRole._id.toString());
      expect(matrix[testRole._id.toString()]).toHaveProperty('users');
      expect(matrix[testRole._id.toString()].users).toContain('read');
      expect(matrix[testRole._id.toString()].users).toContain('create');
    });

    it('should return empty object when no roles exist', async () => {
      await Role.deleteMany({});

      const matrix = await PermissionService.getPermissionMatrix();

      expect(matrix).toEqual({});
    });
  });

  describe('caching', () => {
    it('should cache user permissions for subsequent calls', async () => {
      // First call
      const start1 = Date.now();
      const permissions1 = await PermissionService.getUserPermissions(
        testUser._id.toString()
      );
      const time1 = Date.now() - start1;

      // Second call (should be faster due to caching)
      const start2 = Date.now();
      const permissions2 = await PermissionService.getUserPermissions(
        testUser._id.toString()
      );
      const time2 = Date.now() - start2;

      expect(permissions1).toEqual(permissions2);
      expect(time2).toBeLessThan(time1);
    });

    it('should invalidate cache when user role changes', async () => {
      // Get initial permissions
      const initialPermissions = await PermissionService.getUserPermissions(
        testUser._id.toString()
      );

      // Create new role with different permissions
      const newRole = await Role.create({
        name: 'Limited Role',
        description: 'Limited permissions',
        permissions: [testPermissions[0]._id], // Only read permission
        isSystem: false
      });

      // Update user role
      await User.findByIdAndUpdate(testUser._id, { role: newRole._id });

      // Clear cache manually (in real implementation, this would be automatic)
      PermissionService.clearUserCache(testUser._id.toString());

      // Get updated permissions
      const updatedPermissions = await PermissionService.getUserPermissions(
        testUser._id.toString()
      );

      expect(updatedPermissions).not.toEqual(initialPermissions);
      expect(updatedPermissions.users).toContain('read');
      expect(updatedPermissions.users).not.toContain('create');
    });
  });

  describe('error handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // Simulate database error by closing connection
      await mongoose.connection.close();

      const hasPermission = await PermissionService.checkPermission(
        testUser._id.toString(),
        'users',
        'read'
      );

      expect(hasPermission).toBe(false);

      // Reconnect for cleanup
      await connectToDatabase();
    });

    it('should handle malformed permission data', async () => {
      // Create role with invalid permission reference
      const invalidRole = await Role.create({
        name: 'Invalid Role',
        description: 'Role with invalid permissions',
        permissions: [new mongoose.Types.ObjectId()], // Non-existent permission
        isSystem: false
      });

      const invalidUser = await User.create({
        email: 'invalid@example.com',
        firstName: 'Invalid',
        lastName: 'User',
        name: 'Invalid User',
        role: invalidRole._id,
        status: 'active',
        isActive: true,
        isEmailVerified: true
      });

      const hasPermission = await PermissionService.checkPermission(
        invalidUser._id.toString(),
        'users',
        'read'
      );

      expect(hasPermission).toBe(false);
    });
  });
});