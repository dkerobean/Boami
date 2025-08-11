"use client";
import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, signOut, useSession } from 'next-auth/react';

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
  role: string;
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
  const router = useRouter();

  // Helper function to create error object
  const createError = (code: string, message: string, details?: any): AuthError => ({
    code,
    message,
    details,
    timestamp: new Date(),
  });

  // Fetch user data using NextAuth session
  const fetchUser = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      console.log('👤 Fetching user data from NextAuth session...');

      // Get session data from NextAuth
      const sessionResponse = await fetch('/api/auth/session');

      if (!sessionResponse.ok) {
        console.log('❌ No session found');
        dispatch({ type: 'SET_USER', payload: null });
        return;
      }

      const session = await sessionResponse.json();

      if (!session?.user) {
        console.log('❌ No user in session');
        dispatch({ type: 'SET_USER', payload: null });
        return;
      }

      console.log('✅ User found in session:', session.user.email);

      // Respect Remember Me
      try {
        const cookies = typeof document !== 'undefined' ? document.cookie : '';
        const hasRememberPersistent = cookies.includes('boami_remember_me=1');
        const hasSessionOnly = cookies.includes('boami_session_only=1');
        if (!hasRememberPersistent && !hasSessionOnly) {
          console.log('🔒 Session present but Remember Me/session cookie missing. Enforcing logout.');
          await signOut({ redirect: false });
          dispatch({ type: 'SET_USER', payload: null });
          return;
        }

        // If session-only, enforce default timeout (24h) from first login
        if (hasSessionOnly) {
          const startMatch = cookies
            .split(';')
            .map(c => c.trim())
            .find(c => c.startsWith('boami_session_start='));
          const startValue = startMatch?.split('=')[1];
          const startMs = startValue ? Number(decodeURIComponent(startValue)) : NaN;
          const defaultTimeoutMs = 24 * 60 * 60 * 1000; // 24 hours
          if (!Number.isFinite(startMs)) {
            // Initialize on first detection
            document.cookie = `boami_session_start=${Date.now()}; Path=/; SameSite=Strict`;
          } else {
            const age = Date.now() - startMs;
            if (age > defaultTimeoutMs) {
              console.log('⏳ Session-only default timeout reached. Logging out.');
              await signOut({ redirect: false });
              dispatch({ type: 'RESET_STATE' });
              return;
            }
          }
        }
      } catch (cookieErr) {
        console.warn('Failed to evaluate Remember Me cookies:', cookieErr);
      }

      // Transform NextAuth session data to match our UserData interface
      const userData: UserData = {
        _id: session.user.id,
        email: session.user.email,
        firstName: session.user.firstName,
        lastName: session.user.lastName,
        role: session.user.role?.name || session.user.role || 'user',
        isActive: true,
        isEmailVerified: session.user.isEmailVerified,
        profileImage: session.user.profileImage,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      dispatch({ type: 'SET_USER', payload: userData });
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

  // Login function using NextAuth
  const login = useCallback(async (credentials: LoginCredentials): Promise<AuthResult> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });

      console.log('🔐 Attempting login with NextAuth...');

      const result = await signIn('credentials', {
        email: credentials.email,
        password: credentials.password,
        redirect: false,
      });

      if (result?.error) {
        console.error('❌ NextAuth login error:', result.error);
        const authError = createError(
          'LOGIN_FAILED',
          'Invalid email or password',
          result.error
        );
        dispatch({ type: 'SET_ERROR', payload: authError });
        return { success: false, message: authError.message };
      }

      if (result?.ok) {
        console.log('✅ NextAuth login successful');
        // Set Remember Me cookies
        try {
          const remember = Boolean(credentials.rememberMe);
          // Clear previous flags
          document.cookie = 'boami_remember_me=; Path=/; Max-Age=0';
          document.cookie = 'boami_session_only=; Path=/; Max-Age=0';
          document.cookie = 'boami_session_start=; Path=/; Max-Age=0';
          if (remember) {
            // Persistent for 30 days
            const maxAgeSeconds = 30 * 24 * 60 * 60;
            document.cookie = `boami_remember_me=1; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Strict`;
          } else {
            // Session-only cookie (no Expires/Max-Age)
            document.cookie = 'boami_session_only=1; Path=/; SameSite=Strict';
            document.cookie = `boami_session_start=${Date.now()}; Path=/; SameSite=Strict`;
          }
        } catch (cookieErr) {
          console.warn('Failed to set Remember Me cookie:', cookieErr);
        }
        // Fetch user data after successful login
        await fetchUser();
        return { success: true, message: 'Login successful' };
      }

      // Fallback error
      const authError = createError(
        'LOGIN_FAILED',
        'Login failed. Please try again.',
        result
      );
      dispatch({ type: 'SET_ERROR', payload: authError });
      return { success: false, message: authError.message };

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

  // Logout function using NextAuth
  const logout = useCallback(async (): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      console.log('🚪 Logging out with NextAuth...');

      // Use NextAuth signOut
      await signOut({
        redirect: false // We'll handle redirect manually
      });

      // Clear state
      dispatch({ type: 'RESET_STATE' });

      // Clear Remember Me cookies
      if (typeof document !== 'undefined') {
        document.cookie = 'boami_remember_me=; Path=/; Max-Age=0';
        document.cookie = 'boami_session_only=; Path=/; Max-Age=0';
        document.cookie = 'boami_session_start=; Path=/; Max-Age=0';
      }

      console.log('✅ Logout successful');

      // Redirect to landing page
      if (typeof window !== 'undefined') {
        router.push('/landingpage');
      }

    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local state even if request fails
      dispatch({ type: 'RESET_STATE' });
      if (typeof window !== 'undefined') {
        router.push('/landingpage');
      }
    }
  }, [router]);

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
    // Development mode bypass when SKIP_AUTH is enabled
    if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_SKIP_AUTH === 'true') {
      const mockUser: UserData = {
        _id: 'dev-user-123',
        email: 'dev@example.com',
        firstName: 'Dev',
        lastName: 'User',
        role: 'user',
        isActive: true,
        isEmailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      dispatch({ type: 'SET_USER', payload: mockUser });
      dispatch({ type: 'SET_LAST_REFRESH', payload: new Date() });
      return;
    }

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