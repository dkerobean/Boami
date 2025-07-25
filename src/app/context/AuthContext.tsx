"use client";
import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';

// Types and interfaces
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

interface AuthState {
  user: UserData | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: AuthError | null;
  lastRefresh: Date | null;
  tokenExpiry: Date | null;
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

interface AuthContextType {
  user: UserData | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: AuthError | null;
  login: (credentials: LoginCredentials) => Promise<AuthResult>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  updateProfile: (data: Partial<UserData>) => Promise<boolean>;
  clearError: () => void;
  hasRole: (role: string) => boolean;
  isEmailVerified: () => boolean;
}

// Action types
type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USER'; payload: UserData | null }
  | { type: 'SET_ERROR'; payload: AuthError | null }
  | { type: 'SET_AUTHENTICATED'; payload: boolean }
  | { type: 'SET_LAST_REFRESH'; payload: Date | null }
  | { type: 'SET_TOKEN_EXPIRY'; payload: Date | null }
  | { type: 'CLEAR_ERROR' }
  | { type: 'RESET_STATE' };

// Initial state
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  lastRefresh: null,
  tokenExpiry: null,
};

// Reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: !!action.payload,
        isLoading: false,
        error: null
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false
      };
    case 'SET_AUTHENTICATED':
      return { ...state, isAuthenticated: action.payload };
    case 'SET_LAST_REFRESH':
      return { ...state, lastRefresh: action.payload };
    case 'SET_TOKEN_EXPIRY':
      return { ...state, tokenExpiry: action.payload };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'RESET_STATE':
      return { ...initialState, isLoading: false };
    default:
      return state;
  }
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Helper function to create error object
  const createError = (code: string, message: string, details?: any): AuthError => ({
    code,
    message,
    details,
    timestamp: new Date(),
  });

  // Fetch user data
  const fetchUser = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      // Check authentication status first
      const authResponse = await fetch('/api/auth/login', {
        method: 'GET',
        credentials: 'include',
      });

      if (!authResponse.ok) {
        dispatch({ type: 'SET_USER', payload: null });
        return;
      }

      const authResult = await authResponse.json();

      if (!authResult.success || !authResult.authenticated) {
        dispatch({ type: 'SET_USER', payload: null });
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

      dispatch({ type: 'SET_USER', payload: userResult.data });
      dispatch({ type: 'SET_LAST_REFRESH', payload: new Date() });

    } catch (error) {
      console.error('Error fetching user data:', error);
      const authError = createError(
        'FETCH_USER_ERROR',
        error instanceof Error ? error.message : 'Failed to fetch user data',
        error
      );
      dispatch({ type: 'SET_ERROR', payload: authError });
      dispatch({ type: 'SET_USER', payload: null });
    }
  }, []);

  // Login function
  const login = useCallback(async (credentials: LoginCredentials): Promise<AuthResult> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });

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
        dispatch({ type: 'SET_ERROR', payload: authError });
        return { success: false, message: authError.message };
      }

      if (!result.success) {
        const authError = createError(
          'LOGIN_FAILED',
          result.message || 'Login failed',
          result
        );
        dispatch({ type: 'SET_ERROR', payload: authError });
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
      dispatch({ type: 'SET_ERROR', payload: authError });
      return { success: false, message: authError.message };
    }
  }, [fetchUser]);

  // Logout function
  const logout = useCallback(async (): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });

      // Clear state regardless of response status
      dispatch({ type: 'RESET_STATE' });

      if (!response.ok) {
        console.warn('Logout request failed, but local state cleared');
      }

      // Redirect to landing page
      window.location.href = '/landingpage';

    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local state even if request fails
      dispatch({ type: 'RESET_STATE' });
      window.location.href = '/landingpage';
    }
  }, []);

  // Refresh authentication
  const refreshAuth = useCallback(async (): Promise<void> => {
    await fetchUser();
  }, [fetchUser]);

  // Update user profile
  const updateProfile = useCallback(async (userData: Partial<UserData>): Promise<boolean> => {
    try {
      dispatch({ type: 'CLEAR_ERROR' });

      const response = await fetch('/api/user', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        if (response.status === 401) {
          dispatch({ type: 'SET_USER', payload: null });
          return false;
        }

        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to update user profile');
      }

      dispatch({ type: 'SET_USER', payload: result.data });
      return true;

    } catch (error) {
      console.error('Error updating user profile:', error);
      const authError = createError(
        'UPDATE_PROFILE_ERROR',
        error instanceof Error ? error.message : 'Failed to update user profile',
        error
      );
      dispatch({ type: 'SET_ERROR', payload: authError });
      return false;
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  // Check if user has specific role
  const hasRole = useCallback((role: string): boolean => {
    return state.user?.role === role;
  }, [state.user]);

  // Check if user's email is verified
  const isEmailVerified = useCallback((): boolean => {
    return state.user?.isEmailVerified || false;
  }, [state.user]);

  // Initialize authentication on mount
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Auto-refresh token periodically (every 10 minutes)
  useEffect(() => {
    if (state.isAuthenticated) {
      const interval = setInterval(() => {
        refreshAuth();
      }, 10 * 60 * 1000); // 10 minutes

      return () => clearInterval(interval);
    }
  }, [state.isAuthenticated, refreshAuth]);

  const contextValue: AuthContextType = {
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    error: state.error,
    login,
    logout,
    refreshAuth,
    updateProfile,
    clearError,
    hasRole,
    isEmailVerified,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use auth context
export function useAuthContext(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;