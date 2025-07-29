'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuthContext } from '@/app/context/AuthContext';

interface PermissionContextType {
  permissions: string[];
  role: {
    id: string;
    name: string;
    description: string;
  } | null;
  loading: boolean;
  hasPermission: (resource: string, action: string) => boolean;
  hasAnyPermission: (permissions: Array<{ resource: string; action: string }>) => boolean;
  hasAllPermissions: (permissions: Array<{ resource: string; action: string }>) => boolean;
  refreshPermissions: () => Promise<void>;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

interface PermissionProviderProps {
  children: React.ReactNode;
}

export function PermissionProvider({ children }: PermissionProviderProps) {
  const { user, isLoading } = useAuthContext();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [role, setRole] = useState<PermissionContextType['role']>(null);
  const [loading, setLoading] = useState(true);

  const fetchPermissions = async () => {
    if (isLoading || !user) {
      setLoading(isLoading);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/auth/permissions/user');

      if (response.ok) {
        const data = await response.json();
        setPermissions(data.permissions || []);
        setRole(data.role || null);
      } else {
        setPermissions([]);
        setRole(null);
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
      setPermissions([]);
      setRole(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, [user, isLoading]);

  const hasPermission = (resource: string, action: string): boolean => {
    if (loading || !user) return false;

    const permissionString = `${resource}.${action}`;
    return permissions.includes(permissionString);
  };

  const hasAnyPermission = (requiredPermissions: Array<{ resource: string; action: string }>): boolean => {
    if (loading || !user) return false;

    return requiredPermissions.some(({ resource, action }) =>
      hasPermission(resource, action)
    );
  };

  const hasAllPermissions = (requiredPermissions: Array<{ resource: string; action: string }>): boolean => {
    if (loading || !user) return false;

    return requiredPermissions.every(({ resource, action }) =>
      hasPermission(resource, action)
    );
  };

  const refreshPermissions = async () => {
    await fetchPermissions();
  };

  const value: PermissionContextType = {
    permissions,
    role,
    loading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    refreshPermissions
  };

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissionContext(): PermissionContextType {
  const context = useContext(PermissionContext);
  if (context === undefined) {
    throw new Error('usePermissionContext must be used within a PermissionProvider');
  }
  return context;
}

/**
 * Optimized permission hooks that use the context
 */
export function useContextPermission(resource: string, action: string) {
  const { hasPermission, loading } = usePermissionContext();

  return {
    hasPermission: hasPermission(resource, action),
    loading
  };
}

export function useContextPermissions(
  permissions: Array<{ resource: string; action: string }>,
  requireAll: boolean = false
) {
  const { hasAnyPermission, hasAllPermissions, loading } = usePermissionContext();

  return {
    hasPermission: requireAll
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions),
    loading
  };
}