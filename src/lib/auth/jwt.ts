import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

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
 * JWT Manager class for handling token operations
 * Enhanced with additional security features and token refresh functionality
 */
export class JWTManager {
  private static readonly ACCESS_TOKEN_EXPIRES = '1d';
  private static readonly REFRESH_TOKEN_EXPIRES = '7d';
  private static readonly ACCESS_TOKEN_COOKIE = 'accessToken';
  private static readonly REFRESH_TOKEN_COOKIE = 'refreshToken';
  private static readonly TOKEN_BLACKLIST_KEY = 'jwt_blacklist';
  private static readonly RATE_LIMIT_KEY = 'jwt_rate_limit';

  // Rate limiting configuration
  private static readonly RATE_LIMIT_MAX_ATTEMPTS = 5;
  private static readonly RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
  private static readonly RATE_LIMIT_BLOCK_DURATION_MS = 30 * 60 * 1000; // 30 minutes

  /**
   * Validates JWT environment variables
   * @throws {Error} If required environment variables are missing
   */
  private static validateEnv(): void {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    if (!process.env.JWT_REFRESH_SECRET) {
      throw new Error('JWT_REFRESH_SECRET environment variable is required');
    }
  }

  /**
   * Generates both access and refresh tokens
   * @param payload - User information to embed in tokens
   * @returns ITokenPair - Object containing both tokens
   */
  static generateTokens(payload: Omit<IJWTPayload, 'iat' | 'exp'>): ITokenPair {
    this.validateEnv();

    const accessToken = jwt.sign(
      payload,
      process.env.JWT_SECRET!,
      {
        expiresIn: this.ACCESS_TOKEN_EXPIRES,
        issuer: 'boami-auth',
        audience: 'boami-app'
      }
    );

    const refreshToken = jwt.sign(
      { userId: payload.userId },
      process.env.JWT_REFRESH_SECRET!,
      {
        expiresIn: this.REFRESH_TOKEN_EXPIRES,
        issuer: 'boami-auth',
        audience: 'boami-app'
      }
    );

    return { accessToken, refreshToken };
  }

  /**
   * Verifies and decodes an access token
   * @param token - JWT token to verify
   * @returns IJWTPayload | null - Decoded payload or null if invalid
   */
  static verifyAccessToken(token: string): IJWTPayload | null {
    try {
      this.validateEnv();
      return jwt.verify(token, process.env.JWT_SECRET!, {
        issuer: 'boami-auth',
        audience: 'boami-app'
      }) as IJWTPayload;
    } catch (error) {
      console.error('Access token verification failed:', error);
      return null;
    }
  }

  /**
   * Verifies and decodes a refresh token
   * @param token - JWT refresh token to verify
   * @returns object | null - Decoded payload or null if invalid
   */
  static verifyRefreshToken(token: string): { userId: string; iat: number; exp: number } | null {
    try {
      this.validateEnv();
      return jwt.verify(token, process.env.JWT_REFRESH_SECRET!, {
        issuer: 'boami-auth',
        audience: 'boami-app'
      }) as { userId: string; iat: number; exp: number };
    } catch (error) {
      console.error('Refresh token verification failed:', error);
      return null;
    }
  }

  /**
   * Sets authentication cookies with secure flags
   * @param accessToken - JWT access token
   * @param refreshToken - JWT refresh token
   */
  static setAuthCookies(accessToken: string, refreshToken: string): void {
    const cookieStore = cookies();
    const isProduction = process.env.NODE_ENV === 'production';

    // Set access token cookie (1 day)
    cookieStore.set(this.ACCESS_TOKEN_COOKIE, accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 24 * 60 * 60, // 1 day in seconds
      path: '/'
    });

    // Set refresh token cookie (7 days)
    cookieStore.set(this.REFRESH_TOKEN_COOKIE, refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
      path: '/'
    });
  }

  /**
   * Sets authentication cookies in a NextResponse
   * @param response - NextResponse instance
   * @param accessToken - JWT access token
   * @param refreshToken - JWT refresh token
   * @returns NextResponse - Modified response with cookies
   */
  static setAuthCookiesInResponse(
    response: NextResponse,
    accessToken: string,
    refreshToken: string
  ): NextResponse {
    const isProduction = process.env.NODE_ENV === 'production';

    // Set access token cookie
    response.cookies.set(this.ACCESS_TOKEN_COOKIE, accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 24 * 60 * 60, // 1 day
      path: '/'
    });

    // Set refresh token cookie
    response.cookies.set(this.REFRESH_TOKEN_COOKIE, refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/'
    });

    return response;
  }

  /**
   * Gets access token from cookies
   * @returns string | null - Access token or null if not found
   */
  static getAccessTokenFromCookies(): string | null {
    try {
      const cookieStore = cookies();
      return cookieStore.get(this.ACCESS_TOKEN_COOKIE)?.value || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Gets refresh token from cookies
   * @returns string | null - Refresh token or null if not found
   */
  static getRefreshTokenFromCookies(): string | null {
    try {
      const cookieStore = cookies();
      return cookieStore.get(this.REFRESH_TOKEN_COOKIE)?.value || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Clears authentication cookies
   */
  static clearAuthCookies(): void {
    const cookieStore = cookies();

    cookieStore.set(this.ACCESS_TOKEN_COOKIE, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/'
    });

    cookieStore.set(this.REFRESH_TOKEN_COOKIE, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/'
    });
  }

  /**
   * Clears authentication cookies in a NextResponse
   * @param response - NextResponse instance
   * @returns NextResponse - Modified response with cleared cookies
   */
  static clearAuthCookiesInResponse(response: NextResponse): NextResponse {
    response.cookies.set(this.ACCESS_TOKEN_COOKIE, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/'
    });

    response.cookies.set(this.REFRESH_TOKEN_COOKIE, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/'
    });

    return response;
  }

  /**
   * Extracts user information from current request cookies
   * @returns IJWTPayload | null - User info or null if not authenticated
   */
  static getCurrentUser(): IJWTPayload | null {
    const accessToken = this.getAccessTokenFromCookies();
    if (!accessToken) {
      return null;
    }
    return this.verifyAccessToken(accessToken);
  }

  /**
   * Checks if current user is authenticated
   * @returns boolean - Whether user is authenticated
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
      const payload = this.verifyAccessToken(token);
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
      const payload = this.verifyAccessToken(token);
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
   * Refresh access token using refresh token
   * @param refreshToken - Valid refresh token
   * @returns ITokenPair | null - New token pair or null if refresh failed
   */
  static async refreshTokens(refreshToken: string): Promise<ITokenPair | null> {
    try {
      const refreshPayload = this.verifyRefreshToken(refreshToken);
      if (!refreshPayload) {
        console.error('Invalid refresh token');
        return null;
      }

      // Check if refresh token is blacklisted
      if (this.isTokenBlacklisted(refreshToken)) {
        console.error('Refresh token is blacklisted');
        return null;
      }

      // Here you would typically fetch user data from database
      // For now, we'll create a minimal payload
      const userPayload = {
        userId: refreshPayload.userId,
        email: '', // Would be fetched from database
        role: 'user', // Would be fetched from database
        isEmailVerified: true, // Would be fetched from database
      };

      // Generate new token pair
      const newTokens = this.generateTokens(userPayload);

      // Blacklist the old refresh token
      this.blacklistToken(refreshToken);

      return newTokens;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return null;
    }
  }

  /**
   * Blacklist a token (for logout or security purposes)
   * @param token - Token to blacklist
   */
  static blacklistToken(token: string): void {
    try {
      // In a real implementation, this would be stored in Redis or database
      // For now, we'll use a simple in-memory approach (not suitable for production)
      if (typeof window !== 'undefined') {
        const blacklist = JSON.parse(localStorage.getItem(this.TOKEN_BLACKLIST_KEY) || '[]');
        blacklist.push({
          token: token.substring(0, 20), // Store only part of token for security
          timestamp: Date.now(),
        });

        // Keep only recent entries (last 24 hours)
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        const filteredBlacklist = blacklist.filter((entry: any) => entry.timestamp > oneDayAgo);

        localStorage.setItem(this.TOKEN_BLACKLIST_KEY, JSON.stringify(filteredBlacklist));
      }
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
    try {
      if (typeof window !== 'undefined') {
        const blacklist = JSON.parse(localStorage.getItem(this.TOKEN_BLACKLIST_KEY) || '[]');
        const tokenPrefix = token.substring(0, 20);
        return blacklist.some((entry: any) => entry.token === tokenPrefix);
      }
      return false;
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
    try {
      if (typeof window !== 'undefined') {
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
      }
      return true; // Allow if localStorage not available
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
    try {
      if (typeof window !== 'undefined') {
        const rateLimitData = JSON.parse(localStorage.getItem(this.RATE_LIMIT_KEY) || '{}');
        delete rateLimitData[identifier];
        localStorage.setItem(this.RATE_LIMIT_KEY, JSON.stringify(rateLimitData));
      }
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
        atob(part.replace(/-/g, '+').replace(/_/g, '/'));
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
      const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(decoded);
    } catch (error) {
      console.error('Failed to extract payload:', error);
      return null;
    }
  }

  /**
   * Clean up expired tokens and rate limit data
   */
  static cleanup(): void {
    try {
      if (typeof window !== 'undefined') {
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
      }
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }
}
/**

 * Simple JWT verification function for API routes
 * @param token - JWT token to verify
 * @returns IJWTPayload | null - Decoded payload or null if invalid
 */
export function verifyJWT(token: string): IJWTPayload | null {
  return JWTManager.verifyAccessToken(token);
}

