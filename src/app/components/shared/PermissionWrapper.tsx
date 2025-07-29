'use client';

import React from 'react';
import { usePermission, usePermissions } from '@/lib/hooks/usePermissions';

interface PermissionWrapperProps {
  children: React.ReactNode;
  resource?: string;
  action?: string;
  permissions?: Array<{ resource: string; action: string }>;
  requireAll?: boolean;
  fallback?: React.ReactNode;
  loading?: React.ReactNode;
}

/**
 * PermissionWrapper component that conditionally renders children based on user permissions
 */
export default function PermissionWrapper({
  children,
  resource,
  action,
  permissions,
  requireAll = false,
  fallback = null,
  loading = null
}: PermissionWrapperProps) {
  // Single permission check
  const singlePermissionResult = usePermission(
    resource || '',
    action || ''
  );

  // Multiple permissions check
  const multiplePermissionsResult = usePermissions(
    permissions || [],
    requireAll
  );

  // Determine which result to use
  const result = permissions && permissions.length > 0
    ? multiplePermissionsResult
    : singlePermissionResult;

  // Show loading state if specified
  if (result.loading && loading) {
    return <>{loading}</>;
  }

  // Show children if user has permission, otherwise show fallback
  return result.hasPermission ? <>{children}</> : <>{fallback}</>;
}

/**
 * Hook-based permission wrapper for functional components
 */
export function usePermissionWrapper(
  resource: string,
  action: string
): {
  hasPermission: boolean;
  loading: boolean;
  PermissionWrapper: React.ComponentType<{ children: React.ReactNode; fallback?: React.ReactNode }>;
} {
  const { hasPermission, loading } = usePermission(resource, action);

  const PermissionWrapper = ({ children, fallback = null }: {
    children: React.ReactNode;
    fallback?: React.ReactNode;
  }) => {
    if (loading) return null;
    return hasPermission ? <>{children}</> : <>{fallback}</>;
  };

  return {
    hasPermission,
    loading,
    PermissionWrapper
  };
}

/**
 * Higher-order component for permission-based rendering
 */
export function withPermission<P extends object>(
  Component: React.ComponentType<P>,
  resource: string,
  action: string,
  fallback?: React.ComponentType<P>
) {
  return function PermissionProtectedComponent(props: P) {
    const { hasPermission, loading } = usePermission(resource, action);

    if (loading) {
      return null;
    }

    if (!hasPermission) {
      return fallback ? <fallback {...props} /> : null;
    }

    return <Component {...props} />;
  };
}

/**
 * Permission-based button component
 */
interface PermissionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  resource: string;
  action: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  loadingText?: string;
}

export function PermissionButton({
  resource,
  action,
  children,
  fallback = null,
  loadingText = 'Loading...',
  ...buttonProps
}: PermissionButtonProps) {
  const { hasPermission, loading } = usePermission(resource, action);

  if (loading) {
    return (
      <button {...buttonProps} disabled>
        {loadingText}
      </button>
    );
  }

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <button {...buttonProps}>{children}</button>;
}

/**
 * Permission-based link component
 */
interface PermissionLinkProps {
  resource: string;
  action: string;
  href: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
}

export function PermissionLink({
  resource,
  action,
  href,
  children,
  fallback = null,
  className
}: PermissionLinkProps) {
  const { hasPermission, loading } = usePermission(resource, action);

  if (loading) {
    return null;
  }

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
}

/**
 * Feature gate component
 */
interface FeatureGateProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function FeatureGate({ feature, children, fallback = null }: FeatureGateProps) {
  // This would use a feature access hook when implemented
  // For now, we'll just render the children
  return <>{children}</>;
}