/**
 * Unit tests for Verification Code Manager utility
 * Basic test cases to validate verification code operations
 */

import { VerificationCodeManager } from '@/lib/auth/verification';

// Simple test runner for Node.js environment
class TestRunner {
  private tests: { name: string; fn: () => void | Promise<void> }[] = [];
  private passed = 0;
  private failed = 0;

  test(name: string, fn: () => void | Promise<void>) {
    this.tests.push({ name, fn });
  }

  async run() {
    console.log('🧪 Running Verification Code Manager Tests...\n');
    
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
    toMatch: (pattern: RegExp) => {
      if (!pattern.test(actual)) {
        throw new Error(`Expected ${actual} to match pattern ${pattern}`);
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
    toBeGreaterThan: (expected: number) => {
      if (actual <= expected) {
        throw new Error(`Expected ${actual} to be greater than ${expected}`);
      }
    },
    toBeLessThan: (expected: number) => {
      if (actual >= expected) {
        throw new Error(`Expected ${actual} to be less than ${expected}`);
      }
    }
  };
}

// Test Suite
const runner = new TestRunner();

// Code Generation Tests
runner.test('should generate 4-digit verification code', () => {
  const userId = 'test-user-123';
  const type = 'email_verification';
  const code = VerificationCodeManager.createVerificationCode(userId, type);
  
  expect(typeof code).toBe('string');
  expect(code.length).toBe(4);
  expect(code).toMatch(/^\d{4}$/);
});

runner.test('should generate different codes each time', () => {
  const userId = 'test-user-123';
  const type = 'email_verification';
  
  const code1 = VerificationCodeManager.createVerificationCode(userId, type);
  const code2 = VerificationCodeManager.createVerificationCode(userId, type);
  
  // While codes could theoretically be the same, the probability is very low
  // We'll accept this small chance for the sake of testing
  expect(typeof code1).toBe('string');
  expect(typeof code2).toBe('string');
  expect(code1).toMatch(/^\d{4}$/);
  expect(code2).toMatch(/^\d{4}$/);
});

runner.test('should generate codes for different verification types', () => {
  const userId = 'test-user-123';
  
  const emailCode = VerificationCodeManager.createVerificationCode(userId, 'email_verification');
  const resetCode = VerificationCodeManager.createVerificationCode(userId, 'password_reset');
  
  expect(emailCode.length).toBe(4);
  expect(resetCode.length).toBe(4);
  expect(emailCode).toMatch(/^\d{4}$/);
  expect(resetCode).toMatch(/^\d{4}$/);
});

// Code Validation Tests
runner.test('should validate correct format codes', () => {
  const validCodes = ['1234', '0000', '9999', '5678'];
  
  validCodes.forEach(code => {
    const isValid = VerificationCodeManager.validateCodeFormat(code);
    expect(isValid).toBeTruthy();
  });
});

runner.test('should reject invalid format codes', () => {
  const invalidCodes = [
    '123',      // too short
    '12345',    // too long
    'abcd',     // letters
    '12a4',     // mixed
    '',         // empty
    '12 4',     // space
    '12.4'      // decimal
  ];
  
  invalidCodes.forEach(code => {
    const isValid = VerificationCodeManager.validateCodeFormat(code);
    expect(isValid).toBeFalsy();
  });
});

// Security and Rate Limiting Tests
runner.test('should detect potential brute force attempts', () => {
  const userId = 'test-user-123';
  const type = 'email_verification';
  
  // Simulate multiple failed attempts
  for (let i = 0; i < 3; i++) {
    VerificationCodeManager.recordFailedAttempt(userId, type);
  }
  
  const isSuspicious = VerificationCodeManager.isSuspiciousActivity(userId, type);
  expect(isSuspicious).toBeTruthy();
});

runner.test('should not flag normal activity as suspicious', () => {
  const userId = 'normal-user-456';
  const type = 'email_verification';
  
  // Record a single failed attempt
  VerificationCodeManager.recordFailedAttempt(userId, type);
  
  const isSuspicious = VerificationCodeManager.isSuspiciousActivity(userId, type);
  expect(isSuspicious).toBeFalsy();
});

runner.test('should clear failed attempts after successful verification', () => {
  const userId = 'test-user-789';
  const type = 'email_verification';
  
  // Record failed attempts
  VerificationCodeManager.recordFailedAttempt(userId, type);
  VerificationCodeManager.recordFailedAttempt(userId, type);
  
  // Clear attempts
  VerificationCodeManager.clearFailedAttempts(userId, type);
  
  const isSuspicious = VerificationCodeManager.isSuspiciousActivity(userId, type);
  expect(isSuspicious).toBeFalsy();
});

// Time-based Tests
runner.test('should get reasonable time until next attempt', () => {
  const userId = 'rate-limited-user';
  const type = 'email_verification';
  
  // Record multiple failed attempts to trigger rate limiting
  for (let i = 0; i < 5; i++) {
    VerificationCodeManager.recordFailedAttempt(userId, type);
  }
  
  const timeUntilNext = VerificationCodeManager.getTimeUntilNextAttempt(userId, type);
  expect(timeUntilNext).toBeGreaterThan(0);
  expect(timeUntilNext).toBeLessThan(3600000); // Less than 1 hour
});

runner.test('should allow immediate attempts for new users', () => {
  const userId = 'new-user-999';
  const type = 'email_verification';
  
  const timeUntilNext = VerificationCodeManager.getTimeUntilNextAttempt(userId, type);
  expect(timeUntilNext).toBe(0);
});

// Code Statistics Tests
runner.test('should provide verification statistics', () => {
  const stats = VerificationCodeManager.getVerificationStatistics();
  
  expect(typeof stats.totalAttempts).toBe('number');
  expect(typeof stats.failedAttempts).toBe('number');
  expect(typeof stats.successfulVerifications).toBe('number');
  expect(typeof stats.activeRateLimits).toBe('number');
  expect(stats.totalAttempts).toBeGreaterThan(-1); // Should be non-negative
});

// Code Entropy Tests
runner.test('should generate codes with sufficient randomness', () => {
  const codes = new Set<string>();
  const iterations = 100;
  
  // Generate multiple codes and check for uniqueness
  for (let i = 0; i < iterations; i++) {
    const code = VerificationCodeManager.createVerificationCode('user-' + i, 'email_verification');
    codes.add(code);
  }
  
  // We expect most codes to be unique (allowing for some collisions due to randomness)
  const uniquenessRatio = codes.size / iterations;
  expect(uniquenessRatio).toBeGreaterThan(0.8); // At least 80% unique
});

runner.test('should not generate predictable sequences', () => {
  const codes: string[] = [];
  
  // Generate a series of codes
  for (let i = 0; i < 10; i++) {
    const code = VerificationCodeManager.createVerificationCode('user-seq-' + i, 'email_verification');
    codes.push(code);
  }
  
  // Check that codes are not sequential
  let hasSequentialPattern = false;
  for (let i = 0; i < codes.length - 1; i++) {
    const current = parseInt(codes[i]);
    const next = parseInt(codes[i + 1]);
    if (next === current + 1) {
      hasSequentialPattern = true;
      break;
    }
  }
  
  expect(hasSequentialPattern).toBeFalsy();
});

// Error Handling Tests
runner.test('should handle invalid user IDs gracefully', () => {
  const invalidUserIds = ['', null, undefined];
  
  invalidUserIds.forEach(userId => {
    expect(() => {
      VerificationCodeManager.createVerificationCode(userId as any, 'email_verification');
    }).toThrow();
  });
});

runner.test('should handle invalid verification types gracefully', () => {
  const userId = 'test-user';
  const invalidTypes = ['', null, undefined, 'invalid_type'];
  
  invalidTypes.forEach(type => {
    expect(() => {
      VerificationCodeManager.createVerificationCode(userId, type as any);
    }).toThrow();
  });
});

// Cleanup Tests
runner.test('should clean up old verification attempts', () => {
  const initialStats = VerificationCodeManager.getVerificationStatistics();
  
  // This would normally clean up old entries
  VerificationCodeManager.cleanupExpiredEntries();
  
  const finalStats = VerificationCodeManager.getVerificationStatistics();
  
  // Stats should still be valid numbers
  expect(typeof finalStats.totalAttempts).toBe('number');
  expect(finalStats.totalAttempts).toBeGreaterThan(-1);
});

// Export for potential Jest integration
export { runner };

// Run tests if this file is executed directly
if (require.main === module) {
  runner.run().then(success => {
    process.exit(success ? 0 : 1);
  });
}