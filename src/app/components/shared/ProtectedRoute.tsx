"use client";
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Typography, Button, Alert } from '@mui/material';
import { useAuthContext } from '@/app/context/AuthContext';
import { useLoadingContext } from '@/app/components/shared/loading';

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
  requireEmailVerification?: boolean;
  requiredRole?: string;
  showFallback?: boolean;
}

/**
 * Protected Route Component
 * Provides component-level authentication protection with loading states
 */
export function ProtectedRoute({
  children,
  fallback,
  redirectTo = '/auth/auth1/login',
  requireEmailVerification = false,
  requiredRole,
  showFallback = true,
}: ProtectedRouteProps) {
  const router = useRouter();
  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    hasRole,
    isEmailVerified,
    clearError
  } = useAuthContext();
  const { setLoading } = useLoadingContext();

  // Show loading during authentication check
  useEffect(() => {
    setLoading(isLoading);

    return () => {
      setLoading(false);
    };
  }, [isLoading, setLoading]);

  // Handle authentication redirect
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const currentPath = window.location.pathname;
      const redirectUrl = new URL(redirectTo, window.location.origin);
      redirectUrl.searchParams.set('redirect', currentPath);
      router.push(redirectUrl.toString());
    }
  }, [isLoading, isAuthenticated, redirectTo, router]);

  // Handle role-based access
  useEffect(() => {
    if (!isLoading && isAuthenticated && requiredRole && !hasRole(requiredRole)) {
      console.warn(`Access denied: User does not have required role: ${requiredRole}`);
      router.push('/dashboards/modern'); // Redirect to default dashboard
    }
  }, [isLoading, isAuthenticated, requiredRole, hasRole, router]);

  // Handle email verification requirement
  useEffect(() => {
    if (!isLoading && isAuthenticated && requireEmailVerification && !isEmailVerified()) {
      console.warn('Access denied: Email verification required');
      router.push('/auth/auth1/verify-email');
    }
  }, [isLoading, isAuthenticated, requireEmailVerification, isEmailVerified, router]);

  // Show loading state
  if (isLoading) {
    return fallback || <DefaultLoadingFallback />;
  }

  // Show error state
  if (error && showFallback) {
    return <ErrorFallback error={error} onRetry={clearError} />;
  }

  // Show unauthenticated state
  if (!isAuthenticated && showFallback) {
    return <UnauthenticatedFallback redirectTo={redirectTo} />;
  }

  // Show role access denied state
  if (isAuthenticated && requiredRole && !hasRole(requiredRole) && showFallback) {
    return <AccessDeniedFallback requiredRole={requiredRole} userRole={user?.role} />;
  }

  // Show email verification required state
  if (isAuthenticated && requireEmailVerification && !isEmailVerified() && showFallback) {
    return <EmailVerificationRequiredFallback />;
  }

  // Render protected content
  if (isAuthenticated) {
    // Additional role check
    if (requiredRole && !hasRole(requiredRole)) {
      return null; // Will be handled by useEffect redirect
    }

    // Additional email verification check
    if (requireEmailVerification && !isEmailVerified()) {
      return null; // Will be handled by useEffect redirect
    }

    return <>{children}</>;
  }

  // Default fallback
  return null;
}

/**
 * Default loading fallback component
 */
function DefaultLoadingFallback() {
  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="200px"
      flexDirection="column"
      gap={2}
    >
      <Typography variant="body1" color="text.secondary">
        Checking authentication...
      </Typography>
    </Box>
  );
}

/**
 * Error fallback component
 */
interface ErrorFallbackProps {
  error: { message: string; code: string };
  onRetry: () => void;
}

function ErrorFallback({ error, onRetry }: ErrorFallbackProps) {
  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="300px"
      flexDirection="column"
      gap={2}
      p={3}
    >
      <Alert severity="error" sx={{ mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Authentication Error
        </Typography>
        <Typography variant="body2">
          {error.message}
        </Typography>
      </Alert>
      <Button variant="contained" onClick={onRetry}>
        Retry
      </Button>
    </Box>
  );
}

/**
 * Unauthenticated fallback component
 */
interface UnauthenticatedFallbackProps {
  redirectTo: string;
}

function UnauthenticatedFallback({ redirectTo }: UnauthenticatedFallbackProps) {
  const router = useRouter();

  const handleLogin = () => {
    const currentPath = window.location.pathname;
    const redirectUrl = new URL(redirectTo, window.location.origin);
    redirectUrl.searchParams.set('redirect', currentPath);
    router.push(redirectUrl.toString());
  };

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="400px"
      flexDirection="column"
      gap={3}
      p={3}
    >
      <Typography variant="h5" gutterBottom>
        Authentication Required
      </Typography>
      <Typography variant="body1" color="text.secondary" textAlign="center">
        You need to be logged in to access this page.
      </Typography>
      <Button variant="contained" size="large" onClick={handleLogin}>
        Login
      </Button>
    </Box>
  );
}

/**
 * Access denied fallback component
 */
interface AccessDeniedFallbackProps {
  requiredRole: string;
  userRole?: string;
}

function AccessDeniedFallback({ requiredRole, userRole }: AccessDeniedFallbackProps) {
  const router = useRouter();

  const handleGoBack = () => {
    router.push('/dashboards/modern');
  };

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="400px"
      flexDirection="column"
      gap={3}
      p={3}
    >
      <Alert severity="warning" sx={{ mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Access Denied
        </Typography>
        <Typography variant="body2">
          You don't have the required permissions to access this page.
        </Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>
          Required role: <strong>{requiredRole}</strong>
          {userRole && (
            <>
              <br />
              Your role: <strong>{userRole}</strong>
            </>
          )}
        </Typography>
      </Alert>
      <Button variant="contained" onClick={handleGoBack}>
        Go to Dashboard
      </Button>
    </Box>
  );
}

/**
 * Email verification required fallback component
 */
function EmailVerificationRequiredFallback() {
  const router = useRouter();

  const handleVerifyEmail = () => {
    router.push('/auth/auth1/verify-email');
  };

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="400px"
      flexDirection="column"
      gap={3}
      p={3}
    >
      <Alert severity="info" sx={{ mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Email Verification Required
        </Typography>
        <Typography variant="body2">
          You need to verify your email address to access this page.
        </Typography>
      </Alert>
      <Button variant="contained" onClick={handleVerifyEmail}>
        Verify Email
      </Button>
    </Box>
  );
}

export default ProtectedRoute;