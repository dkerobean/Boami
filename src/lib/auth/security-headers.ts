import { NextResponse } from 'next/server';

/**
 * Security headers configuration for enhanced API protection
 * Implements OWASP security best practices
 */
export class SecurityHeaders {
  /**
   * Comprehensive security headers for API responses
   */
  private static readonly SECURITY_HEADERS = {
    // Content Security Policy (CSP)
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https://api.resend.com wss: https://vercel.live",
      "frame-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "upgrade-insecure-requests"
    ].join('; '),

    // Prevent MIME type sniffing
    'X-Content-Type-Options': 'nosniff',

    // Enable XSS filtering
    'X-XSS-Protection': '1; mode=block',

    // Prevent iframe embedding (clickjacking protection)
    'X-Frame-Options': 'DENY',

    // Referrer policy
    'Referrer-Policy': 'strict-origin-when-cross-origin',

    // Permissions policy (formerly Feature Policy)
    'Permissions-Policy': [
      'geolocation=()',
      'microphone=()',
      'camera=()',
      'payment=()',
      'usb=()',
      'magnetometer=()',
      'accelerometer=()',
      'gyroscope=()'
    ].join(', '),

    // HTTP Strict Transport Security (HSTS)
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',

    // Cross-Origin Policies
    'Cross-Origin-Embedder-Policy': 'credentialless',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',

    // Remove server information
    'Server': '',
    'X-Powered-By': '',

    // Cache control for sensitive endpoints
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Surrogate-Control': 'no-store'
  };

  /**
   * Rate limiting headers for API responses
   */
  private static generateRateLimitHeaders(
    limit: number,
    remaining: number,
    resetTime: number
  ): Record<string, string> {
    return {
      'X-RateLimit-Limit': limit.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': Math.ceil(resetTime / 1000).toString(),
      'Retry-After': Math.ceil((resetTime - Date.now()) / 1000).toString()
    };
  }

  /**
   * CSRF protection headers
   */
  private static generateCSRFHeaders(): Record<string, string> {
    return {
      'X-CSRF-Protection': '1',
      'X-Requested-With': 'XMLHttpRequest'
    };
  }

  /**
   * API-specific security headers
   */
  private static generateAPIHeaders(): Record<string, string> {
    return {
      'X-API-Version': '1.0',
      'X-Response-Time': Date.now().toString(),
      'X-Request-ID': crypto.randomUUID(),
      'X-Content-Security': 'protected'
    };
  }

  /**
   * Applies comprehensive security headers to a response
   * @param response - NextResponse object
   * @param options - Additional options for security headers
   * @returns NextResponse with security headers applied
   */
  static applySecurityHeaders(
    response: NextResponse,
    options: {
      rateLimitInfo?: {
        limit: number;
        remaining: number;
        resetTime: number;
      };
      includeCSRF?: boolean;
      includeCORS?: boolean;
      corsOrigins?: string[];
    } = {}
  ): NextResponse {
    // Apply base security headers
    Object.entries(this.SECURITY_HEADERS).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    // Apply rate limiting headers if provided
    if (options.rateLimitInfo) {
      const rateLimitHeaders = this.generateRateLimitHeaders(
        options.rateLimitInfo.limit,
        options.rateLimitInfo.remaining,
        options.rateLimitInfo.resetTime
      );
      Object.entries(rateLimitHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
    }

    // Apply CSRF protection headers
    if (options.includeCSRF) {
      const csrfHeaders = this.generateCSRFHeaders();
      Object.entries(csrfHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
    }

    // Apply CORS headers if needed
    if (options.includeCORS) {
      const allowedOrigins = options.corsOrigins || ['http://localhost:3000', 'https://yourdomain.com'];
      response.headers.set('Access-Control-Allow-Origin', allowedOrigins.join(', '));
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      response.headers.set('Access-Control-Max-Age', '86400');
    }

    // Apply API-specific headers
    const apiHeaders = this.generateAPIHeaders();
    Object.entries(apiHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  }

  /**
   * Creates a new response with security headers
   * @param data - Response data
   * @param init - Response init options
   * @param securityOptions - Security options
   * @returns NextResponse with security headers
   */
  static createSecureResponse(
    data: any,
    init: ResponseInit = {},
    securityOptions: Parameters<typeof SecurityHeaders.applySecurityHeaders>[1] = {}
  ): NextResponse {
    const response = NextResponse.json(data, init);
    return this.applySecurityHeaders(response, securityOptions);
  }

  /**
   * Creates a secure error response
   * @param error - Error message
   * @param status - HTTP status code
   * @param securityOptions - Security options
   * @returns NextResponse with error and security headers
   */
  static createSecureErrorResponse(
    error: string,
    status: number = 400,
    securityOptions: Parameters<typeof SecurityHeaders.applySecurityHeaders>[1] = {}
  ): NextResponse {
    const response = NextResponse.json(
      { 
        error,
        timestamp: new Date().toISOString(),
        status 
      },
      { status }
    );
    return this.applySecurityHeaders(response, securityOptions);
  }

  /**
   * Creates a secure success response
   * @param data - Response data
   * @param message - Success message
   * @param securityOptions - Security options
   * @returns NextResponse with success data and security headers
   */
  static createSecureSuccessResponse(
    data: any = {},
    message: string = 'Success',
    securityOptions: Parameters<typeof SecurityHeaders.applySecurityHeaders>[1] = {}
  ): NextResponse {
    const response = NextResponse.json(
      {
        success: true,
        message,
        data,
        timestamp: new Date().toISOString()
      },
      { status: 200 }
    );
    return this.applySecurityHeaders(response, securityOptions);
  }

  /**
   * Creates a secure rate limit exceeded response
   * @param retryAfter - Seconds until retry is allowed
   * @param message - Custom error message
   * @returns NextResponse with rate limit error
   */
  static createRateLimitResponse(
    retryAfter: number,
    message: string = 'Too many requests'
  ): NextResponse {
    const response = NextResponse.json(
      {
        error: message,
        retryAfter,
        timestamp: new Date().toISOString()
      },
      { status: 429 }
    );
    
    // Add rate limit specific headers
    response.headers.set('Retry-After', retryAfter.toString());
    response.headers.set('X-RateLimit-Exceeded', 'true');
    
    return this.applySecurityHeaders(response);
  }

  /**
   * Validates request headers for security compliance
   * @param request - Incoming request
   * @returns object with validation results
   */
  static validateRequestSecurity(request: Request): {
    isValid: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check for required headers
    const userAgent = request.headers.get('user-agent');
    if (!userAgent) {
      issues.push('Missing User-Agent header');
      recommendations.push('Include User-Agent header to identify client');
    }

    // Check Content-Type for POST/PUT requests
    const method = request.method;
    const contentType = request.headers.get('content-type');
    if (['POST', 'PUT', 'PATCH'].includes(method) && !contentType) {
      issues.push('Missing Content-Type header for data request');
      recommendations.push('Include Content-Type header (e.g., application/json)');
    }

    // Check for potential security headers
    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');
    
    if (method === 'POST' && !origin && !referer) {
      recommendations.push('Consider including Origin or Referer header for CSRF protection');
    }

    return {
      isValid: issues.length === 0,
      issues,
      recommendations
    };
  }

  /**
   * Sanitizes response data to prevent data leakage
   * @param data - Data to sanitize
   * @returns Sanitized data
   */
  static sanitizeResponseData(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'key',
      'hash',
      'salt',
      'ssn',
      'creditcard',
      'cvv'
    ];

    const sanitized = { ...data };

    // Remove sensitive fields
    Object.keys(sanitized).forEach(key => {
      const lowerKey = key.toLowerCase();
      if (sensitiveFields.some(field => lowerKey.includes(field))) {
        delete sanitized[key];
      }
    });

    // Recursively sanitize nested objects
    Object.keys(sanitized).forEach(key => {
      if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitizeResponseData(sanitized[key]);
      }
    });

    return sanitized;
  }

  /**
   * Creates security audit log entry
   * @param request - Request object
   * @param response - Response object
   * @param securityEvent - Type of security event
   * @returns Log entry object
   */
  static createSecurityAuditLog(
    request: Request,
    response: Response,
    securityEvent: 'rate_limit' | 'auth_failure' | 'suspicious_activity' | 'success'
  ): object {
    return {
      timestamp: new Date().toISOString(),
      event: securityEvent,
      method: request.method,
      url: request.url,
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      statusCode: response.status,
      contentLength: response.headers.get('content-length'),
      responseTime: Date.now(), // Should be calculated properly in middleware
      requestId: crypto.randomUUID()
    };
  }
}