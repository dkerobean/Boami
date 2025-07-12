import { NextRequest } from 'next/server';

/**
 * Rate limiting configuration interface
 */
interface IRateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests allowed in the window
  message: string; // Error message when limit is exceeded
  skipSuccessful?: boolean; // Whether to skip counting successful requests
}

/**
 * Rate limit store interface for tracking requests
 */
interface IRateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

/**
 * Rate limit result interface
 */
export interface IRateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter: number;
  message?: string;
}

/**
 * Rate Limiter class for API endpoint protection
 * Implements sliding window rate limiting with IP-based tracking
 */
export class RateLimiter {
  private static store: IRateLimitStore = {};
  
  // Predefined rate limit configurations
  private static readonly configs: Record<string, IRateLimitConfig> = {
    // Authentication endpoints - strict limits
    register: {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 3, // 3 registrations per hour per IP
      message: 'Too many registration attempts. Please try again in an hour.'
    },
    
    login: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 5, // 5 login attempts per 15 minutes per IP
      message: 'Too many login attempts. Please try again in 15 minutes.'
    },
    
    verifyEmail: {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 3, // 3 verification attempts per hour per IP
      message: 'Too many verification attempts. Please try again in an hour.'
    },
    
    forgotPassword: {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 3, // 3 password reset requests per hour per IP
      message: 'Too many password reset requests. Please try again in an hour.'
    },
    
    resetPassword: {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 3, // 3 password reset attempts per hour per IP
      message: 'Too many password reset attempts. Please try again in an hour.'
    },
    
    // General API endpoints - more lenient
    general: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100, // 100 requests per 15 minutes per IP
      message: 'Too many requests. Please try again later.'
    },
    
    // Email sending - very strict to prevent spam
    sendEmail: {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 5, // 5 emails per hour per IP
      message: 'Too many email requests. Please try again in an hour.'
    }
  };

  /**
   * Gets the client IP address from the request
   * @param request - Next.js request object
   * @returns string - Client IP address
   */
  private static getClientIP(request: NextRequest): string {
    // Try multiple headers for IP address (in order of preference)
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    const cfConnectingIP = request.headers.get('cf-connecting-ip');
    
    if (forwardedFor) {
      // x-forwarded-for can contain multiple IPs, get the first one
      return forwardedFor.split(',')[0].trim();
    }
    
    if (realIP) {
      return realIP;
    }
    
    if (cfConnectingIP) {
      return cfConnectingIP;
    }
    
    // Fallback to a default IP for development
    return '127.0.0.1';
  }

  /**
   * Generates a unique key for rate limiting
   * @param ip - Client IP address
   * @param endpoint - Endpoint identifier
   * @param userId - Optional user ID for user-specific limits
   * @returns string - Unique key for tracking
   */
  private static generateKey(ip: string, endpoint: string, userId?: string): string {
    if (userId) {
      return `${endpoint}:${userId}:${ip}`;
    }
    return `${endpoint}:${ip}`;
  }

  /**
   * Cleans up expired entries from the store
   */
  private static cleanupExpiredEntries(): void {
    const now = Date.now();
    
    for (const key in this.store) {
      if (this.store[key].resetTime <= now) {
        delete this.store[key];
      }
    }
  }

  /**
   * Checks if a request should be rate limited
   * @param request - Next.js request object
   * @param endpoint - Endpoint identifier (must match config keys)
   * @param userId - Optional user ID for user-specific limits
   * @returns IRateLimitResult - Rate limiting result
   */
  static checkRateLimit(
    request: NextRequest,
    endpoint: string,
    userId?: string
  ): IRateLimitResult {
    // Clean up expired entries periodically
    this.cleanupExpiredEntries();
    
    const config = this.configs[endpoint] || this.configs.general;
    const ip = this.getClientIP(request);
    const key = this.generateKey(ip, endpoint, userId);
    const now = Date.now();
    const windowStart = now - config.windowMs;
    
    // Get or create entry for this key
    let entry = this.store[key];
    
    if (!entry || entry.resetTime <= now) {
      // Create new entry or reset expired entry
      entry = {
        count: 0,
        resetTime: now + config.windowMs
      };
      this.store[key] = entry;
    }
    
    // Check if limit is exceeded
    if (entry.count >= config.maxRequests) {
      return {
        success: false,
        limit: config.maxRequests,
        remaining: 0,
        resetTime: entry.resetTime,
        retryAfter: Math.ceil((entry.resetTime - now) / 1000),
        message: config.message
      };
    }
    
    // Increment counter
    entry.count++;
    
    return {
      success: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - entry.count,
      resetTime: entry.resetTime,
      retryAfter: 0
    };
  }

  /**
   * Middleware function for Express.js style rate limiting
   * @param endpoint - Endpoint identifier
   * @param userId - Optional user ID
   * @returns Function - Middleware function
   */
  static createMiddleware(endpoint: string, userId?: string) {
    return (request: NextRequest) => {
      return this.checkRateLimit(request, endpoint, userId);
    };
  }

  /**
   * Resets rate limit for a specific key
   * @param request - Next.js request object
   * @param endpoint - Endpoint identifier
   * @param userId - Optional user ID
   */
  static resetRateLimit(request: NextRequest, endpoint: string, userId?: string): void {
    const ip = this.getClientIP(request);
    const key = this.generateKey(ip, endpoint, userId);
    delete this.store[key];
  }

  /**
   * Gets current rate limit status without incrementing
   * @param request - Next.js request object
   * @param endpoint - Endpoint identifier
   * @param userId - Optional user ID
   * @returns IRateLimitResult - Current status
   */
  static getRateLimitStatus(
    request: NextRequest,
    endpoint: string,
    userId?: string
  ): IRateLimitResult {
    const config = this.configs[endpoint] || this.configs.general;
    const ip = this.getClientIP(request);
    const key = this.generateKey(ip, endpoint, userId);
    const now = Date.now();
    
    const entry = this.store[key];
    
    if (!entry || entry.resetTime <= now) {
      return {
        success: true,
        limit: config.maxRequests,
        remaining: config.maxRequests,
        resetTime: now + config.windowMs,
        retryAfter: 0
      };
    }
    
    const remaining = Math.max(0, config.maxRequests - entry.count);
    
    return {
      success: remaining > 0,
      limit: config.maxRequests,
      remaining,
      resetTime: entry.resetTime,
      retryAfter: remaining === 0 ? Math.ceil((entry.resetTime - now) / 1000) : 0,
      message: remaining === 0 ? config.message : undefined
    };
  }

  /**
   * Adds a custom rate limit configuration
   * @param endpoint - Endpoint identifier
   * @param config - Rate limit configuration
   */
  static addConfig(endpoint: string, config: IRateLimitConfig): void {
    this.configs[endpoint] = config;
  }

  /**
   * Gets all current rate limit entries for debugging
   * @returns IRateLimitStore - Current store state
   */
  static getStoreSnapshot(): IRateLimitStore {
    return { ...this.store };
  }

  /**
   * Clears all rate limit entries
   */
  static clearStore(): void {
    this.store = {};
  }

  /**
   * Gets statistics about rate limiting
   * @returns object - Rate limiting statistics
   */
  static getStatistics(): {
    totalEntries: number;
    activeEntries: number;
    expiredEntries: number;
  } {
    const now = Date.now();
    let activeEntries = 0;
    let expiredEntries = 0;
    
    for (const key in this.store) {
      if (this.store[key].resetTime > now) {
        activeEntries++;
      } else {
        expiredEntries++;
      }
    }
    
    return {
      totalEntries: Object.keys(this.store).length,
      activeEntries,
      expiredEntries
    };
  }
}

/**
 * Convenience function for common rate limiting pattern
 * @param request - Next.js request object
 * @param endpoint - Endpoint name (defaults to generic auth)
 * @returns Promise<IRateLimitResult> - Rate limiting result
 */
export async function rateLimiter(
  request: NextRequest,
  endpoint: string = 'general'
): Promise<IRateLimitResult> {
  return RateLimiter.checkRateLimit(request, endpoint);
}