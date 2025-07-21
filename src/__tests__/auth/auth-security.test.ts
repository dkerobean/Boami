import { NextRequest } from 'next/server';
import {
  checkRateLimit,
  getClientIP,
  getUserAgent,
  createRateLimitKey,
  shouldRateLimit,
  detectSuspiciousActivity,
  validateRequestHeaders,
  clearRateLimitStore,
  DEFAULT_RATE_LIMITS
} from '@/lib/auth/auth-security';

describe('Rate Limiting', () => {
  beforeEach(() => {
    clearRateLimitStore();
  });

  describe('checkRateLimit', () => {
    it('should allow requests within limit', () => {
      const config = { windowMs: 60000, maxRequests: 5 };

      const result1 = checkRateLimit('test-key', config);
      expect(result1.allowed).toBe(true);
      expect(result1.count).toBe(1);
      expect(result1.remaining).toBe(4);

      const result2 = checkRateLimit('test-key', config);
      expect(result2.allowed).toBe(true);
      expect(result2.count).toBe(2);
      expect(result2.remaining).toBe(3);
    });

    it('should block requests exceeding limit', () => {
      const config = { windowMs: 60000, maxRequests: 2 };

      checkRateLimit('test-key', config); // 1st request
      checkRateLimit('test-key', config); // 2nd request

      const result = checkRateLimit('test-key', config); // 3rd request
      expect(result.allowed).toBe(false);
      expect(result.count).toBe(3);
      expect(result.remaining).toBe(0);
    });

    it('should reset count after window expires', async () => {
      const config = { windowMs: 100, maxRequests: 2 }; // 100ms window

      checkRateLimit('test-key', config);
      checkRateLimit('test-key', config);

      // Should be blocked
      let result = checkRateLimit('test-key', config);
      expect(result.allowed).toBe(false);

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should be allowed again
      result = checkRateLimit('test-key', config);
      expect(result.allowed).toBe(true);
      expect(result.count).toBe(1);
    });
  });

  describe('getClientIP', () => {
    it('should extract IP from x-forwarded-for header', () => {
      const request = new NextRequest('http://localhost/test', {
        headers: { 'x-forwarded-for': '192.168.1.1, 10.0.0.1' }
      });

      expect(getClientIP(request)).toBe('192.168.1.1');
    });

    it('should extract IP from x-real-ip header', () => {
      const request = new NextRequest('http://localhost/test', {
        headers: { 'x-real-ip': '192.168.1.2' }
      });

      expect(getClientIP(request)).toBe('192.168.1.2');
    });

    it('should extract IP from cf-connecting-ip header', () => {
      const request = new NextRequest('http://localhost/test', {
        headers: { 'cf-connecting-ip': '192.168.1.3' }
      });

      expect(getClientIP(request)).toBe('192.168.1.3');
    });

    it('should return unknown when no IP headers present', () => {
      const request = new NextRequest('http://localhost/test');

      expect(getClientIP(request)).toBe('unknown');
    });
  });

  describe('getUserAgent', () => {
    it('should extract user agent from header', () => {
      const request = new NextRequest('http://localhost/test', {
        headers: { 'user-agent': 'Mozilla/5.0 (Test Browser)' }
      });

      expect(getUserAgent(request)).toBe('Mozilla/5.0 (Test Browser)');
    });

    it('should return unknown when no user agent header', () => {
      const request = new NextRequest('http://localhost/test');

      expect(getUserAgent(request)).toBe('unknown');
    });
  });

  describe('createRateLimitKey', () => {
    it('should use userId when available', () => {
      const key = createRateLimitKey('user123', '192.168.1.1', 'api_general');
      expect(key).toBe('rate_limit:user123:api_general');
    });

    it('should use IP when userId not available', () => {
      const key = createRateLimitKey(undefined, '192.168.1.1', 'api_general');
      expect(key).toBe('rate_limit:192.168.1.1:api_general');
    });
  });

  describe('shouldRateLimit', () => {
    it('should use general rate limit for regular users', () => {
      const request = new NextRequest('http://localhost/test');
      const authResult = {
        success: true,
        userId: 'user123',
        permissions: ['read', 'write']
      };

      const result = shouldRateLimit(request, authResult, 'api_general');
      expect(result.limited).toBe(false);
      expect(result.config).toEqual(DEFAULT_RATE_LIMITS.api_general);
    });

    it('should use premium rate limit for premium users', () => {
      const request = new NextRequest('http://localhost/test');
      const authResult = {
        success: true,
        userId: 'premium123',
        permissions: ['read', 'write', 'premium_features']
      };

      const result = shouldRateLimit(request, authResult, 'api_general');
      expect(result.limited).toBe(false);
      expect(result.config).toEqual(DEFAULT_RATE_LIMITS.api_premium);
    });

    it('should limit requests when threshold exceeded', () => {
      const request = new NextRequest('http://localhost/test');
      const authResult = {
        success: true,
        userId: 'user123',
        permissions: ['read', 'write']
      };

      // Make requests up to the limit
      const config = DEFAULT_RATE_LIMITS.api_general;
      for (let i = 0; i < config.maxRequests; i++) {
        shouldRateLimit(request, authResult, 'api_general');
      }

      // Next request should be limited
      const result = shouldRateLimit(request, authResult, 'api_general');
      expect(result.limited).toBe(true);
    });
  });
});

describe('Security Detection', () => {
  describe('detectSuspiciousActivity', () => {
    it('should detect suspicious user agent', () => {
      const request = new NextRequest('http://localhost/test', {
        headers: {
          'user-agent': 'bot',
          'x-forwarded-for': '192.168.1.1'
        }
      });

      const result = detectSuspiciousActivity(request, null);
      expect(result.suspicious).toBe(true);
      expect(result.reasons).toContain('Bot-like user agent detected');
    });

    it('should detect missing user agent', () => {
      const request = new NextRequest('http://localhost/test', {
        headers: { 'x-forwarded-for': '192.168.1.1' }
      });

      const result = detectSuspiciousActivity(request, null);
      expect(result.suspicious).toBe(true);
      expect(result.reasons).toContain('Suspicious or missing user agent');
    });

    it('should detect crawler user agents', () => {
      const crawlerAgents = [
        'Googlebot/2.1',
        'Mozilla/5.0 (compatible; bingbot/2.0)',
        'python-requests/2.25.1',
        'curl/7.68.0'
      ];

      crawlerAgents.forEach(agent => {
        const request = new NextRequest('http://localhost/test', {
          headers: {
            'user-agent': agent,
            'x-forwarded-for': '192.168.1.1'
          }
        });

        const result = detectSuspiciousActivity(request, null);
        expect(result.suspicious).toBe(true);
        expect(result.reasons).toContain('Bot-like user agent detected');
      });
    });

    it('should not flag legitimate user agents', () => {
      const request = new NextRequest('http://localhost/test', {
        headers: {
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'x-forwarded-for': '192.168.1.1'
        }
      });

      const result = detectSuspiciousActivity(request, null);
      expect(result.suspicious).toBe(false);
      expect(result.reasons).toHaveLength(0);
    });
  });

  describe('validateRequestHeaders', () => {
    it('should validate POST request with correct content type', () => {
      const request = new NextRequest('http://localhost/test', {
        method: 'POST',
        headers: { 'content-type': 'application/json' }
      });

      const result = validateRequestHeaders(request);
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should flag POST request with missing content type', () => {
      const request = new NextRequest('http://localhost/test', {
        method: 'POST'
      });

      const result = validateRequestHeaders(request);
      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Invalid or missing Content-Type header for write operations');
    });

    it('should flag dangerous headers', () => {
      const request = new NextRequest('http://localhost/test', {
        headers: { 'x-forwarded-host': 'evil.com' }
      });

      const result = validateRequestHeaders(request);
      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Potentially dangerous header detected: x-forwarded-host');
    });

    it('should allow GET requests without content type', () => {
      const request = new NextRequest('http://localhost/test', {
        method: 'GET'
      });

      const result = validateRequestHeaders(request);
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });
  });
});

describe('Integration Tests', () => {
  beforeEach(() => {
    clearRateLimitStore();
  });

  it('should handle complete security flow', () => {
    const request = new NextRequest('http://localhost/test', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'user-agent': 'Mozilla/5.0 (Test Browser)',
        'x-forwarded-for': '192.168.1.1'
      }
    });

    const authResult = {
      success: true,
      userId: 'user123',
      permissions: ['read', 'write']
    };

    // Check all security aspects
    const ip = getClientIP(request);
    const userAgent = getUserAgent(request);
    const headerValidation = validateRequestHeaders(request);
    const suspiciousActivity = detectSuspiciousActivity(request, authResult);
    const rateLimitCheck = shouldRateLimit(request, authResult, 'api_write');

    expect(ip).toBe('192.168.1.1');
    expect(userAgent).toBe('Mozilla/5.0 (Test Browser)');
    expect(headerValidation.valid).toBe(true);
    expect(suspiciousActivity.suspicious).toBe(false);
    expect(rateLimitCheck.limited).toBe(false);
  });
});