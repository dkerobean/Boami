import { useState, useEffect, useCallback } from 'react';

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

interface UseAuthState {
  user: UserData | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

interface UseAuthReturn extends UseAuthState {
  refetch: () => Promise<void>;
  updateUser: (userData: Partial<UserData>) => Promise<boolean>;
  clearError: () => void;
}

/**
 * Custom hook for user authentication and profile management
 * Handles user state, loading states, error handling, and profile updates
 * Works with HTTP-only cookies for secure authentication
 */
export const useAuth = (): UseAuthReturn => {
  const [state, setState] = useState<UseAuthState>({
    user: null,
    loading: true,
    error: null,
    isAuthenticated: false,
  });

  const fetchUser = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // Check authentication status first
      const authResponse = await fetch('/api/auth/login', {
        method: 'GET',
        credentials: 'include',
      });

      if (!authResponse.ok) {
        setState({
          user: null,
          loading: false,
          error: null,
          isAuthenticated: false,
        });
        return;
      }

      const authResult = await authResponse.json();
      
      if (!authResult.success || !authResult.authenticated) {
        setState({
          user: null,
          loading: false,
          error: null,
          isAuthenticated: false,
        });
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

      setState({
        user: userResult.data,
        loading: false,
        error: null,
        isAuthenticated: true,
      });

    } catch (error) {
      console.error('Error fetching user data:', error);
      setState({
        user: null,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch user data',
        isAuthenticated: false,
      });
    }
  }, []);

  const updateUser = useCallback(async (userData: Partial<UserData>): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, error: null }));

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
          setState(prev => ({ ...prev, isAuthenticated: false }));
          return false;
        }
        
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
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
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to update user profile',
      }));
      return false;
    }
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Effect to fetch user data on mount
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return {
    ...state,
    refetch: fetchUser,
    updateUser,
    clearError,
  };
};

export default useAuth;