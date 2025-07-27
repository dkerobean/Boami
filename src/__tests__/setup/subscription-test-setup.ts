import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer: MongoMemoryServer;

/**
 * Setup for subscription system tests
 */
export const setupSubscriptionTests = async () => {
  // Start in-memory MongoDB instance
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  // Connect to the in-memory database
  await mongoose.connect(mongoUri);

  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret-key-for-subscription-tests';
  process.env.NEXTAUTH_SECRET = 'test-nextauth-secret-key';
  process.env.FLUTTERWAVE_SECRET_KEY = 'test-flutterwave-secret-key';
  process.env.FLUTTERWAVE_SECRET_HASH = 'test-flutterwave-secret-hash';
  process.env.SUBSCRIPTION_ENCRYPTION_KEY = 'test-encryption-key-32-characters-long';
  process.env.INTERNAL_WEBHOOK_SECRET = 'test-internal-webhook-secret';
  process.env.CRON_SECRET = 'test-cron-secret';
  process.env.NEXTAUTH_URL = 'http://localhost:3000';

  // Mock console methods to reduce test noise
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;

  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();

  // Restore console methods for specific test output
  (global as any).testConsole = {
    log: originalConsoleLog,
    error: originalConsoleError,
    warn: originalConsoleWarn
  };
};

/**
 * Cleanup after subscription system tests
 */
export const teardownSubscriptionTests = async () => {
  // Close database connection
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();

  // Stop the in-memory MongoDB instance
  if (mongoServer) {
    await mongoServer.stop();
  }

  // Restore console methods
  if ((global as any).testConsole) {
    console.log = (global as any).testConsole.log;
    console.error = (global as any).testConsole.error;
    console.warn = (global as any).testConsole.warn;
  }
};

/**
 * Clear all collections between tests
 */
export const clearTestDatabase = async () => {
  const collections = mongoose.connection.collections;

  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
};

/**
 * Create test data helpers
 */
export const createTestUser = async (overrides: any = {}) => {
  const { User } = await import('@/lib/database/models');

  const userData = {
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    password: 'password123',
    isEmailVerified: true,
    emailPreferences: {
      subscriptionConfirmation: true,
      paymentNotifications: true,
      renewalReminders: true,
      cancellationNotifications: true,
      marketingEmails: true,
      securityAlerts: true
    },
    ...overrides
  };

  const user = new User(userData);
  await user.save();
  return user;
};

export const createTestPlan = async (overrides: any = {}) => {
  const { Plan } = await import('@/lib/database/models');

  const planData = {
    name: 'Test Plan',
    description: 'Test plan for testing',
    price: {
      monthly: 29.99,
      annual: 299.99,
      currency: 'USD'
    },
    features: ['test_feature_1', 'test_feature_2'],
    limits: {
      products: 100,
      storage: 10000,
      apiCalls: 10000
    },
    isActive: true,
    ...overrides
  };

  const plan = new Plan(planData);
  await plan.save();
  return plan;
};

export const createTestSubscription = async (userId: string, planId: string, overrides: any = {}) => {
  const { Subscription } = await import('@/lib/database/models');

  const subscriptionData = {
    userId,
    planId,
    status: 'active',
    isActive: true,
    billingPeriod: 'monthly',
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    ...overrides
  };

  const subscription = new Subscription(subscriptionData);
  await subscription.save();
  return subscription;
};

export const createTestTransaction = async (userId: string, subscriptionId: string, overrides: any = {}) => {
  const { Transaction } = await import('@/lib/database/models');

  const transactionData = {
    userId,
    subscriptionId,
    amount: 29.99,
    currency: 'USD',
    status: 'successful',
    type: 'subscription_payment',
    description: 'Test subscription payment',
    flutterwaveTransactionId: `test_txn_${Date.now()}`,
    flutterwaveReference: `test_ref_${Date.now()}`,
    processedAt: new Date(),
    ...overrides
  };

  const transaction = new Transaction(transactionData);
  await transaction.save();
  return transaction;
};

/**
 * Mock Flutterwave service responses
 */
export const mockFlutterwaveResponses = () => {
  const { FlutterwaveService } = require('@/lib/services/FlutterwaveService');

  jest.mock('@/lib/services/FlutterwaveService', () => ({
    FlutterwaveService: {
      initializePayment: jest.fn().mockResolvedValue({
        success: true,
        data: {
          link: 'https://checkout.flutterwave.com/pay/test123',
          reference: 'FLW_REF_TEST_123'
        }
      }),
      verifyPayment: jest.fn().mockResolvedValue({
        success: true,
        data: {
          id: 'flw_txn_123',
          status: 'successful',
          amount: 29.99,
          currency: 'USD',
          customer: {
            email: 'test@example.com',
            name: 'Test User'
          }
        }
      }),
      processRefund: jest.fn().mockResolvedValue({
        success: true,
        data: {
          id: 'refund_123',
          status: 'successful',
          amount: 29.99
        }
      })
    }
  }));
};

/**
 * Mock email services
 */
export const mockEmailServices = () => {
  jest.mock('@/lib/email/subscription-email-service', () => ({
    SubscriptionEmailService: {
      sendSubscriptionWelcome: jest.fn().mockResolvedValue({ success: true, messageId: 'test123' }),
      sendRenewalReminder: jest.fn().mockResolvedValue({ success: true, messageId: 'test123' }),
      sendSubscriptionCancelled: jest.fn().mockResolvedValue({ success: true, messageId: 'test123' }),
      sendPaymentFailed: jest.fn().mockResolvedValue({ success: true, messageId: 'test123' }),
      sendSubscriptionExpired: jest.fn().mockResolvedValue({ success: true, messageId: 'test123' }),
      sendSubscriptionRenewed: jest.fn().mockResolvedValue({ success: true, messageId: 'test123' }),
      sendTestSubscriptionEmail: jest.fn().mockResolvedValue({ success: true, messageId: 'test123' })
    }
  }));

  jest.mock('@/lib/services/SubscriptionEmailIntegration', () => ({
    SubscriptionEmailIntegration: {
      sendWelcomeEmail: jest.fn().mockResolvedValue(true),
      sendRenewalReminder: jest.fn().mockResolvedValue(true),
      sendCancellationEmail: jest.fn().mockResolvedValue(true),
      sendPaymentFailedEmail: jest.fn().mockResolvedValue(true),
      sendExpiredEmail: jest.fn().mockResolvedValue(true),
      sendRenewedEmail: jest.fn().mockResolvedValue(true)
    }
  }));
};

/**
 * Test utilities
 */
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const expectToBeWithinRange = (actual: number, expected: number, tolerance: number = 0.01) => {
  expect(actual).toBeGreaterThanOrEqual(expected - tolerance);
  expect(actual).toBeLessThanOrEqual(expected + tolerance);
};

export const generateTestEmail = (prefix: string = 'test') => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@example.com`;
};

export const generateTestReference = (prefix: string = 'REF') => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
};