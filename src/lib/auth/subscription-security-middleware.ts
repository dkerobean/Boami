import { NextRequest, NextResponse } from 'next/server';
import { SecurityHeaders } from './security-headers';
import { SubscriptionLogger } from '../utils/subscription-logger';

/**
 * Security middleware for subscription endpoints
 */
export class SubscriptionSecurityMiddleware {

  /**
   * Apply comprehensive security checks to subscription requests
   */
  static async secureRequest(
    request: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse>
  ): Promise<NextResponse> {
    try {
      // Get client IP
      const clientIP = this.getClientIP(request);
      const userAgent = request.headers.get('user-agent') || '';
 const endpoint = request.nextUrl.pathname;

      // 1. Validate request size
      if (!SecurityHeaders.validateRequestSize(request, 1024)) {
        await SubscriptionLogger.logSecurityActivity(
          'request_too_large',
          { endpoint, size: request.headers.get('content-length') },
          { ipAddress: clientIP, userAgent, severity: 'warning' }
        );

        return NextResponse.json(
          { success: false, error: 'Request too large' },
          { status: 413 }
        );
      }

      // 2. Check IP whitelist for sensitive endpoints
      if (!SecurityHeaders.isWhitelistedIP(clientIP, endpoint)) {
        await SubscriptionLogger.logSecurityActivity(
          'ip_not_whitelisted',
          { endpoint, ip: clientIP },
          { ipAddress: clientIP, userAgent, severity: 'error' }
        );

        return NextResponse.json(
          { success: false, error: 'Access denied' },
          { status: 403 }
        );
      }

      // 3. Validate origin for non-webhook endpoints
      if (!endpoint.includes('/webhooks/') && !SecurityHeaders.validateOrigin(request)) {
        await SubscriptionLogger.logSecurityActivity(
          'invalid_origin',
          {
            endpoint,
            origin: request.headers.get('origin'),
            referer: request.headers.get('referer')
          },
          { ipAddress: clientIP, userAgent, severity: 'warning' }
        );

        return NextResponse.json(
          { success: false, error: 'Invalid origin' },
          { status: 403 }
        );
      }

      // 4. CSRF protection for state-changing operations
      if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
        if (!SecurityHeaders.validateCSRFToken(request)) {
          await SubscriptionLogger.logSecurityActivity(
            'csrf_validation_failed',
            { endpoint, method: request.method },
            { ipAddress: clientIP, userAgent, severity: 'warning' }
          );

          return NextResponse.json(
            { success: false, error: 'CSRF validation failed' },
            { status: 403 }
          );
        }
      }

      // 5. Detect suspicious activity
      const suspiciousPatterns = SecurityHeaders.detectSuspiciousActivity(request);
      if (suspiciousPatterns.length > 0) {
        await SubscriptionLogger.logSecurityActivity(
          'suspicious_activity_detected',
          {
            endpoint,
            patterns: suspiciousPatterns,
            url: request.nextUrl.toString()
          },
          { ipAddress: clientIP, userAgent, severity: 'critical' }
        );

        return NextResponse.json(
          { success: false, error: 'Suspicious activity detected' },
          { status: 400 }
        );
      }

      // 6. Rate limiting check (simplified - in production use Redis)
      const rateLimitResult = await this.checkRateLimit(clientIP, endpoint);
      if (!rateLimitResult.allowed) {
        await SubscriptionLogger.logSecurityActivity(
          'rate_limit_exceeded',
          {
            endpoint,
            limit: rateLimitResult.limit,
            windowMs: rateLimitResult.windowMs
          },
          { ipAddress: clientIP, userAgent, severity: 'warning' }
        );

        return NextResponse.json(
          { success: false, error: 'Rate limit exceeded' },
          { status: 429 }
        );
      }

      // 7. Sanitize request data
      if (request.method !== 'GET') {
        try {
          const body = await request.json();
          const sanitizedBody = SecurityHeaders.sanitizeRequestData(body);

          // Create new request with sanitized body
          const sanitizedRequest = new NextRequest(request.url, {
            method: request.method,
            headers: request.headers,
            body: JSON.stringify(sanitizedBody)
          });

          request = sanitizedRequest;
        } catch (error) {
          // If body parsing fails, continue with original request
        }
      }

      // 8. Execute the handler
      const response = await handler(request);

      // 9. Apply security headers to response
      const secureResponse = SecurityHeaders.applySecurityHeaders(response);

      // 10. Log successful request
      await SubscriptionLogger.logAccessActivity(
        'request_processed',
        {
          endpoint,
          method: request.method,
          status: secureResponse.status
        },
        { ipAddress: clientIP, userAgent }
      );

      return secureResponse;

    } catch (error) {
      console.error('Security middleware error:', error);

      // Log the error
      await SubscriptionLogger.logSecurityActivity(
        'security_middleware_error',
        { error: error.message },
        {
          ipAddress: this.getClientIP(request),
          userAgent: request.headers.get('user-agent') || '',
          severity: 'error'
        }
      );

      return NextResponse.json(
        { success: false, error: 'Internal security error' },
        { status: 500 }
      );
    }
  }

  /**
   * Get client IP address from request
   */
  private static getClientIP(request: NextRequest): string {
    // Check various headers for the real IP
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    const cfConnectingIP = request.headers.get('cf-connecting-ip');

    if (forwardedFor) {
      return forwardedFor.split(',')[0].trim();
    }

    if (realIP) {
      return realIP;
    }

    if (cfConnectingIP) {
      return cfConnectingIP;
    }

    // Fallback to connection IP (may not be available in all environments)
    return request.ip || 'unknown';
  }

  /**
   * Simple in-memory rate limiting (use Redis in production)
   */
  private static rateLimitStore = new Map<string, { count: number; resetTime: number }>();

  private static async checkRateLimit(
    clientIP: string,
    endpoint: string
  ): Promise<{ allowed: boolean; limit: number; windowMs: number }> {
    const config = SecurityHeaders.getRateLimitConfig(endpoint);
    const key = `${clientIP}:${endpoint}`;
    const now = Date.now();

    const existing = this.rateLimitStore.get(key);

    if (!existing || now > existing.resetTime) {
      // Reset or create new entry
      this.rateLimitStore.set(key, {
        count: 1,
        resetTime: now + config.windowMs
      });
      return { allowed: true, ...config };
    }

    if (existing.count >= config.max) {
      return { allowed: false, ...config };
    }

    // Increment count
    existing.count++;
    this.rateLimitStore.set(key, existing);

    return { allowed: true, ...config };
  }

  /**
   * Clean up expired rate limit entries
   */
  static cleanupRateLimitStore() {
    const now = Date.now();

    for (const [key, value] of this.rateLimitStore.entries()) {
      if (now > value.resetTime) {
        this.rateLimitStore.delete(key);
      }
    }
  }

  /**
   * Validate webhook signature for Flutterwave
   */
  static async validateFlutterwaveWebhook(
    request: NextRequest
  ): Promise<{ valid: boolean; error?: string }> {
    try {
      const signature = request.headers.get('verif-hash');
      const secretHash = process.env.FLUTTERWAVE_SECRET_HASH;

      if (!secretHash) {
        return { valid: false, error: 'Webhook secret not configured' };
      }

      if (!signature) {
        return { valid: false, error: 'Missing webhook signature' };
      }

      if (signature !== secretHash) {
        await SubscriptionLogger.logSecurityActivity(
          'invalid_webhook_signature',
          {
            endpoint: request.nextUrl.pathname,
            providedSignature: signature?.substring(0, 8) + '...'
          },
          {
            ipAddress: this.getClientIP(request),
            userAgent: request.headers.get('user-agent') || '',
            severity: 'error'
          }
        );

        return { valid: false, error: 'Invalid webhook signature' };
      }

      return { valid: true };

    } catch (error) {
      console.error('Webhook validation error:', error);
      return { valid: false, error: 'Webhook validation failed' };
    }
  }

  /**
   * Secure wrapper for subscription API endpoints
   */
  static secureSubscriptionEndpoint(
    handler: (req: NextRequest) => Promise<NextResponse>
  ) {
    return async (request: NextRequest) => {
      return await this.secureRequest(request, handler);
    };
  }

  /**
   * Secure wrapper for webhook endpoints
   */
  static secureWebhookEndpoint(
    handler: (req: NextRequest) => Promise<NextResponse>,
    validateSignature: boolean = true
  ) {
    return async (request: NextRequest) => {
      // Additional webhook-specific security
      if (validateSignature && request.nextUrl.pathname.includes('/flutterwave')) {
        const validation = await this.validateFlutterwaveWebhook(request);
        if (!validation.valid) {
          return NextResponse.json(
            { success: false, error: validation.error },
            { status: 401 }
          );
        }
      }

      return await this.secureRequest(request, handler);
    };
  }
}

// Clean up rate limit store every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    SubscriptionSecurityMiddleware.cleanupRateLimitStore();
  }, 5 * 60 * 1000);
}