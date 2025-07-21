import { useState, useEffect, useCallback, useRef } from 'react';

interface UserData {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  designation?: string;
  phone?: string;
  company?: string;
  avatar?: string;
  profileImage?: string;
  role: 'admin' | 'user' | 'moderator';
  isActive: boolean;
  isEmailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface AuthError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
}

interface UseAuthState {
  user: UserData | null;
  loading: boolean;
  error: AuthError | null;
  isAuthenticated: boolean;
  lastRefresh: Date | null;
}

interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

interface AuthResult {
  success: boolean;
  message?: string;
  user?: UserData;
}

interface UseAuthReturn extends UseAuthState {
  refetch: () => Promise<void>;
  updateUser: (userData: Partial<UserData>) => Promise<boolean>;
  login: (credentials: LoginCredentials) => Promise<AuthResult>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  clearError: () => void;
  hasRole: (role: string) => boolean;
  isEmailVerified: () => boolean;
}

/**
 * Custom hook for user authentication and profile management
 * Enhanced with comprehensive error handling, token refresh, and performance optimizations
 * Works with HTTP-only cookies for secure authentication
 */
export const useAuth = (): UseAuthReturn => {
  const [state, setState] = useState<UseAuthState>({
    user: null,
    loading: true,
    error: null,
    isAuthenticated: false,
    lastRefresh: null,
  });

  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef<number>(0);
  const maxRetries = 3;

  // Helper function to create error object
  const createError = (code: string, message: string, details?: any): AuthError => ({
    code,
    message,
    details,
    timestamp: new Date(),
  });

  // Enhanced fetch user with retry logic and error handling
  const fetchUser = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // Check authentication status first
      const authResponse = await fetch('/api/auth/login', {
        method: 'GET',
        credentials: 'include',
      });

      if (!authResponse.ok) {
        setState(prev => ({
          ...prev,
          user: null,
          loading: false,
          error: null,
          isAuthenticated: false,
          lastRefresh: new Date(),
        }));
        return;
      }

      const authResult = await authResponse.json();

      if (!authResult.success || !authResult.authenticated) {
        setState(prev => ({
          ...prev,
          user: null,
          loading: false,
          error: null,
          isAuthenticated: false,
          lastRefresh: new Date(),
        }));
        return;
      }

      // Fetch full user profile
      const userResponse = await fetch('/api/user', {
        method: 'GET',
        credentials: 'include',
      });

      if (!userResponse.ok) {
        throw new Error(`HTTP ${userResponse.status}: ${userResponse.statusText}`);
      }

      const userResult = await userResponse.json();

      if (!userResult.success) {
        throw new Error(userResult.message || 'Failed to fetch user data');
      }

      setState(prev => ({
        ...prev,
        user: userResult.data,
        loading: false,
        error: null,
        isAuthenticated: true,
        lastRefresh: new Date(),
      }));

      // Reset retry count on success
      retryCountRef.current = 0;

    } catch (error) {
      console.error('Error fetching user data:', error);
      const authError = createError(
        'FETCH_USER_ERROR',
        error instanceof Error ? error.message : 'Failed to fetch user data',
        error
      );

      setState(prev => ({
        ...prev,
        user: null,
        loading: false,
        error: authError,
        isAuthenticated: false,
        lastRefresh: new Date(),
      }));
    }
  }, []);

  // Login function
  const login = useCallback(async (credentials: LoginCredentials): Promise<AuthResult> => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(credentials),
      });

      const result = await response.json();

      if (!response.ok) {
        const authError = createError(
          'LOGIN_ERROR',
          result.message || `HTTP ${response.status}: ${response.statusText}`,
          result
        );
        setState(prev => ({ ...prev, error: authError, loading: false }));
        return { success: false, message: authError.message };
      }

      if (!result.success) {
        const authError = createError(
          'LOGIN_FAILED',
          result.message || 'Login failed',
          result
        );
        setState(prev => ({ ...prev, error: authError, loading: false }));
        return { success: false, message: authError.message };
      }

      // Fetch user data after successful login
      await fetchUser();

      return { success: true, message: 'Login successful', user: result.user };

    } catch (error) {
      console.error('Login error:', error);
      const authError = createError(
        'LOGIN_NETWORK_ERROR',
        error instanceof Error ? error.message : 'Network error during login',
        error
      );
      setState(prev => ({ ...prev, error: authError, loading: false }));
      return { success: false, message: authError.message };
    }
  }, [fetchUser]);

  // Logout function
  const logout = useCallback(async (): Promise<void> => {
    try {
      setState(prev => ({ ...prev, loading: true }));

      // Clear refresh timeout
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }

      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });

      // Clear state regardless of response status
      setState({
        user: null,
        loading: false,
        error: null,
        isAuthenticated: false,
        lastRefresh: new Date(),
      });

      if (!response.ok) {
        console.warn('Logout request failed, but local state cleared');
      }

      // Redirect to landing page
      window.location.href = '/landingpage';

    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local state even if request fails
      setState({
        user: null,
        loading: false,
        error: null,
        isAuthenticated: false,
        lastRefresh: new Date(),
      });
      window.location.href = '/landingpage';
    }
  }, []);

  // Refresh authentication with retry logic
  const refreshAuth = useCallback(async (): Promise<void> => {
    if (retryCountRef.current >= maxRetries) {
      console.warn('Max retry attempts reached for auth refresh');
      return;
    }

    try {
      await fetchUser();
    } catch (error) {
      retryCountRef.current += 1;
      console.error(`Auth refresh failed (attempt ${retryCountRef.current}):`, error);

      if (retryCountRef.current < maxRetries) {
        // Exponential backoff retry
        const delay = Math.pow(2, retryCountRef.current) * 1000;
        setTimeout(() => refreshAuth(), delay);
      }
    }
  }, [fetchUser]);

  // Enhanced update user with optimistic updates
  const updateUser = useCallback(async (userData: Partial<UserData>): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, error: null }));

      // Optimistic update
      const previousUser = state.user;
      if (previousUser) {
        setState(prev => ({
          ...prev,
          user: { ...previousUser, ...userData },
        }));
      }

      const response = await fetch('/api/user', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        // Revert optimistic update
        setState(prev => ({ ...prev, user: previousUser }));

        if (response.status === 401) {
          setState(prev => ({ ...prev, isAuthenticated: false }));
          return false;
        }

        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        // Revert optimistic update
        setState(prev => ({ ...prev, user: previousUser }));
        throw new Error(result.message || 'Failed to update user profile');
      }

      setState(prev => ({
        ...prev,
        user: result.data,
        error: null,
      }));

      return true;

    } catch (error) {
      console.error('Error updating user profile:', error);
      const authError = createError(
        'UPDATE_PROFILE_ERROR',
        error instanceof Error ? error.message : 'Failed to update user profile',
        error
      );
      setState(prev => ({ ...prev, error: authError }));
      return false;
    }
  }, [state.user]);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Check if user has specific role
  const hasRole = useCallback((role: string): boolean => {
    return state.user?.role === role;
  }, [state.user]);

  // Check if user's email is verified
  const isEmailVerified = useCallback((): boolean => {
    return state.user?.isEmailVerified || false;
  }, [state.user]);

  // Effect to fetch user data on mount
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Auto-refresh token periodically (every 10 minutes)
  useEffect(() => {
    if (state.isAuthenticated) {
      const scheduleRefresh = () => {
        refreshTimeoutRef.current = setTimeout(() => {
          refreshAuth();
          scheduleRefresh(); // Schedule next refresh
        }, 10 * 60 * 1000); // 10 minutes
      };

      scheduleRefresh();

      return () => {
        if (refreshTimeoutRef.current) {
          clearTimeout(refreshTimeoutRef.current);
          refreshTimeoutRef.current = null;
        }
      };
    }
  }, [state.isAuthenticated, refreshAuth]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  return {
    ...state,
    refetch: fetchUser,
    updateUser,
    login,
    logout,
    refreshAuth,
    clearError,
    hasRole,
    isEmailVerified,
  };
};

export default useAuth;