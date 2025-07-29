import {
  getCurrentUser,
  checkServerPermission,
  enforceServerPermission,
  checkMultipleServerPermissions,
  checkServerFeatureAccess,
  getServerUserPermissions,
  validateRoleAssignment
} from '@/lib/utils/server-permissions';
import { getServerSession } from 'next-auth';
import { PermissionService } from '@/lib/services/permission.service';
import { redirect } from 'next/navigation';

// Mock dependencies
jest.mock('next-auth');
jest.mock('@/lib/services/permission.service');
jest.mock('next/navigation');

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockPermissionService = PermissionService as jest.Mocked<typeof PermissionService>;
const mockRedirect = redirect as jest.MockedFunction<typeof redirect>;

describe('Server Permissions Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCurrentUser', () => {
    it('should return user from session', async () => {
      const mockUser = { id: '123', email: 'test@example.com' };
      mockGetServerSession.mockResolvedValue({ user: mockUser } as any);

      const result = await getCurrentUser();

      expect(result).toEqual(mockUser);
    });

    it('should return null when no session', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const result = await getCurrentUser();

      expect(result).toBe(null);
    });

    it('should return null when session has no user', async () => {
      mockGetServerSession.mockResolvedValue({ user: null } as any);

      const result = await getCurrentUser();

      expect(result).toBe(null);
    });

    it('should handle session error gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockGetServerSession.mockRejectedValue(new Error('Session error'));

      const result = await getCurrentUser();

      expect(result).toBe(null);
      expect(consoleSpy).toHaveBeenCalledWith('Error getting current user:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('checkServerPermission', () => {
    it('should return true when user has permission', async () => {
      const mockUser = { id: '123', email: 'test@example.com' };
      mockGetServerSession.mockResolvedValue({ user: mockUser } as any);
      mockPermissionService.checkPermission.mockResolvedValue(true);

      const result = await checkServerPermission('users', 'read');

      expect(result).toBe(true);
      expect(mockPermissionService.checkPermission).toHaveBeenCalledWith('123', 'users', 'read');
    });

    it('should return false when user lacks permission', async () => {
      const mockUser = { id: '123', email: 'test@example.com' };
      mockGetServerSession.mockResolvedValue({ user: mockUser } as any);
      mockPermissionService.checkPermission.mockResolvedValue(false);

      const result = await checkServerPermission('users', 'create');

      expect(result).toBe(false);
    });

    it('should return false when no user session', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const result = await checkServerPermission('users', 'read');

      expect(result).toBe(false);
      expect(mockPermissionService.checkPermission).not.toHaveBeenCalled();
    });

    it('should handle permission check error gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const mockUser = { id: '123', email: 'test@example.com' };
      mockGetServerSession.mockResolvedValue({ user: mockUser } as any);
      mockPermissionService.checkPermission.mockRejectedValue(new Error('Permission error'));

      const result = await checkServerPermission('users', 'read');

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Server permission check error:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('enforceServerPermission', () => {
    it('should not throw when user has permission', async () => {
      const mockUser = { id: '123', email: 'test@example.com' };
      mockGetServerSession.mockResolvedValue({ user: mockUser } as any);
      mockPermissionService.checkPermission.mockResolvedValue(true);

      await expect(
        enforceServerPermission('users', 'read')
      ).resolves.not.toThrow();
    });

    it('should redirect when user lacks permission and redirectTo is provided', async () => {
      const mockUser = { id: '123', email: 'test@example.com' };
      mockGetServerSession.mockResolvedValue({ user: mockUser } as any);
      mockPermissionService.checkPermission.mockResolvedValue(false);

      await enforceServerPermission('users', 'create', '/unauthorized');

      expect(mockRedirect).toHaveBeenCalledWith('/unauthorized');
    });

    it('should throw error when user lacks permission and no redirectTo', async () => {
      const mockUser = { id: '123', email: 'test@example.com' };
      mockGetServerSession.mockResolvedValue({ user: mockUser } as any);
      mockPermissionService.checkPermission.mockResolvedValue(false);

      await expect(
        enforceServerPermission('users', 'create')
      ).rejects.toThrow('Access denied: Insufficient permissions');
    });

    it('should redirect to /unauthorized when no user session', async () => {
      mockGetServerSession.mockResolvedValue(null);

      await enforceServerPermission('users', 'read');

      expect(mockRedirect).toHaveBeenCalledWith('/unauthorized');
    });
  });

  describe('checkMultipleServerPermissions', () => {
    const testPermissions = [
      { resource: 'users', action: 'read' },
      { resource: 'users', action: 'create' }
    ];

    it('should return true when user has any permission (requireAll=false)', async () => {
      const mockUser = { id: '123', email: 'test@example.com' };
      mockGetServerSession.mockResolvedValue({ user: mockUser } as any);
      mockPermissionService.checkAnyPermission.mockResolvedValue(true);

      const result = await checkMultipleServerPermissions(testPermissions, false);

      expect(result).toBe(true);
      expect(mockPermissionService.checkAnyPermission).toHaveBeenCalledWith('123', testPermissions);
    });

    it('should return true when user has all permissions (requireAll=true)', async () => {
      const mockUser = { id: '123', email: 'test@example.com' };
      mockGetServerSession.mockResolvedValue({ user: mockUser } as any);
      mockPermissionService.checkAllPermissions.mockResolvedValue(true);

      const result = await checkMultipleServerPermissions(testPermissions, true);

      expect(result).toBe(true);
      expect(mockPermissionService.checkAllPermissions).toHaveBeenCalledWith('123', testPermissions);
    });

    it('should return false when no user session', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const result = await checkMultipleServerPermissions(testPermissions);

      expect(result).toBe(false);
    });
  });

  describe('checkServerFeatureAccess', () => {
    it('should return true when user has feature access', async () => {
      const mockUser = { id: '123', email: 'test@example.com' };
      mockGetServerSession.mockResolvedValue({ user: mockUser } as any);
      mockPermissionService.hasFeatureAccess.mockResolvedValue(true);

      const result = await checkServerFeatureAccess('advanced-reports');

      expect(result).toBe(true);
      expect(mockPermissionService.hasFeatureAccess).toHaveBeenCalledWith('123', 'advanced-reports');
    });

    it('should return false when user lacks feature access', async () => {
      const mockUser = { id: '123', email: 'test@example.com' };
      mockGetServerSession.mockResolvedValue({ user: mockUser } as any);
      mockPermissionService.hasFeatureAccess.mockResolvedValue(false);

      const result = await checkServerFeatureAccess('admin-panel');

      expect(result).toBe(false);
    });

    it('should return false when no user session', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const result = await checkServerFeatureAccess('advanced-reports');

      expect(result).toBe(false);
    });
  });

  describe('getServerUserPermissions', () => {
    it('should return user permissions and role', async () => {
      const mockUser = { id: '123', email: 'test@example.com' };
      const mockPermissions = { 'users': ['read', 'create'] };
      const mockRole = { id: 'role123', name: 'Admin' };

      mockGetServerSession.mockResolvedValue({ user: mockUser } as any);
      mockPermissionService.getUserPermissions.mockResolvedValue(mockPermissions);
      mockPermissionService.getUserRole.mockResolvedValue(mockRole);

      const result = await getServerUserPermissions();

      expect(result).toEqual({
        permissions: mockPermissions,
        role: mockRole
      });
    });

    it('should return empty data when no user session', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const result = await getServerUserPermissions();

      expect(result).toEqual({
        permissions: {},
        role: null
      });
    });

    it('should handle errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const mockUser = { id: '123', email: 'test@example.com' };
      mockGetServerSession.mockResolvedValue({ user: mockUser } as any);
      mockPermissionService.getUserPermissions.mockRejectedValue(new Error('Database error'));

      const result = await getServerUserPermissions();

      expect(result).toEqual({
        permissions: {},
        role: null
      });
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('validateRoleAssignment', () => {
    it('should allow role assignment when assigner has higher privileges', async () => {
      const mockAssignerRole = { name: 'Admin', hierarchyLevel: 4 };
      const mockTargetRole = { name: 'User', hierarchyLevel: 2 };

      mockPermissionService.getUserRole.mockResolvedValue(mockAssignerRole);

      const result = await validateRoleAssignment('assigner123', 'target456', 'targetRole123');

      expect(result.canAssign).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should prevent role assignment when assigner has lower privileges', async () => {
      const mockAssignerRole = { name: 'User', hierarchyLevel: 2 };
      const mockTargetRole = { name: 'Admin', hierarchyLevel: 4 };

      mockPermissionService.getUserRole.mockResolvedValue(mockAssignerRole);

      const result = await validateRoleAssignment('assigner123', 'target456', 'targetRole123');

      expect(result.canAssign).toBe(false);
      expect(result.reason).toContain('Cannot assign role with higher privileges');
    });

    it('should prevent role assignment when assigner has no role', async () => {
      mockPermissionService.getUserRole.mockResolvedValue(null);

      const result = await validateRoleAssignment('assigner123', 'target456', 'targetRole123');

      expect(result.canAssign).toBe(false);
      expect(result.reason).toBe('Assigner role not found');
    });

    it('should handle validation errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockPermissionService.getUserRole.mockRejectedValue(new Error('Database error'));

      const result = await validateRoleAssignment('assigner123', 'target456', 'targetRole123');

      expect(result.canAssign).toBe(false);
      expect(result.reason).toBe('Error validating role assignment');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});