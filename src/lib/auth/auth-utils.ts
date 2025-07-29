/**
 * Authentication Utilities
 * Helper functions for route validation, redirect handling, and authentication state management
 */

// Route configuration types
interface RouteConfig {
  path: string;
  protected: boolean;
  requiresEmailVerification?: boolean;
  requiredRole?: string;
  redirectTo?: string;
}

interface RedirectValidationConfig {
  maxRedirectLength: number;
  allowedPatterns: string[];
  blockedPatterns: string[];
}

// Default configuration
const DEFAULT_REDIRECT_CONFIG: RedirectValidationConfig = {
  maxRedirectLength: 200,
  allowedPatterns: [
    '/dashboards',
    '/apps',
    '/charts',
    '/forms',
    '/tables',
    '/react-tables',
    '/ui-components',
    '/widgets',
    '/finance',
    '/layout',
    '/sample-page',
    '/theme-pages',
    '/icons',
    '/test-loading',
  ],
  blockedPatterns: [
    'javascript:',
    'data:',
    'vbscript:',
    'file:',
    'ftp:',
    'mailto:',
    'tel:',
  ],
};

/**
 * Route validation utilities
 */
export class RouteValidator {
  private static protectedRoutes = [
    '/dashboards',
    '/apps',
    '/charts',
    '/forms',
    '/tables',
    '/react-tables',
    '/ui-components',
    '/widgets',
    '/finance',
    '/layout',
    '/sample-page',
    '/theme-pages',
    '/icons',
    '/test-loading',
  ];

  private static publicRoutes = [
    '/',
    '/landingpage',
    '/frontend-pages/about',
    '/frontend-pages/contact',
    '/frontend-pages/blog',
    '/frontend-pages/portfolio',
    '/frontend-pages/pricing',
    '/frontend-pages/homepage',
  ];

  private static authRoutes = [
    '/auth/auth1/login',
    '/auth/auth1/register',
    '/auth/auth1/verify-email',
    '/auth/auth1/forgot-password',
    '/auth/auth1/reset-password',
    '/auth/auth2',
  ];

  /**
   * Check if a path matches any of the given route patterns
   */
  static matchesRoute(pathname: string, routes: string[]): boolean {
    return routes.some(route => pathname.startsWith(route));
  }

  /**
   * Check if a route is protected
   */
  static isProtectedRoute(pathname: string): boolean {
    return this.matchesRoute(pathname, this.protectedRoutes);
  }

  /**
   * Check if a route is public
   */
  static isPublicRoute(pathname: string): boolean {
    return this.matchesRoute(pathname, this.publicRoutes);
  }

  /**
   * Check if is an auth route
   */
  static isAuthRoute(pathname: string): boolean {
    return this.matchesRoute(pathname, this.authRoutes);
  }

  /**
   * Get route type
   */
  static getRouteType(pathname: string): 'protected' | 'public' | 'auth' | 'unknown' {
    if (this.isProtectedRoute(pathname)) return 'protected';
    if (this.isPublicRoute(pathname)) return 'public';
    if (this.isAuthRoute(pathname)) return 'auth';
    return 'unknown';
  }

  /**
   * Add custom protected routes
   */
  static addProtectedRoutes(routes: string[]): void {
    this.protectedRoutes.push(...routes);
  }

  /**
   * Add custom public routes
   */
  static addPublicRoutes(routes: string[]): void {
    this.publicRoutes.push(...routes);
  }
}

/**
 * Redirect URL validation and sanitization
 */
export class RedirectValidator {
  private static config: RedirectValidationConfig = DEFAULT_REDIRECT_CONFIG;

  /**
   * Update redirect validation configuration
   */
  static updateConfig(config: Partial<RedirectValidationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Validate redirect URL to prevent malicious redirects
   */
  static isValidRedirect(redirectUrl: string): boolean {
    try {
      // Check if URL is provided
      if (!redirectUrl || typeof redirectUrl !== 'string') {
        return false;
      }

      // Check length
      if (redirectUrl.length > this.config.maxRedirectLength) {
        console.warn('Redirect URL too long:', redirectUrl.length);
        return false;
      }

      // Check for blocked patterns
      const lowerUrl = redirectUrl.toLowerCase();
      if (this.config.blockedPatterns.some(pattern => lowerUrl.startsWith(pattern))) {
        console.warn('Redirect URL contains blocked pattern:', redirectUrl);
        return false;
      }

      // Must be a relative URL (no protocol)
      if (redirectUrl.startsWith('http://') || redirectUrl.startsWith('https://')) {
        console.warn('Redirect URL must be relative:', redirectUrl);
        return false;
      }

      // Must start with /
      if (!redirectUrl.startsWith('/')) {
        console.warn('Redirect URL must start with /:', redirectUrl);
        return false;
      }

      // Must match allowed patterns (protected routes)
      if (!this.config.allowedPatterns.some(pattern => redirectUrl.startsWith(pattern))) {
        console.warn('Redirect URL not in allowed patterns:', redirectUrl);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Redirect validation error:', error);
      return false;
    }
  }

  /**
   * Sanitize redirect URL
   */
  static sanitizeRedirect(redirectUrl: string): string | null {
    if (!this.isValidRedirect(redirectUrl)) {
      return null;
    }

    // Remove any query parameters that might be dangerous
    try {
      const url = new URL(redirectUrl, 'http://localhost');
      const sanitizedPath = url.pathname;

      // Additional sanitization
      return sanitizedPath
        .replace(/\/+/g, '/') // Remove multiple slashes
        .replace(/\.\./g, '') // Remove parent directory references
        .replace(/[<>'"]/g, ''); // Remove potentially dangerous characters
    } catch (error) {
      console.error('Error sanitizing redirect URL:', error);
      return null;
    }
  }

  /**
   * Get default redirect URL for authenticated users
   */
  static getDefaultRedirect(): string {
    return '/dashboards/ecommerce';
  }

  /**
   * Get login URL with redirect parameter
   */
  static getLoginUrl(redirectTo?: string): string {
    const loginUrl = new URL('/auth/auth1/login', window.location.origin);

    if (redirectTo && this.isValidRedirect(redirectTo)) {
      loginUrl.searchParams.set('redirect', redirectTo);
    }

    return loginUrl.toString();
  }
}

/**
 * Authentication state checking utilities
 */
export class AuthStateChecker {
  /**
   * Check if user has required role
   */
  static hasRole(userRole: string | undefined, requiredRole: string): boolean {
    if (!userRole || !requiredRole) {
      return false;
    }
    return userRole === requiredRole;
  }

  /**
   * Check if user has any of the required roles
   */
  static hasAnyRole(userRole: string | undefined, requiredRoles: string[]): boolean {
    if (!userRole || !requiredRoles.length) {
      return false;
    }
    return requiredRoles.includes(userRole);
  }

  /**
   * Check if user's email is verified
   */
  static isEmailVerified(isEmailVerified: boolean | undefined): boolean {
    return Boolean(isEmailVerified);
  }

  /**
   * Check if user account is active
   */
  static isAccountActive(isActive: boolean | undefined): boolean {
    return Boolean(isActive);
  }

  /**
   * Check if user can access a route based on requirements
   */
  static canAccessRoute(
    user: {
      role?: string;
      isEmailVerified?: boolean;
      isActive?: boolean;
    } | null,
    requirements: {
      requiredRole?: string;
      requireEmailVerification?: boolean;
      requireActiveAccount?: boolean;
    }
  ): { canAccess: boolean; reason?: string } {
    if (!user) {
      return { canAccess: false, reason: 'User not authenticated' };
    }

    if (requirements.requireActiveAccount && !this.isAccountActive(user.isActive)) {
      return { canAccess: false, reason: 'Account is not active' };
    }

    if (requirements.requireEmailVerification && !this.isEmailVerified(user.isEmailVerified)) {
      return { canAccess: false, reason: 'Email verification required' };
    }

    if (requirements.requiredRole && !this.hasRole(user.role, requirements.requiredRole)) {
      return { canAccess: false, reason: `Required role: ${requirements.requiredRole}` };
    }

    return { canAccess: true };
  }
}

/**
 * Role-based access control helpers
 */
export class RoleBasedAccessControl {
  private static roleHierarchy: Record<string, number> = {
    'user': 1,
    'moderator': 2,
    'admin': 3,
  };

  /**
   * Update role hierarchy
   */
  static updateRoleHierarchy(hierarchy: Record<string, number>): void {
    this.roleHierarchy = { ...this.roleHierarchy, ...hierarchy };
  }

  /**
   * Check if user role has sufficient level
   */
  static hasMinimumRole(userRole: string | undefined, minimumRole: string): boolean {
    if (!userRole || !minimumRole) {
      return false;
    }

    const userLevel = this.roleHierarchy[userRole] || 0;
    const minimumLevel = this.roleHierarchy[minimumRole] || 0;

    return userLevel >= minimumLevel;
  }

  /**
   * Get user role level
   */
  static getRoleLevel(role: string | undefined): number {
    if (!role) return 0;
    return this.roleHierarchy[role] || 0;
  }

  /**
   * Check if user can perform action
   */
  static canPerformAction(
    userRole: string | undefined,
    action: string,
    permissions: Record<string, string[]>
  ): boolean {
    if (!userRole || !permissions[action]) {
      return false;
    }

    return permissions[action].includes(userRole);
  }
}

/**
 * Authentication event utilities
 */
export class AuthEventUtils {
  /**
   * Create authentication event data
   */
  static createAuthEvent(
    type: 'login' | 'logout' | 'refresh' | 'error',
    data?: Record<string, any>
  ) {
    return {
      type,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      ...data,
    };
  }

  /**
   * Log authentication event
   */
  static logAuthEvent(
    type: 'login' | 'logout' | 'refresh' | 'error',
    data?: Record<string, any>
  ): void {
    const event = this.createAuthEvent(type, data);
    console.log('Auth Event:', event);

    // In production, send to analytics/monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Example: analytics.track('auth_event', event);
    }
  }
}

/**
 * Token utilities
 */
export class TokenUtils {
  /**
   * Check if token is expired
   */
  static isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp < currentTime;
    } catch (error) {
      console.error('Error checking token expiry:', error);
      return true;
    }
  }

  /**
   * Get token expiry time
   */
  static getTokenExpiry(token: string): Date | null {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return new Date(payload.exp * 1000);
    } catch (error) {
      console.error('Error getting token expiry:', error);
      return null;
    }
  }

  /**
   * Get time until token expires
   */
  static getTimeUntilExpiry(token: string): number {
    const expiry = this.getTokenExpiry(token);
    if (!expiry) return 0;
    return Math.max(0, expiry.getTime() - Date.now());
  }
}

/**
 * Storage utilities for authentication
 */
export class AuthStorageUtils {
  /**
   * Clear all authentication data from storage
   */
  static clearAuthStorage(): void {
    // Clear localStorage
    const authKeys = ['user', 'token', 'refreshToken', 'authState'];
    authKeys.forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });

    // Clear cookies (client-side)
    document.cookie = 'accessToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  }

  /**
   * Check if authentication data exists in storage
   */
  static hasAuthData(): boolean {
    return !!(
      localStorage.getItem('user') ||
      sessionStorage.getItem('user') ||
      document.cookie.includes('accessToken')
    );
  }
}

// Export all utilities as a single object for convenience
export const AuthUtils = {
  RouteValidator,
  RedirectValidator,
  AuthStateChecker,
  RoleBasedAccessControl,
  AuthEventUtils,
  TokenUtils,
  AuthStorageUtils,
};

export default AuthUtils;