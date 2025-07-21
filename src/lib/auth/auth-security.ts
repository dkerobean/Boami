import { NextRequest } from 'next/server';
import { ProductivityAuthResult } from './productivity-auth';

/**
 * Security utilities for productivity authentication
 */

export interface SecurityEvent {
  type: 'login' | 'failed_login' | 'permission_denied' | 'suspicious_activity' | 'rate_limit_exceeded';
  userId?: string;
  ip?: string;
  userAgent?: string;
  timestamp: Date;
  details?: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

/**
 * Default rate limits for different operations
 */
export const DEFAULT_RATE_LIMITS: Record<string, RateLimitConfig> = {
  login: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 login attempts per 15 minutes
    skipSuccessfulRequests: true
  },
  api_general: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 requests per minute
    skipSuccessfulRequests: true
  },
  api_write: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30, // 30 write operations per minute
    skipSuccessfulRequests: true
  },
  api_premium: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 200, // 200 requests per minute for premium users
    skipSuccessfulRequests: true
  }
};

/**
 * In-memory rate limiting store (in production, use Redis)
 */
class MemoryRateLimitStore {
  private store = new Map<string, { count: number; resetTime: number }>();

  get(key: string): { count: number; resetTime: number } | undefined {
    const entry = this.store.get(key);
    if (entry && entry.resetTime < Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return entry;
  }

  set(key: string, count: number, resetTime: number): void {
    this.store.set(key, { count, resetTime });
  }

  increment(key: string, windowMs: number): { count: number; resetTime: number } {
    const now = Date.now();
    const entry = this.get(key);

    if (!entry) {
      const newEntry = { count: 1, resetTime: now + windowMs };
      this.set(key, 1, now + windowMs);
      return newEntry;
    }

    entry.count++;
    this.set(key, entry.count, entry.resetTime);
    return entry;
  }

  clear(): void {
    this.store.clear();
  }
}

const rateLimitStore = new MemoryRateLimitStore();

/**
 * Check rate limit for a given key
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): { allowed: boolean; count: number; resetTime: number; remaining: number } {
  const entry = rateLimitStore.increment(key, config.windowMs);

  return {
    allowed: entry.count <= config.maxRequests,
    count: entry.count,
    resetTime: entry.resetTime,
    remaining: Math.max(0, config.maxRequests - entry.count)
  };
}

/**
 * Get client IP address from request
 */
export function getClientIP(request: NextRequest): string {
  // Check various headers for the real IP
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  if (realIP) {
    return realIP;
  }

  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  // Fallback to connection remote address
  return request.ip || 'unknown';
}

/**
 * Get user agent from request
 */
export function getUserAgent(request: NextRequest): string {
  return request.headers.get('user-agent') || 'unknown';
}

/**
 * Create rate limit key for user
 */
export function createRateLimitKey(
  userId: string | undefined,
  ip: string,
  operation: string
): string {
  // Use userId if available, otherwise use IP
  const identifier = userId || ip;
  return `rate_limit:${identifier}:${operation}`;
}

/**
 * Check if request should be rate limited
 */
export function shouldRateLimit(
  request: NextRequest,
  authResult: ProductivityAuthResult | null,
  operation: string
): { limited: boolean; config: RateLimitConfig; remaining: number; resetTime: number } {
  const ip = getClientIP(request);
  const userId = authResult?.userId;

  // Get appropriate rate limit config
  let config = DEFAULT_RATE_LIMITS[operation] || DEFAULT_RATE_LIMITS.api_general;

  // Premium users get higher limits
  if (authResult?.permissions?.includes('premium_features')) {
    config = DEFAULT_RATE_LIMITS.api_premium;
  }

  const key = createRateLimitKey(userId, ip, operation);
  const result = checkRateLimit(key, config);

  return {
    limited: !result.allowed,
    config,
    remaining: result.remaining,
    resetTime: result.resetTime
  };
}

/**
 * Log security event
 */
export function logSecurityEvent(event: SecurityEvent): void {
  // In production, send to security monitoring service
  console.log('Security Event:', {
    ...event,
    timestamp: event.timestamp.toISOString()
  });

  // Alert on high/critical severity events
  if (event.severity === 'high' || event.severity === 'critical') {
    console.warn('HIGH SEVERITY SECURITY EVENT:', event);
    // In production, send alert to security team
  }
}

/**
 * Detect suspicious activity patterns
 */
export function detectSuspiciousActivity(
  request: NextRequest,
  authResult: ProductivityAuthResult | null
): { suspicious: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const ip = getClientIP(request);
  const userAgent = getUserAgent(request);

  // Check for suspicious IP patterns
  if (ip === 'unknown' || ip.startsWith('127.') || ip.startsWith('10.')) {
    // These might be legitimate in development, but suspicious in production
    if (process.env.NODE_ENV === 'production') {
      reasons.push('Suspicious IP address');
    }
  }

  // Check for suspicious user agent patterns
  if (userAgent === 'unknown' || userAgent.length < 10) {
    reasons.push('Suspicious or missing user agent');
  }

  // Check for bot-like user agents
  const botPatterns = [
    /bot/i, /crawler/i, /spider/i, /scraper/i,
    /curl/i, /wget/i, /python/i, /java/i
  ];

  if (botPatterns.some(pattern => pattern.test(userAgent))) {
    reasons.push('Bot-like user agent detected');
  }

  // Check for rapid requests from same IP
  const rapidRequestKey = `rapid_requests:${ip}`;
  const rapidRequestCheck = checkRateLimit(rapidRequestKey, {
    windowMs: 10 * 1000, // 10 seconds
    maxRequests: 20 // 20 requests in 10 seconds is suspicious
  });

  if (!rapidRequestCheck.allowed) {
    reasons.push('Rapid requests detected');
  }

  return {
    suspicious: reasons.length > 0,
    reasons
  };
}

/**
 * Validate request headers for security
 */
export function validateRequestHeaders(request: NextRequest): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  // Check for required security headers in responses (this would be in middleware)
  const contentType = request.headers.get('content-type');
  if (request.method === 'POST' || request.method === 'PUT') {
    if (!contentType || !contentType.includes('application/json')) {
      issues.push('Invalid or missing Content-Type header for write operations');
    }
  }

  // Check for potentially dangerous headers
  const dangerousHeaders = ['x-forwarded-host', 'x-original-url', 'x-rewrite-url'];
  dangerousHeaders.forEach(header => {
    if (request.headers.get(header)) {
      issues.push(`Potentially dangerous header detected: ${header}`);
    }
  });

  return {
    valid: issues.length === 0,
    issues
  };
}

/**
 * Security middleware for productivity APIs
 */
export function withSecurity(
  handler: (request: NextRequest, authResult: ProductivityAuthResult) => Promise<Response>
) {
  return async (request: NextRequest, authResult: ProductivityAuthResult): Promise<Response> => {
    const ip = getClientIP(request);
    const userAgent = getUserAgent(request);

    // Validate request headers
    const headerValidation = validateRequestHeaders(request);
    if (!headerValidation.valid) {
      logSecurityEvent({
        type: 'suspicious_activity',
        userId: authResult.userId,
        ip,
        userAgent,
        timestamp: new Date(),
        details: { issues: headerValidation.issues },
        severity: 'medium'
      });
    }

    // Detect suspicious activity
    const suspiciousActivity = detectSuspiciousActivity(request, authResult);
    if (suspiciousActivity.suspicious) {
      logSecurityEvent({
        type: 'suspicious_activity',
        userId: authResult.userId,
        ip,
        userAgent,
        timestamp: new Date(),
        details: { reasons: suspiciousActivity.reasons },
        severity: 'high'
      });

      // For now, just log. In production, might want to block or require additional verification
    }

    // Check rate limiting
    const operation = request.method.toLowerCase() === 'get' ? 'api_general' : 'api_write';
    const rateLimitCheck = shouldRateLimit(request, authResult, operation);

    if (rateLimitCheck.limited) {
      logSecurityEvent({
        type: 'rate_limit_exceeded',
        userId: authResult.userId,
        ip,
        userAgent,
        timestamp: new Date(),
        details: { operation, config: rateLimitCheck.config },
        severity: 'medium'
      });

      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Rate limit exceeded. Please try again later.',
            retryAfter: Math.ceil((rateLimitCheck.resetTime - Date.now()) / 1000)
          }
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': rateLimitCheck.config.maxRequests.toString(),
            'X-RateLimit-Remaining': rateLimitCheck.remaining.toString(),
            'X-RateLimit-Reset': rateLimitCheck.resetTime.toString(),
            'Retry-After': Math.ceil((rateLimitCheck.resetTime - Date.now()) / 1000).toString()
          }
        }
      );
    }

    // Add security headers to response
    const response = await handler(request, authResult);

    // Clone response to add headers
    const secureResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: new Headers(response.headers)
    });

    // Add security headers
    secureResponse.headers.set('X-Content-Type-Options', 'nosniff');
    secureResponse.headers.set('X-Frame-Options', 'DENY');
    secureResponse.headers.set('X-XSS-Protection', '1; mode=block');
    secureResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    secureResponse.headers.set('X-RateLimit-Remaining', rateLimitCheck.remaining.toString());

    return secureResponse;
  };
}

/**
 * Clear rate limit store (for testing)
 */
export function clearRateLimitStore(): void {
  rateLimitStore.clear();
}