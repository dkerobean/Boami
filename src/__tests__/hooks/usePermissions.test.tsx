import { renderHook, waitFor } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import {
  usePermission,
  usePermissions,
  useUserPermissions,
  useFeatureAccess,
  usePermissionUtils
} from '@/lib/hooks/usePermissions';

// Mock next-auth
jest.mock('next-auth/react');
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;

// Mock fetch
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('usePermissions hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  describe('usePermission', () => {
    it('should return loading state initially', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading'
      } as any);

      const { result } = renderHook(() => usePermission('users', 'read'));

      expect(result.current.loading).toBe(true);
      expect(result.current.hasPermission).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('should return error when user is not authenticated', async () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated'
      } as any);

      const { result } = renderHook(() => usePermission('users', 'read'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.hasPermission).toBe(false);
        expect(result.current.error).toBe('User not authenticated');
      });
    });

    it('should check permission when user is authenticated', async () => {
      mockUseSession.mockReturnValue({
        data: { user: { id: '123', email: 'test@example.com' } },
        status: 'authenticated'
      } as any);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ hasPermission: true })
      } as Response);

      const { result } = renderHook(() => usePermission('users', 'read'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.hasPermission).toBe(true);
        expect(result.current.error).toBe(null);
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/permissions/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ resource: 'users', action: 'read' })
      });
    });

    it('should handle API error', async () => {
      mockUseSession.mockReturnValue({
        data: { user: { id: '123', email: 'test@example.com' } },
        status: 'authenticated'
      } as any);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      } as Response);

      const { result } = renderHook(() => usePermission('users', 'read'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.hasPermission).toBe(false);
        expect(result.current.error).toBe('Failed to check permission');
      });
    });

    it('should handle network error', async () => {
      mockUseSession.mockReturnValue({
        data: { user: { id: '123', email: 'test@example.com' } },
        status: 'authenticated'
      } as any);

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => usePermission('users', 'read'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.hasPermission).toBe(false);
        expect(result.current.error).toBe('Network error');
      });
    });
  });

  describe('usePermissions', () => {
    const testPermissions = [
      { resource: 'users', action: 'read' },
      { resource: 'users', action: 'create' }
    ];

    it('should check multiple permissions with requireAll=false', async () => {
      mockUseSession.mockReturnValue({
        data: { user: { id: '123', email: 'test@example.com' } },
        status: 'authenticated'
      } as any);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ hasPermission: true })
      } as Response);

      const { result } = renderHook(() =>
        usePermissions(testPermissions, false)
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.hasPermission).toBe(true);
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/permissions/check-multiple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ permissions: testPermissions, requireAll: false })
      });
    });

    it('should check multiple permissions with requireAll=true', async () => {
      mockUseSession.mockReturnValue({
        data: { user: { id: '123', email: 'test@example.com' } },
        status: 'authenticated'
      } as any);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ hasPermission: false })
      } as Response);

      const { result } = renderHook(() =>
        usePermissions(testPermissions, true)
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.hasPermission).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/permissions/check-multiple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ permissions: testPermissions, requireAll: true })
      });
    });
  });

  describe('useUserPermissions', () => {
    it('should fetch user permissions', async () => {
      mockUseSession.mockReturnValue({
        data: { user: { id: '123', email: 'test@example.com' } },
        status: 'authenticated'
      } as any);

      const mockPermissionsData = {
        permissions: ['users.read', 'users.create'],
        role: {
          id: 'role123',
          name: 'Admin',
          description: 'Administrator role'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPermissionsData
      } as Response);

      const { result } = renderHook(() => useUserPermissions());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.permissions).toEqual(['users.read', 'users.create']);
        expect(result.current.role).toEqual(mockPermissionsData.role);
        expect(result.current.error).toBe(null);
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/permissions/user');
    });

    it('should handle fetch error', async () => {
      mockUseSession.mockReturnValue({
        data: { user: { id: '123', email: 'test@example.com' } },
        status: 'authenticated'
      } as any);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      } as Response);

      const { result } = renderHook(() => useUserPermissions());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.permissions).toEqual([]);
        expect(result.current.role).toBe(null);
        expect(result.current.error).toBe('Failed to fetch user permissions');
      });
    });
  });

  describe('useFeatureAccess', () => {
    it('should check feature access', async () => {
      mockUseSession.mockReturnValue({
        data: { user: { id: '123', email: 'test@example.com' } },
        status: 'authenticated'
      } as any);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ hasAccess: true })
      } as Response);

      const { result } = renderHook(() => useFeatureAccess('advanced-reports'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.hasPermission).toBe(true);
        expect(result.current.error).toBe(null);
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/permissions/feature', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ feature: 'advanced-reports' })
      });
    });

    it('should handle feature access denial', async () => {
      mockUseSession.mockReturnValue({
        data: { user: { id: '123', email: 'test@example.com' } },
        status: 'authenticated'
      } as any);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ hasAccess: false })
      } as Response);

      const { result } = renderHook(() => useFeatureAccess('admin-panel'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.hasPermission).toBe(false);
        expect(result.current.error).toBe(null);
      });
    });
  });

  describe('usePermissionUtils', () => {
    it('should provide utility functions', () => {
      const { result } = renderHook(() => usePermissionUtils());

      expect(typeof result.current.refreshPermissions).toBe('function');
      expect(typeof result.current.hasAnyPermission).toBe('function');
      expect(typeof result.current.hasAllPermissions).toBe('function');
      expect(typeof result.current.parsePermission).toBe('function');
    });

    it('should check if user has any permission', () => {
      const { result } = renderHook(() => usePermissionUtils());

      const userPermissions = ['users.read', 'products.read'];
      const requiredPermissions = ['users.create', 'users.read'];

      const hasAny = result.current.hasAnyPermission(userPermissions, requiredPermissions);

      expect(hasAny).toBe(true);
    });

    it('should check if user has all permissions', () => {
      const { result } = renderHook(() => usePermissionUtils());

      const userPermissions = ['users.read', 'users.create', 'products.read'];
      const requiredPermissions = ['users.read', 'users.create'];

      const hasAll = result.current.hasAllPermissions(userPermissions, requiredPermissions);

      expect(hasAll).toBe(true);
    });

    it('should return false when user lacks some permissions', () => {
      const { result } = renderHook(() => usePermissionUtils());

      const userPermissions = ['users.read'];
      const requiredPermissions = ['users.read', 'users.create'];

      const hasAll = result.current.hasAllPermissions(userPermissions, requiredPermissions);

      expect(hasAll).toBe(false);
    });

    it('should parse permission string correctly', () => {
      const { result } = renderHook(() => usePermissionUtils());

      const parsed = result.current.parsePermission('users.create');

      expect(parsed).toEqual({
        resource: 'users',
        action: 'create'
      });
    });

    it('should handle malformed permission string', () => {
      const { result } = renderHook(() => usePermissionUtils());

      const parsed = result.current.parsePermission('malformed');

      expect(parsed).toEqual({
        resource: 'malformed',
        action: undefined
      });
    });

    it('should refresh permissions', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      } as Response);

      const { result } = renderHook(() => usePermissionUtils());

      await result.current.refreshPermissions();

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/permissions/refresh', {
        method: 'POST'
      });
    });

    it('should handle refresh permissions error silently', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => usePermissionUtils());

      await result.current.refreshPermissions();

      expect(consoleSpy).toHaveBeenCalledWith('Failed to refresh permissions:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });
});