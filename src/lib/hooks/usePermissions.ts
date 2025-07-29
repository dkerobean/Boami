'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthContext } from '@/app/context/AuthContext';

/**
 * Permission check result
 */
interface PermissionResult {
  hasPermission: boolean;
  loading: boolean;
  error: string | null;
}

/**
 * User permissions data
 */
interface UserPermissions {
  permissions: string[];
  role: {
    id: string;
    name: string;
    description: string;
  } | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook to check if user has a specific permission
 */
export function usePermission(resource: string, action: string): PermissionResult {
  const { user, isLoading } = useAuthContext();
  const [result, setResult] = useState<PermissionResult>({
    hasPermission: false,
    loading: true,
    error: null
  });

  useEffect(() => {
    if (isLoading) {
      setResult(prev => ({ ...prev, loading: true }));
      return;
    }

    if (!user) {
      setResult({
        hasPermission: false,
        loading: false,
        error: 'User not authenticated'
      });
      return;
    }

    const checkPermission = async () => {
      try {
        setResult(prev => ({ ...prev, loading: true, error: null }));

        const response = await fetch('/api/auth/permissions/check', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ resource, action })
        });

        if (!response.ok) {
          throw new Error('Failed to check permission');
        }

        const data = await response.json();

        setResult({
          hasPermission: data.hasPermission,
          loading: false,
          error: null
        });
      } catch (error) {
        setResult({
          hasPermission: false,
          loading: false,
          error: error instanceof Error ? error.message : 'Permission check failed'
        });
      }
    };

    checkPermission();
  }, [resource, action, user, isLoading]);

  return result;
}

/**
 * Hook to check multiple permissions
 */
export function usePermissions(
  permissions: Array<{ resource: string; action: string }>,
  requireAll: boolean = false
): PermissionResult {
  const { user, isLoading } = useAuthContext();
  const [result, setResult] = useState<PermissionResult>({
    hasPermission: false,
    loading: true,
    error: null
  });

  useEffect(() => {
    if (isLoading) {
      setResult(prev => ({ ...prev, loading: true }));
      return;
    }

    if (!user) {
      setResult({
        hasPermission: false,
        loading: false,
        error: 'User not authenticated'
      });
      return;
    }

    const checkPermissions = async () => {
      try {
        setResult(prev => ({ ...prev, loading: true, error: null }));

        const response = await fetch('/api/auth/permissions/check-multiple', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ permissions, requireAll })
        });

        if (!response.ok) {
          throw new Error('Failed to check permissions');
        }

        const data = await response.json();

        setResult({
          hasPermission: data.hasPermission,
          loading: false,
          error: null
        });
      } catch (error) {
        setResult({
          hasPermission: false,
          loading: false,
          error: error instanceof Error ? error.message : 'Permission check failed'
        });
      }
    };

    checkPermissions();
  }, [permissions, requireAll, user, isLoading]);

  return result;
}

/**
 * Hook to get all user permissions
 */
export function useUserPermissions(): UserPermissions {
  const { user, isLoading } = useAuthContext();
  const [userPermissions, setUserPermissions] = useState<UserPermissions>({
    permissions: [],
    role: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    if (isLoading) {
      setUserPermissions(prev => ({ ...prev, loading: true }));
      return;
    }

    if (!user) {
      setUserPermissions({
        permissions: [],
        role: null,
        loading: false,
        error: 'User not authenticated'
      });
      return;
    }

    const fetchUserPermissions = async () => {
      try {
        setUserPermissions(prev => ({ ...prev, loading: true, error: null }));

        const response = await fetch('/api/auth/permissions/user');

        if (!response.ok) {
          throw new Error('Failed to fetch user permissions');
        }

        const data = await response.json();

        setUserPermissions({
          permissions: data.permissions,
          role: data.role,
          loading: false,
          error: null
        });
      } catch (error) {
        setUserPermissions({
          permissions: [],
          role: null,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to fetch permissions'
        });
      }
    };

    fetchUserPermissions();
  }, [user, isLoading]);

  return userPermissions;
}

/**
 * Hook to check feature access
 */
export function useFeatureAccess(feature: string): PermissionResult {
  const { user, isLoading } = useAuthContext();
  const [result, setResult] = useState<PermissionResult>({
    hasPermission: false,
    loading: true,
    error: null
  });

  useEffect(() => {
    if (isLoading) {
      setResult(prev => ({ ...prev, loading: true }));
      return;
    }

    if (!user) {
      setResult({
        hasPermission: false,
        loading: false,
        error: 'User not authenticated'
      });
      return;
    }

    const checkFeatureAccess = async () => {
      try {
        setResult(prev => ({ ...prev, loading: true, error: null }));

        const response = await fetch('/api/auth/permissions/feature', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ feature })
        });

        if (!response.ok) {
          throw new Error('Failed to check feature access');
        }

        const data = await response.json();

        setResult({
          hasPermission: data.hasAccess,
          loading: false,
          error: null
        });
      } catch (error) {
        setResult({
          hasPermission: false,
          loading: false,
          error: error instanceof Error ? error.message : 'Feature access check failed'
        });
      }
    };

    checkFeatureAccess();
  }, [feature, user, isLoading]);

  return result;
}

/**
 * Hook with utility functions for permission management
 */
export function usePermissionUtils() {
  const refreshPermissions = useCallback(async () => {
    // Force refresh of permission cache
    try {
      await fetch('/api/auth/permissions/refresh', { method: 'POST' });
    } catch (error) {
      console.error('Failed to refresh permissions:', error);
    }
  }, []);

  const hasAnyPermission = useCallback((
    userPermissions: string[],
    requiredPermissions: string[]
  ): boolean => {
    return requiredPermissions.some(perm => userPermissions.includes(perm));
  }, []);

  const hasAllPermissions = useCallback((
    userPermissions: string[],
    requiredPermissions: string[]
  ): boolean => {
    return requiredPermissions.every(perm => userPermissions.includes(perm));
  }, []);

  const parsePermission = useCallback((permission: string) => {
    const [resource, action] = permission.split('.');
    return { resource, action };
  }, []);

  return {
    refreshPermissions,
    hasAnyPermission,
    hasAllPermissions,
    parsePermission
  };
}