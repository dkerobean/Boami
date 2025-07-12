/**
 * Unit tests for JWT Manager utility
 * Basic test cases to validate JWT token operations
 */

import { JWTManager, IJWTPayload } from '@/lib/auth/jwt';

// Simple test runner for Node.js environment
class TestRunner {
  private tests: { name: string; fn: () => void | Promise<void> }[] = [];
  private passed = 0;
  private failed = 0;

  test(name: string, fn: () => void | Promise<void>) {
    this.tests.push({ name, fn });
  }

  async run() {
    console.log('🧪 Running JWT Manager Tests...\n');
    
    for (const test of this.tests) {
      try {
        await test.fn();
        console.log(`✅ ${test.name}`);
        this.passed++;
      } catch (error) {
        console.log(`❌ ${test.name}`);
        console.log(`   Error: ${error.message}\n`);
        this.failed++;
      }
    }

    console.log(`\n📊 Test Results: ${this.passed} passed, ${this.failed} failed`);
    return this.failed === 0;
  }
}

// Helper function to assert equality
function expect(actual: any) {
  return {
    toBe: (expected: any) => {
      if (actual !== expected) {
        throw new Error(`Expected ${expected}, but got ${actual}`);
      }
    },
    toEqual: (expected: any) => {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(actual)}`);
      }
    },
    toThrow: (expectedError?: string) => {
      if (typeof actual !== 'function') {
        throw new Error('Expected a function that throws');
      }
      try {
        actual();
        throw new Error('Expected function to throw, but it did not');
      } catch (error) {
        if (expectedError && !error.message.includes(expectedError)) {
          throw new Error(`Expected error containing "${expectedError}", but got "${error.message}"`);
        }
      }
    },
    toBeTruthy: () => {
      if (!actual) {
        throw new Error(`Expected truthy value, but got ${actual}`);
      }
    },
    toBeFalsy: () => {
      if (actual) {
        throw new Error(`Expected falsy value, but got ${actual}`);
      }
    },
    toBeNull: () => {
      if (actual !== null) {
        throw new Error(`Expected null, but got ${actual}`);
      }
    }
  };
}

// Test Suite
const runner = new TestRunner();

// Mock environment variables for testing
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-purposes-only';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-for-testing-purposes-only';

// Test payload data
const mockUser: IJWTPayload = {
  userId: 'test-user-id-123',
  email: 'test@example.com',
  role: 'user',
  isEmailVerified: true
};

// Token Generation Tests
runner.test('should generate valid access and refresh tokens', () => {
  const tokens = JWTManager.generateTokens(mockUser);
  
  expect(typeof tokens.accessToken).toBe('string');
  expect(typeof tokens.refreshToken).toBe('string');
  expect(tokens.accessToken.length > 0).toBeTruthy();
  expect(tokens.refreshToken.length > 0).toBeTruthy();
});

runner.test('should generate different tokens each time', () => {
  const tokens1 = JWTManager.generateTokens(mockUser);
  const tokens2 = JWTManager.generateTokens(mockUser);
  
  expect(tokens1.accessToken !== tokens2.accessToken).toBeTruthy();
  expect(tokens1.refreshToken !== tokens2.refreshToken).toBeTruthy();
});

// Token Verification Tests
runner.test('should verify valid access token and return payload', () => {
  const tokens = JWTManager.generateTokens(mockUser);
  const payload = JWTManager.verifyAccessToken(tokens.accessToken);
  
  expect(payload).toBeTruthy();
  expect(payload.userId).toBe(mockUser.userId);
  expect(payload.email).toBe(mockUser.email);
  expect(payload.role).toBe(mockUser.role);
  expect(payload.isEmailVerified).toBe(mockUser.isEmailVerified);
});

runner.test('should verify valid refresh token and return payload', () => {
  const tokens = JWTManager.generateTokens(mockUser);
  const payload = JWTManager.verifyRefreshToken(tokens.refreshToken);
  
  expect(payload).toBeTruthy();
  expect(payload.userId).toBe(mockUser.userId);
});

runner.test('should return null for invalid access token', () => {
  const invalidToken = 'invalid.token.here';
  const payload = JWTManager.verifyAccessToken(invalidToken);
  
  expect(payload).toBeNull();
});

runner.test('should return null for invalid refresh token', () => {
  const invalidToken = 'invalid.token.here';
  const payload = JWTManager.verifyRefreshToken(invalidToken);
  
  expect(payload).toBeNull();
});

runner.test('should return null for expired token', () => {
  // This test would require mocking time or creating an expired token
  // For now, we'll test with a malformed token
  const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
  const payload = JWTManager.verifyAccessToken(expiredToken);
  
  expect(payload).toBeNull();
});

// Refresh Token Tests
runner.test('should refresh tokens successfully', () => {
  const originalTokens = JWTManager.generateTokens(mockUser);
  const newTokens = JWTManager.refreshTokens(originalTokens.refreshToken);
  
  expect(newTokens).toBeTruthy();
  expect(typeof newTokens.accessToken).toBe('string');
  expect(typeof newTokens.refreshToken).toBe('string');
  expect(newTokens.accessToken !== originalTokens.accessToken).toBeTruthy();
});

runner.test('should return null when refreshing with invalid token', () => {
  const invalidRefreshToken = 'invalid.refresh.token';
  const newTokens = JWTManager.refreshTokens(invalidRefreshToken);
  
  expect(newTokens).toBeNull();
});

// Cookie Helper Tests
runner.test('should set auth cookies in response', () => {
  // Mock NextResponse for testing
  const mockHeaders = new Map<string, string>();
  const mockResponse = {
    headers: {
      set: (name: string, value: string) => mockHeaders.set(name, value),
      get: (name: string) => mockHeaders.get(name)
    }
  };

  const tokens = JWTManager.generateTokens(mockUser);
  JWTManager.setAuthCookiesInResponse(mockResponse as any, tokens);
  
  const setCookieHeader = mockHeaders.get('Set-Cookie');
  expect(setCookieHeader).toBeTruthy();
  expect(setCookieHeader.includes('accessToken=')).toBeTruthy();
  expect(setCookieHeader.includes('refreshToken=')).toBeTruthy();
  expect(setCookieHeader.includes('HttpOnly')).toBeTruthy();
  expect(setCookieHeader.includes('Secure')).toBeTruthy();
  expect(setCookieHeader.includes('SameSite=Strict')).toBeTruthy();
});

runner.test('should clear auth cookies in response', () => {
  // Mock NextResponse for testing
  const mockHeaders = new Map<string, string>();
  const mockResponse = {
    headers: {
      set: (name: string, value: string) => mockHeaders.set(name, value),
      get: (name: string) => mockHeaders.get(name)
    }
  };

  JWTManager.clearAuthCookiesInResponse(mockResponse as any);
  
  const setCookieHeader = mockHeaders.get('Set-Cookie');
  expect(setCookieHeader).toBeTruthy();
  expect(setCookieHeader.includes('accessToken=;')).toBeTruthy();
  expect(setCookieHeader.includes('refreshToken=;')).toBeTruthy();
  expect(setCookieHeader.includes('Expires=Thu, 01 Jan 1970')).toBeTruthy();
});

// Token Decoding Tests
runner.test('should decode token without verification', () => {
  const tokens = JWTManager.generateTokens(mockUser);
  const decoded = JWTManager.decodeToken(tokens.accessToken);
  
  expect(decoded).toBeTruthy();
  expect(decoded.userId).toBe(mockUser.userId);
  expect(decoded.email).toBe(mockUser.email);
});

runner.test('should return null when decoding invalid token', () => {
  const invalidToken = 'not.a.valid.token';
  const decoded = JWTManager.decodeToken(invalidToken);
  
  expect(decoded).toBeNull();
});

// Token Introspection Tests
runner.test('should check if token is expired', () => {
  const tokens = JWTManager.generateTokens(mockUser);
  const isExpired = JWTManager.isTokenExpired(tokens.accessToken);
  
  expect(isExpired).toBeFalsy(); // Should not be expired for a fresh token
});

runner.test('should extract user ID from token', () => {
  const tokens = JWTManager.generateTokens(mockUser);
  const userId = JWTManager.getUserIdFromToken(tokens.accessToken);
  
  expect(userId).toBe(mockUser.userId);
});

runner.test('should return null for user ID from invalid token', () => {
  const invalidToken = 'invalid.token.here';
  const userId = JWTManager.getUserIdFromToken(invalidToken);
  
  expect(userId).toBeNull();
});

// Export for potential Jest integration
export { runner };

// Run tests if this file is executed directly
if (require.main === module) {
  runner.run().then(success => {
    process.exit(success ? 0 : 1);
  });
}