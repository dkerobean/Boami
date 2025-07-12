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
 * Follows security best practices for token management
 */
export class JWTManager {
  private static readonly ACCESS_TOKEN_EXPIRES = '15m';
  private static readonly REFRESH_TOKEN_EXPIRES = '7d';
  private static readonly ACCESS_TOKEN_COOKIE = 'accessToken';
  private static readonly REFRESH_TOKEN_COOKIE = 'refreshToken';

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
    
    // Set access token cookie (15 minutes)
    cookieStore.set(this.ACCESS_TOKEN_COOKIE, accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 15 * 60, // 15 minutes in seconds
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
      maxAge: 15 * 60, // 15 minutes
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
}