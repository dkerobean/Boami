import { NextRequest, NextResponse } from 'next/server';

/**
 * Security headers configuration for subscription endpoints
 */
export class SecurityHeaders {

  /**
   * Apply security headers to response
   */
  static applySecurityHeaders(response: NextResponse): NextResponse {
    // Content Security Policy
    response.headers.set(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.flutterwave.com https://api.flutterwave.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: https:",
        "connect-src 'self' https://api.flutterwave.com https://checkout.flutterwave.com",
        "frame-src 'self' https://checkout.flutterwave.com",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self' https://checkout.flutterwave.com"
      ].join('; ')
    );

    // Strict Transport Security
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );

    // X-Frame-Options
    response.headers.set('X-Frame-Options', 'DENY');

    // X-Content-Type-Options
    response.headers.set('X-Content-Type-Options', 'nosniff');

    // Referrer Policy
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Permissions Policy
    response.headers.set(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), payment=(self)'
    );

    // X-XSS-Protection
    response.headers.set('X-XSS-Protection', '1; mode=block');

    // Remove server information
    response.headers.delete('Server');
    response.headers.delete('X-Powered-By');

    return response;
  }

  /**
   * Validate request origin for subscription endpoints
   */
  static validateOrigin(request: NextRequest): boolean {
    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');

    const allowedOrigins = [
      process.env.NEXTAUTH_URL,
      process.env.ALLOWED_ORIGIN,
      'https://checkout.flutterwave.com'
    ].filter(Boolean);

    // Allow same-origin requests
    if (!origin && !referer) {
      return true; // Server-to-server requests
    }

    if (origin && allowedOrigins.some(allowed => origin.startsWith(allowed!))) {
      return true;
    }

    if (referer && allowedOrigins.some(allowed => referer.startsWith(allowed!))) {
      return true;
    }

    return false;
  }

  /**
   * Validate webhook signature
   */
  static validateWebhookSignature(
    payload: string,
    signature: string,
    secret: string
  ): boolean {
    try {
      const crypto = require('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      console.error('Webhook signature validation error:', error);
      return false;
    }
  }

  /**
   * Rate limiting configuration
   */
  static getRateLimitConfig(endpoint: string): { windowMs: number; max: number } {
    const configs: Record<string, { windowMs: number; max: number }> = {
      // Payment endpoints - more restrictive
      '/api/subscriptions/create': { windowMs: 15 * 60 * 1000, max: 5 }, // 5 requests per 15 minutes
      '/api/subscriptions/cancel': { windowMs: 15 * 60 * 1000, max: 3 }, // 3 requests per 15 minutes
      '/api/subscriptions/verify-payment': { windowMs: 5 * 60 * 1000, max: 10 }, // 10 requests per 5 minutes

      // Webhook endpoints - allow more for legitimate webhooks
      '/api/webhooks/flutterwave': { windowMs: 1 * 60 * 1000, max: 100 }, // 100 requests per minute
      '/api/webhooks/subscriptions': { windowMs: 1 * 60 * 1000, max: 50 }, // 50 requests per minute

      // General subscription endpoints
      '/api/subscriptions': { windowMs: 15 * 60 * 1000, max: 30 }, // 30 requests per 15 minutes

      // Default rate limit
      default: { windowMs: 15 * 60 * 1000, max: 100 } // 100 requests per 15 minutes
    };

    return configs[endpoint] || configs.default;
  }

  /**
   * IP whitelist for webhook endpoints
   */
  static isWhitelistedIP(ip: string, endpoint: string): boolean {
    // Flutterwave IP ranges (these should be updated based on Flutterwave documentation)
    const flutterwaveIPs = [
      '52.74.14.9',
      '52.74.14.10',
      '52.74.14.11',
      // Add more Flutterwave IPs as needed
    ];

    // Internal IPs
    const internalIPs = [
      '127.0.0.1',
      '::1',
      'localhost'
    ];

    // Development environment - allow all
    if (process.env.NODE_ENV === 'development') {
      return true;
    }

    // Webhook endpoints require IP whitelisting
    if (endpoint.includes('/webhooks/flutterwave')) {
      return flutterwaveIPs.includes(ip) || internalIPs.includes(ip);
    }

    // Internal webhook endpoints
    if (endpoint.includes('/webhooks/subscriptions')) {
      return internalIPs.includes(ip);
    }

    // All other endpoints allow any IP
    return true;
  }

  /**
   * CSRF token validation
   */
  static validateCSRFToken(request: NextRequest): boolean {
    // Skip CSRF validation for webhook endpoints
    if (request.nextUrl.pathname.includes('/webhooks/')) {
      return true;
    }

    // Skip for GET requests
    if (request.method === 'GET') {
      return true;
    }

    const csrfToken = request.headers.get('x-csrf-token');
    const sessionToken = request.headers.get('x-session-token');

    // In a real implementation, you would validate the CSRF token against the session
    // For now, we'll just check if the token exists
    return Boolean(csrfToken && sessionToken);
  }

  /**
   * Sanitize request data
   */
  static sanitizeRequestData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sanitized = JSON.parse(JSON.stringify(data));

    // Remove potentially dangerous fields
    const dangerousFields = [
      '__proto__',
      'constructor',
      'prototype',
      'eval',
      'function'
    ];

    const sanitizeObject = (obj: any) => {
      if (typeof obj !== 'object' || obj === null) return obj;

      for (const key in obj) {
        if (dangerousFields.includes(key.toLowerCase())) {
          delete obj[key];
        } else if (typeof obj[key] === 'string') {
          // Basic XSS prevention
          obj[key] = obj[key]
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '');
        } else if (typeof obj[key] === 'object') {
          sanitizeObject(obj[key]);
        }
      }
    };

    sanitizeObject(sanitized);
    return sanitized;
  }

  /**
   * Generate secure session token
   */
  static generateSecureToken(): string {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Validate request size
   */
  static validateRequestSize(request: NextRequest, maxSizeKB: number = 1024): boolean {
    const contentLength = request.headers.get('content-length');

    if (!contentLength) {
      return true; // Allow requests without content-length header
    }

    const sizeInKB = parseInt(contentLength) / 1024;
    return sizeInKB <= maxSizeKB;
  }

  /**
   * Check for suspicious patterns in request
   */
  static detectSuspiciousActivity(request: NextRequest): string[] {
    const suspiciousPatterns: string[] = [];
    const userAgent = request.headers.get('user-agent') || '';
    const url = request.nextUrl.toString();

    // Check for bot-like user agents
    const botPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i
    ];

    if (botPatterns.some(pattern => pattern.test(userAgent))) {
      suspiciousPatterns.push('bot-like-user-agent');
    }

    // Check for SQL injection patterns
    const sqlPatterns = [
      /union\s+select/i,
      /drop\s+table/i,
      /insert\s+into/i,
      /delete\s+from/i
    ];

    if (sqlPatterns.some(pattern => pattern.test(url))) {
      suspiciousPatterns.push('sql-injection-attempt');
    }

    // Check for XSS patterns
    const xssPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i
    ];

    if (xssPatterns.some(pattern => pattern.test(url))) {
      suspiciousPatterns.push('xss-attempt');
    }

    // Check for path traversal
    if (url.includes('../') || url.includes('..\\')) {
      suspiciousPatterns.push('path-traversal-attempt');
    }

    return suspiciousPatterns;
  }
}