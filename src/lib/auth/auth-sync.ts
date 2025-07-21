/**
 * Authentication State Synchronization
 * Handles multi-tab authentication synchronization using localStorage events
 */

// Event types for authentication synchronization
export type AuthSyncEventType = 'login' | 'logout' | 'refresh' | 'profile_update' | 'session_expired';

// Authentication sync event data
export interface AuthSyncEvent {
  type: AuthSyncEventType;
  timestamp: number;
  userId?: string;
  data?: any;
}

// Storage keys for synchronization
const STORAGE_KEYS = {
  AUTH_SYNC: 'auth_sync_event',
  AUTH_STATE: 'auth_state',
  LAST_ACTIVITY: 'last_activity',
  SESSION_ID: 'session_id',
} as const;

// Configuration for sync behavior
interface AuthSyncConfig {
  enabled: boolean;
  sessionTimeout: number; // milliseconds
  heartbeatInterval: number; // milliseconds
  maxInactivity: number; // milliseconds
  storageType: 'localStorage' | 'sessionStorage';
}

const DEFAULT_CONFIG: AuthSyncConfig = {
  enabled: true,
  sessionTimeout: 30 * 60 * 1000, // 30 minutes
  heartbeatInterval: 60 * 1000, // 1 minute
  maxInactivity: 15 * 60 * 1000, // 15 minutes
  storageType: 'localStorage',
};

/**
 * Authentication State Synchronization Manager
 */
export class AuthSyncManager {
  private static instance: AuthSyncManager;
  private config: AuthSyncConfig;
  private listeners: Map<string, (event: AuthSyncEvent) => void> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private sessionId: string;
  private isInitialized = false;

  private constructor(config: Partial<AuthSyncConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.sessionId = this.generateSessionId();
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: Partial<AuthSyncConfig>): AuthSyncManager {
    if (!AuthSyncManager.instance) {
      AuthSyncManager.instance = new AuthSyncManager(config);
    }
    return AuthSyncManager.instance;
  }

  /**
   * Initialize synchronization
   */
  initialize(): void {
    if (this.isInitialized || !this.config.enabled || typeof window === 'undefined') {
      return;
    }

    // Listen for storage events (cross-tab communication)
    window.addEventListener('storage', this.handleStorageEvent.bind(this));

    // Listen for visibility changes to handle tab focus
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));

    // Listen for beforeunload to clean up
    window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));

    // Start heartbeat
    this.startHeartbeat();

    // Set initial session
    this.updateLastActivity();

    this.isInitialized = true;
    console.log('AuthSyncManager initialized');
  }

  /**
   * Destroy synchronization
   */
  destroy(): void {
    if (!this.isInitialized) return;

    // Remove event listeners
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', this.handleStorageEvent.bind(this));
      document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
      window.removeEventListener('beforeunload', this.handleBeforeUnload.bind(this));
    }

    // Stop heartbeat
    this.stopHeartbeat();

    // Clear listeners
    this.listeners.clear();

    this.isInitialized = false;
    console.log('AuthSyncManager destroyed');
  }

  /**
   * Broadcast authentication event to other tabs
   */
  broadcastEvent(type: AuthSyncEventType, data?: any): void {
    if (!this.config.enabled || typeof window === 'undefined') return;

    const event: AuthSyncEvent = {
      type,
      timestamp: Date.now(),
      userId: data?.userId,
      data,
    };

    try {
      const storage = this.getStorage();
      storage.setItem(STORAGE_KEYS.AUTH_SYNC, JSON.stringify(event));

      // Remove the event after a short delay to trigger storage event
      setTimeout(() => {
        storage.removeItem(STORAGE_KEYS.AUTH_SYNC);
      }, 100);

      console.log('Broadcasted auth event:', type, data);
    } catch (error) {
      console.error('Failed to broadcast auth event:', error);
    }
  }

  /**
   * Add event listener
   */
  addEventListener(id: string, callback: (event: AuthSyncEvent) => void): void {
    this.listeners.set(id, callback);
  }

  /**
   * Remove event listener
   */
  removeEventListener(id: string): void {
    this.listeners.delete(id);
  }

  /**
   * Handle login event
   */
  handleLogin(userId: string, userData?: any): void {
    this.updateLastActivity();
    this.broadcastEvent('login', { userId, userData });
  }

  /**
   * Handle logout event
   */
  handleLogout(userId?: string): void {
    this.clearAuthState();
    this.broadcastEvent('logout', { userId });
  }

  /**
   * Handle token refresh event
   */
  handleTokenRefresh(userId: string): void {
    this.updateLastActivity();
    this.broadcastEvent('refresh', { userId });
  }

  /**
   * Handle profile update event
   */
  handleProfileUpdate(userId: string, userData: any): void {
    this.broadcastEvent('profile_update', { userId, userData });
  }

  /**
   * Handle session expiry
   */
  handleSessionExpired(userId?: string): void {
    this.clearAuthState();
    this.broadcastEvent('session_expired', { userId });
  }

  /**
   * Check if session is active
   */
  isSessionActive(): boolean {
    if (typeof window === 'undefined') return false;

    try {
      const lastActivity = this.getStorage().getItem(STORAGE_KEYS.LAST_ACTIVITY);
      if (!lastActivity) return false;

      const lastActivityTime = parseInt(lastActivity, 10);
      const now = Date.now();
      const timeSinceActivity = now - lastActivityTime;

      return timeSinceActivity < this.config.sessionTimeout;
    } catch (error) {
      console.error('Failed to check session activity:', error);
      return false;
    }
  }

  /**
   * Update last activity timestamp
   */
  updateLastActivity(): void {
    if (typeof window === 'undefined') return;

    try {
      const storage = this.getStorage();
      storage.setItem(STORAGE_KEYS.LAST_ACTIVITY, Date.now().toString());
      storage.setItem(STORAGE_KEYS.SESSION_ID, this.sessionId);
    } catch (error) {
      console.error('Failed to update last activity:', error);
    }
  }

  /**
   * Get current session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Handle storage events (cross-tab communication)
   */
  private handleStorageEvent(event: StorageEvent): void {
    if (event.key !== STORAGE_KEYS.AUTH_SYNC || !event.newValue) {
      return;
    }

    try {
      const authEvent: AuthSyncEvent = JSON.parse(event.newValue);

      // Ignore events from the same tab
      if (authEvent.data?.sessionId === this.sessionId) {
        return;
      }

      console.log('Received auth sync event:', authEvent);

      // Notify listeners
      this.listeners.forEach(callback => {
        try {
          callback(authEvent);
        } catch (error) {
          console.error('Error in auth sync listener:', error);
        }
      });

      // Handle specific events
      this.handleSyncEvent(authEvent);
    } catch (error) {
      console.error('Failed to handle storage event:', error);
    }
  }

  /**
   * Handle specific sync events
   */
  private handleSyncEvent(event: AuthSyncEvent): void {
    switch (event.type) {
      case 'logout':
      case 'session_expired':
        // Force logout in this tab
        this.forceLogout();
        break;

      case 'login':
        // Update activity on login from another tab
        this.updateLastActivity();
        break;

      case 'refresh':
        // Update activity on token refresh
        this.updateLastActivity();
        break;
    }
  }

  /**
   * Handle visibility change (tab focus/blur)
   */
  private handleVisibilityChange(): void {
    if (document.visibilityState === 'visible') {
      // Tab became visible, check session status
      if (!this.isSessionActive()) {
        this.handleSessionExpired();
      } else {
        this.updateLastActivity();
      }
    }
  }

  /**
   * Handle before unload (tab closing)
   */
  private handleBeforeUnload(): void {
    // Clean up session data if this is the last tab
    this.cleanup();
  }

  /**
   * Start heartbeat to monitor session activity
   */
  private startHeartbeat(): void {
    if (this.heartbeatInterval) return;

    this.heartbeatInterval = setInterval(() => {
      if (!this.isSessionActive()) {
        this.handleSessionExpired();
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Force logout in current tab
   */
  private forceLogout(): void {
    // Clear local auth state
    this.clearAuthState();

    // Redirect to login page
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/auth1/login';
    }
  }

  /**
   * Clear authentication state
   */
  private clearAuthState(): void {
    if (typeof window === 'undefined') return;

    try {
      const storage = this.getStorage();
      storage.removeItem(STORAGE_KEYS.AUTH_STATE);
      storage.removeItem(STORAGE_KEYS.LAST_ACTIVITY);

      // Clear cookies
      document.cookie = 'accessToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      document.cookie = 'refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    } catch (error) {
      console.error('Failed to clear auth state:', error);
    }
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get storage instance based on configuration
   */
  private getStorage(): Storage {
    if (typeof window === 'undefined') {
      throw new Error('Storage not available');
    }

    return this.config.storageType === 'sessionStorage'
      ? window.sessionStorage
      : window.localStorage;
  }

  /**
   * Cleanup session data
   */
  private cleanup(): void {
    try {
      const storage = this.getStorage();
      const currentSessionId = storage.getItem(STORAGE_KEYS.SESSION_ID);

      // Only cleanup if this is our session
      if (currentSessionId === this.sessionId) {
        storage.removeItem(STORAGE_KEYS.SESSION_ID);
      }
    } catch (error) {
      console.error('Failed to cleanup session:', error);
    }
  }
}

/**
 * Get auth sync utilities (for use in React components)
 */
export function getAuthSyncUtils(config?: Partial<AuthSyncConfig>) {
  const syncManager = AuthSyncManager.getInstance(config);

  return {
    initialize: () => syncManager.initialize(),
    destroy: () => syncManager.destroy(),
    broadcastLogin: (userId: string, userData?: any) => syncManager.handleLogin(userId, userData),
    broadcastLogout: (userId?: string) => syncManager.handleLogout(userId),
    broadcastRefresh: (userId: string) => syncManager.handleTokenRefresh(userId),
    broadcastProfileUpdate: (userId: string, userData: any) => syncManager.handleProfileUpdate(userId, userData),
    broadcastSessionExpired: (userId?: string) => syncManager.handleSessionExpired(userId),
    addEventListener: (id: string, callback: (event: AuthSyncEvent) => void) => syncManager.addEventListener(id, callback),
    removeEventListener: (id: string) => syncManager.removeEventListener(id),
    isSessionActive: () => syncManager.isSessionActive(),
    updateActivity: () => syncManager.updateLastActivity(),
    getSessionId: () => syncManager.getSessionId(),
  };
}

/**
 * Utility functions for authentication synchronization
 */
export const AuthSyncUtils = {
  /**
   * Check if multiple tabs are open
   */
  hasMultipleTabs(): boolean {
    if (typeof window === 'undefined') return false;

    try {
      const sessionId = localStorage.getItem(STORAGE_KEYS.SESSION_ID);
      const currentSessionId = AuthSyncManager.getInstance().getSessionId();
      return sessionId !== null && sessionId !== currentSessionId;
    } catch (error) {
      return false;
    }
  },

  /**
   * Get last activity timestamp
   */
  getLastActivity(): number | null {
    if (typeof window === 'undefined') return null;

    try {
      const lastActivity = localStorage.getItem(STORAGE_KEYS.LAST_ACTIVITY);
      return lastActivity ? parseInt(lastActivity, 10) : null;
    } catch (error) {
      return null;
    }
  },

  /**
   * Clear all sync data
   */
  clearSyncData(): void {
    if (typeof window === 'undefined') return;

    try {
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
    } catch (error) {
      console.error('Failed to clear sync data:', error);
    }
  },
};

// Export singleton instance for direct use
export const authSyncManager = AuthSyncManager.getInstance();

export default AuthSyncManager;