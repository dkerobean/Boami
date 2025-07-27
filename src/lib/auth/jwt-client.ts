import jwt from 'jsonwebtoken';

/**
 * JWT token payload interface
 * Contains user information embedded in the token
 */
export interface IJWTPayload {
  userId: string;
  email: string;
  role: string;
  isEmailVerified: boolean;
  iat: number;
  exp: number;
}

/**
 * JWT token pair interface
 * Contains both access and refresh tokens
 */
export interface ITokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Client-side JWT Manager class for browser-compatible token operations
 * This version doesn't use Next.js server-only APIs like cookies()
 */
export class JWTClientManager {
  private static readonly ACCESS_TOKEN_KEY = 'accessToken';
  private static readonly REFRESH_TOKEN_KEY = 'refreshToken';
  private static readonly TOKEN_BLACKLIST_KEY = 'jwt_blacklist';
  private static readonly RATE_LIMIT_KEY = 'jwt_rate_limit';

  // Rate limiting configuration
  private static readonly RATE_LIMIT_MAX_ATTEMPTS = 5;
  private static readonly RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
  private static readonly RATE_LIMIT_BLOCK_DURATION_MS = 30 * 60 * 1000; // 30 minutes

  /**
   * Validates JWT environment variables for client-side operations
   * Note: In client-side code, we can't access server environment variables
   */
  private static isClientSide(): boolean {
    return typeof window !== 'undefined';
  }

  /**
   * Verifies and decodes an access token (client-side version)
   * Note: This doesn't verify signature since we don't have access to server secrets
   * For security, actual verification should happen server-side
   * @param token - JWT token to decode
   * @returns IJWTPayload | null - Decoded payload or null if invalid
   */
  static verifyAccessTokenUnsafe(token: string): IJWTPayload | null {
    try {
      // This is unsafe verification - only decodes without signature check
      // Real verification should happen on the server side
      const decoded = jwt.decode(token) as IJWTPayload;
      
      if (!decoded || typeof decoded !== 'object') {
        return null;
      }

      // Check if token is expired
      const currentTime = Math.floor(Date.now() / 1000);
      if (decoded.exp && decoded.exp < currentTime) {
        return null;
      }

      return decoded;
    } catch (error) {
      console.error('Token decoding failed:', error);
      return null;
    }
  }

  /**
   * Gets access token from localStorage (client-side storage)
   * @returns string | null - Access token or null if not found
   */
  static getAccessToken(): string | null {
    if (!this.isClientSide()) {
      return null;
    }
    
    try {
      return localStorage.getItem(this.ACCESS_TOKEN_KEY);
    } catch (error) {
      console.error('Failed to get access token from localStorage:', error);
      return null;
    }
  }

  /**
   * Gets refresh token from localStorage
   * @returns string | null - Refresh token or null if not found
   */
  static getRefreshToken(): string | null {
    if (!this.isClientSide()) {
      return null;
    }
    
    try {
      return localStorage.getItem(this.REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error('Failed to get refresh token from localStorage:', error);
      return null;
    }
  }

  /**
   * Sets tokens in localStorage
   * @param accessToken - JWT access token
   * @param refreshToken - JWT refresh token
   */
  static setTokens(accessToken: string, refreshToken: string): void {
    if (!this.isClientSide()) {
      return;
    }

    try {
      localStorage.setItem(this.ACCESS_TOKEN_KEY, accessToken);
      localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
    } catch (error) {
      console.error('Failed to set tokens in localStorage:', error);
    }
  }

  /**
   * Clears tokens from localStorage
   */
  static clearTokens(): void {
    if (!this.isClientSide()) {
      return;
    }

    try {
      localStorage.removeItem(this.ACCESS_TOKEN_KEY);
      localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error('Failed to clear tokens from localStorage:', error);
    }
  }

  /**
   * Extracts user information from stored access token
   * @returns IJWTPayload | null - User info or null if not authenticated
   */
  static getCurrentUser(): IJWTPayload | null {
    const accessToken = this.getAccessToken();
    if (!accessToken) {
      return null;
    }
    return this.verifyAccessTokenUnsafe(accessToken);
  }

  /**
   * Checks if current user is authenticated (has valid non-expired token)
   * @returns boolean - Whether user appears to be authenticated
   */
  static isAuthenticated(): boolean {
    return this.getCurrentUser() !== null;
  }

  /**
   * Checks if current user has required role
   * @param requiredRole - Role to check for
   * @returns boolean - Whether user has the required role
   */
  static hasRole(requiredRole: string): boolean {
    const user = this.getCurrentUser();
    return user ? user.role === requiredRole : false;
  }

  /**
   * Checks if current user has email verified
   * @returns boolean - Whether user's email is verified
   */
  static isEmailVerified(): boolean {
    const user = this.getCurrentUser();
    return user ? user.isEmailVerified : false;
  }

  /**
   * Check if token is expired
   * @param token - JWT token to check
   * @returns boolean - Whether token is expired
   */
  static isTokenExpired(token: string): boolean {
    try {
      const payload = this.verifyAccessTokenUnsafe(token);
      if (!payload) return true;

      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp < currentTime;
    } catch (error) {
      return true;
    }
  }

  /**
   * Get token expiry time
   * @param token - JWT token
   * @returns Date | null - Expiry date or null if invalid
   */
  static getTokenExpiry(token: string): Date | null {
    try {
      const payload = this.verifyAccessTokenUnsafe(token);
      if (!payload) return null;
      return new Date(payload.exp * 1000);
    } catch (error) {
      return null;
    }
  }

  /**
   * Get time until token expires in milliseconds
   * @param token - JWT token
   * @returns number - Milliseconds until expiry, 0 if expired or invalid
   */
  static getTimeUntilExpiry(token: string): number {
    const expiry = this.getTokenExpiry(token);
    if (!expiry) return 0;
    return Math.max(0, expiry.getTime() - Date.now());
  }

  /**
   * Blacklist a token (for logout or security purposes)
   * @param token - Token to blacklist
   */
  static blacklistToken(token: string): void {
    if (!this.isClientSide()) {
      return;
    }

    try {
      const blacklist = JSON.parse(localStorage.getItem(this.TOKEN_BLACKLIST_KEY) || '[]');
      blacklist.push({
        token: token.substring(0, 20), // Store only part of token for security
        timestamp: Date.now(),
      });

      // Keep only recent entries (last 24 hours)
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      const filteredBlacklist = blacklist.filter((entry: any) => entry.timestamp > oneDayAgo);

      localStorage.setItem(this.TOKEN_BLACKLIST_KEY, JSON.stringify(filteredBlacklist));
    } catch (error) {
      console.error('Failed to blacklist token:', error);
    }
  }

  /**
   * Check if token is blacklisted
   * @param token - Token to check
   * @returns boolean - Whether token is blacklisted
   */
  static isTokenBlacklisted(token: string): boolean {
    if (!this.isClientSide()) {
      return false;
    }

    try {
      const blacklist = JSON.parse(localStorage.getItem(this.TOKEN_BLACKLIST_KEY) || '[]');
      const tokenPrefix = token.substring(0, 20);
      return blacklist.some((entry: any) => entry.token === tokenPrefix);
    } catch (error) {
      console.error('Failed to check token blacklist:', error);
      return false;
    }
  }

  /**
   * Rate limiting for token operations
   * @param identifier - Unique identifier (e.g., IP address, user ID)
   * @returns boolean - Whether operation is allowed
   */
  static checkRateLimit(identifier: string): boolean {
    if (!this.isClientSide()) {
      return true;
    }

    try {
      const rateLimitData = JSON.parse(localStorage.getItem(this.RATE_LIMIT_KEY) || '{}');
      const now = Date.now();
      const userLimit = rateLimitData[identifier];

      if (!userLimit) {
        // First attempt
        rateLimitData[identifier] = {
          attempts: 1,
          firstAttempt: now,
          blockedUntil: null,
        };
        localStorage.setItem(this.RATE_LIMIT_KEY, JSON.stringify(rateLimitData));
        return true;
      }

      // Check if user is currently blocked
      if (userLimit.blockedUntil && now < userLimit.blockedUntil) {
        return false;
      }

      // Reset if window has passed
      if (now - userLimit.firstAttempt > this.RATE_LIMIT_WINDOW_MS) {
        rateLimitData[identifier] = {
          attempts: 1,
          firstAttempt: now,
          blockedUntil: null,
        };
        localStorage.setItem(this.RATE_LIMIT_KEY, JSON.stringify(rateLimitData));
        return true;
      }

      // Increment attempts
      userLimit.attempts += 1;

      // Block if exceeded max attempts
      if (userLimit.attempts > this.RATE_LIMIT_MAX_ATTEMPTS) {
        userLimit.blockedUntil = now + this.RATE_LIMIT_BLOCK_DURATION_MS;
        localStorage.setItem(this.RATE_LIMIT_KEY, JSON.stringify(rateLimitData));
        return false;
      }

      localStorage.setItem(this.RATE_LIMIT_KEY, JSON.stringify(rateLimitData));
      return true;
    } catch (error) {
      console.error('Rate limit check failed:', error);
      return true; // Allow on error to prevent blocking legitimate users
    }
  }

  /**
   * Clear rate limit for identifier
   * @param identifier - Unique identifier to clear
   */
  static clearRateLimit(identifier: string): void {
    if (!this.isClientSide()) {
      return;
    }

    try {
      const rateLimitData = JSON.parse(localStorage.getItem(this.RATE_LIMIT_KEY) || '{}');
      delete rateLimitData[identifier];
      localStorage.setItem(this.RATE_LIMIT_KEY, JSON.stringify(rateLimitData));
    } catch (error) {
      console.error('Failed to clear rate limit:', error);
    }
  }

  /**
   * Validate token format and structure
   * @param token - Token to validate
   * @returns boolean - Whether token has valid format
   */
  static isValidTokenFormat(token: string): boolean {
    if (!token || typeof token !== 'string') {
      return false;
    }

    // JWT should have 3 parts separated by dots
    const parts = token.split('.');
    if (parts.length !== 3) {
      return false;
    }

    // Each part should be base64 encoded
    try {
      parts.forEach(part => {
        if (!part) throw new Error('Empty part');
        if (this.isClientSide()) {
          atob(part.replace(/-/g, '+').replace(/_/g, '/'));
        }
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Extract token payload without verification (for debugging)
   * @param token - JWT token
   * @returns any - Decoded payload or null
   */
  static extractPayloadUnsafe(token: string): any {
    try {
      if (!this.isValidTokenFormat(token)) {
        return null;
      }

      const payload = token.split('.')[1];
      if (this.isClientSide()) {
        const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
        return JSON.parse(decoded);
      }
      return null;
    } catch (error) {
      console.error('Failed to extract payload:', error);
      return null;
    }
  }

  /**
   * Clean up expired tokens and rate limit data
   */
  static cleanup(): void {
    if (!this.isClientSide()) {
      return;
    }

    try {
      // Clean up blacklist
      const blacklist = JSON.parse(localStorage.getItem(this.TOKEN_BLACKLIST_KEY) || '[]');
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      const filteredBlacklist = blacklist.filter((entry: any) => entry.timestamp > oneDayAgo);
      localStorage.setItem(this.TOKEN_BLACKLIST_KEY, JSON.stringify(filteredBlacklist));

      // Clean up rate limit data
      const rateLimitData = JSON.parse(localStorage.getItem(this.RATE_LIMIT_KEY) || '{}');
      const now = Date.now();
      const cleanedRateLimit: any = {};

      Object.keys(rateLimitData).forEach(key => {
        const data = rateLimitData[key];
        // Keep if not expired and not old
        if (
          (!data.blockedUntil || now < data.blockedUntil) &&
          (now - data.firstAttempt < this.RATE_LIMIT_WINDOW_MS * 2)
        ) {
          cleanedRateLimit[key] = data;
        }
      });

      localStorage.setItem(this.RATE_LIMIT_KEY, JSON.stringify(cleanedRateLimit));
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }

  /**
   * Make an authenticated API request with automatic token handling
   * @param url - API endpoint URL
   * @param options - Fetch options
   * @returns Promise<Response> - Fetch response
   */
  static async authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const token = this.getAccessToken();
    
    const headers = new Headers(options.headers);
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    return fetch(url, {
      ...options,
      headers,
    });
  }
}

/**
 * Simple client-side JWT verification function
 * Note: This only decodes, doesn't verify signature
 * @param token - JWT token to decode
 * @returns IJWTPayload | null - Decoded payload or null if invalid
 */
export function verifyJWTClient(token: string): IJWTPayload | null {
  return JWTClientManager.verifyAccessTokenUnsafe(token);
}