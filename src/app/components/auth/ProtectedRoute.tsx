"use client";
import { useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Box, CircularProgress, Typography, Alert } from '@mui/material';
import { JWTManager, IJWTPayload } from '@/lib/auth/jwt';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: string[]; // Optional role-based access control
  redirectTo?: string; // Custom redirect path
  fallback?: ReactNode; // Custom loading component
  requireEmailVerification?: boolean; // Require email to be verified
  showUnauthorizedMessage?: boolean; // Show error message instead of redirect
}

interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: IJWTPayload | null;
  error: string | null;
}

export default function ProtectedRoute({
  children,
  requiredRoles = [],
  redirectTo = '/auth/auth1/login',
  fallback,
  requireEmailVerification = true,
  showUnauthorizedMessage = false
}: ProtectedRouteProps) {
  const router = useRouter();
  const [authState, setAuthState] = useState<AuthState>({
    isLoading: true,
    isAuthenticated: false,
    user: null,
    error: null
  });

  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

      // Get access token from cookies
      const cookies = document.cookie.split(';');
      const accessTokenCookie = cookies.find(cookie => 
        cookie.trim().startsWith('accessToken=')
      );

      if (!accessTokenCookie) {
        handleAuthenticationFailure('No access token found');
        return;
      }

      const accessToken = accessTokenCookie.split('=')[1];
      
      if (!accessToken) {
        handleAuthenticationFailure('Invalid access token');
        return;
      }

      // Verify the token
      const payload = JWTManager.verifyAccessToken(accessToken);
      
      if (!payload) {
        handleAuthenticationFailure('Invalid or expired token');
        return;
      }

      // Check if email verification is required
      if (requireEmailVerification && !payload.isEmailVerified) {
        handleAuthenticationFailure(
          'Email verification required',
          '/auth/auth1/verify-email?email=' + encodeURIComponent(payload.email)
        );
        return;
      }

      // Check role-based access
      if (requiredRoles.length > 0 && !requiredRoles.includes(payload.role)) {
        handleAuthenticationFailure(
          `Access denied. Required roles: ${requiredRoles.join(', ')}`
        );
        return;
      }

      // Authentication successful
      setAuthState({
        isLoading: false,
        isAuthenticated: true,
        user: payload,
        error: null
      });

    } catch (error) {
      console.error('Authentication check failed:', error);
      handleAuthenticationFailure('Authentication verification failed');
    }
  };

  const handleAuthenticationFailure = (error: string, customRedirect?: string) => {
    setAuthState({
      isLoading: false,
      isAuthenticated: false,
      user: null,
      error
    });

    if (!showUnauthorizedMessage) {
      const redirectPath = customRedirect || redirectTo;
      const currentPath = window.location.pathname + window.location.search;
      
      // Add return URL as query parameter
      const separator = redirectPath.includes('?') ? '&' : '?';
      const fullRedirectPath = `${redirectPath}${separator}returnUrl=${encodeURIComponent(currentPath)}`;
      
      // Small delay to prevent flash of content
      setTimeout(() => {
        router.push(fullRedirectPath);
      }, 100);
    }
  };

  const refreshAuth = async () => {
    await checkAuthentication();
  };

  // Loading state
  if (authState.isLoading) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="50vh"
        gap={2}
      >
        <CircularProgress size={40} />
        <Typography variant="body2" color="textSecondary">
          Verifying authentication...
        </Typography>
      </Box>
    );
  }

  // Error state (when showUnauthorizedMessage is true)
  if (!authState.isAuthenticated && showUnauthorizedMessage) {
    return (
      <Box p={3}>
        <Alert 
          severity="error" 
          sx={{ mb: 2 }}
          action={
            <Box>
              <Typography
                component="span"
                variant="body2"
                sx={{ 
                  cursor: 'pointer', 
                  textDecoration: 'underline',
                  ml: 1
                }}
                onClick={() => router.push(redirectTo)}
              >
                Sign In
              </Typography>
            </Box>
          }
        >
          <Typography variant="h6" gutterBottom>
            Access Denied
          </Typography>
          <Typography variant="body2">
            {authState.error || 'You need to be authenticated to access this page.'}
          </Typography>
        </Alert>
      </Box>
    );
  }

  // Not authenticated (redirect is happening)
  if (!authState.isAuthenticated) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="50vh"
        gap={2}
      >
        <CircularProgress size={40} />
        <Typography variant="body2" color="textSecondary">
          Redirecting to login...
        </Typography>
      </Box>
    );
  }

  // Authenticated - render children with auth context
  return (
    <AuthContextProvider user={authState.user} refreshAuth={refreshAuth}>
      {children}
    </AuthContextProvider>
  );
}

// Auth Context Provider to pass user data to children
interface AuthContextProps {
  user: IJWTPayload | null;
  refreshAuth: () => Promise<void>;
  children: ReactNode;
}

function AuthContextProvider({ user, refreshAuth, children }: AuthContextProps) {
  // You could create a React Context here to provide user data to child components
  // For now, just render children
  return <>{children}</>;
}

// Higher-order component version
export function withProtectedRoute<P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<ProtectedRouteProps, 'children'>
) {
  return function ProtectedComponent(props: P) {
    return (
      <ProtectedRoute {...options}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}

// Hook for accessing auth state in protected components
export function useAuth() {
  const [user, setUser] = useState<IJWTPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const cookies = document.cookie.split(';');
        const accessTokenCookie = cookies.find(cookie => 
          cookie.trim().startsWith('accessToken=')
        );

        if (!accessTokenCookie) {
          setUser(null);
          setIsLoading(false);
          return;
        }

        const accessToken = accessTokenCookie.split('=')[1];
        const payload = JWTManager.verifyAccessToken(accessToken);
        
        setUser(payload);
      } catch (error) {
        console.error('Auth check failed:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const logout = () => {
    // Clear auth cookies
    document.cookie = 'accessToken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    document.cookie = 'refreshToken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    
    setUser(null);
    
    // Redirect to login
    window.location.href = '/auth/auth1/login';
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    logout
  };
}

// Example usage components for different access levels
export const AdminRoute = ({ children }: { children: ReactNode }) => (
  <ProtectedRoute requiredRoles={['admin']}>
    {children}
  </ProtectedRoute>
);

export const ManagerRoute = ({ children }: { children: ReactNode }) => (
  <ProtectedRoute requiredRoles={['admin', 'manager']}>
    {children}
  </ProtectedRoute>
);

export const UserRoute = ({ children }: { children: ReactNode }) => (
  <ProtectedRoute requiredRoles={['admin', 'manager', 'user']}>
    {children}
  </ProtectedRoute>
);