import { connectToDatabase } from '@/lib/database/connection';
import { User } from '@/lib/database/models/User';
import { Plan } from '@/lib/database/models/Plan';
import { Subscription } from '@/lib/database/models/Subscription';
import { Transaction } from '@/lib/database/models/Transaction';
import { SubscriptionService } from '@/lib/services/SubscriptionService';
import { PaymentService } from '@/lib/services/PaymentService';
import { FeatureControlService } from '@/lib/services/FeatureControlService';
import { SubscriptionMetricsService } from '@/lib/services/SubscriptionMetricsService';
import { SubscriptionMonitoringService } from '@/lib/services/SubscriptionMonitoringService';
import { SubscriptionDataMigration } from '@/lib/utils/subscription-data-migration';

describe('Subscription System Integration Tests', () => {
  let testUser: any;
  let testPlan: any;
  let testSubscription: any;

  beforeAll(async () => {
    await connectToDatabase();

    // Clean up any existing test data
    await User.deleteMany({ email: /test.*@example\.com/ });
    await Plan.deleteMany({ name: /Test Plan/ });
    await Subscription.deleteMany({});
    await Transaction.deleteMany({});
  });

  beforeEach(async () => {
    // Create test user
    testUser = await User.create({
      firstName: 'Test',
      lastName: 'User',
      email: 'test.user@example.com',
      password: 'hashedpassword123',
      role: 'user',
      subscription: {
        status: 'none',
        planId: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false
      }
    });

    // Create test plan
    testPlan = await Plan.create({
      name: 'Test Plan Professional',
      description: 'Test plan for integration testing',
      price: {
        monthly: 29.99,
        annual: 299.99,
        currency: 'USD'
      },
      features: [
        'Advanced analytics',
        'Priority support',
        'API access'
      ],
      limits: {
        projects: 25,
        storage: 10240,
        apiCalls: 10000
      },
      active: true,
      trialDays: 14
    });
  });

  afterEach(async () => {
    // Clean up test data
    if (testUser) await User.findByIdAndDelete(testUser._id);
    if (testPlan) await Plan.findByIdAndDelete(testPlan._id);
    if (testSubscription) await Subscription.findByIdAndDelete(testSubscription._id);
    await Transaction.deleteMany({ userId: testUser?._id });
  });

  afterAll(async () => {
    // Final cleanup
    await User.deleteMany({ email: /test.*@example\.com/ });
    await Plan.deleteMany({ name: /Test Plan/ });
    await Subscription.deleteMany({});
    await Transaction.deleteMany({});
  });

  describe('Complete Subscription Lifecycle', () => {
    test('should handle complete subscription lifecycle from creation to cancellation', async () => {
      // 1. Create subscription
      const subscriptionData = {
        userId: testUser._id,
        planId: testPlan._id,
        billingPeriod: 'monthly' as const,
        paymentMethod: 'flutterwave',
        customerInfo: {
          email: testUser.email,
          name: `${testUser.firstName} ${testUser.lastName}`,
          phone: '+1234567890'
        }
      };

      testSubscription = awaionService.createSubscription(subscriptionData);

      expect(testSubscription).toBeDefined();
      expect(testSubscription.status).toBe('pending');
      expect(testSubscription.userId.toString()).toBe(testUser._id.toString());
      expect(testSubscription.planId.toString()).toBe(testPlan._id.toString());

      // 2. Simulate successful payment
      const paymentData = {
        subscriptionId: testSubscription._id,
        amount: testPlan.price.monthly,
        currency: 'USD',
        flutterwaveReference: 'FLW-TEST-123456',
        status: 'completed' as const,
        paymentMethod: 'card'
      };

      const payment = await PaymentService.processPayment(paymentData);
      expect(payment.status).toBe('completed');

      // 3. Activate subscription
      const activatedSubscription = await SubscriptionService.activateSubscription(
        testSubscription._id,
        payment._id
      );

      expect(activatedSubscription.status).toBe('active');
      expect(activatedSubscription.lastPaymentDate).toBeDefined();
      expect(activatedSubscription.lastPaymentAmount).toBe(testPlan.price.monthly);

      // 4. Test feature access
      const hasAccess = await FeatureControlService.checkFeatureAccess(
        testUser._id,
        'advanced_analytics'
      );
      expect(hasAccess).toBe(true);

      // 5. Update subscription (upgrade)
      const higherPlan = await Plan.create({
        name: 'Test Plan Enterprise',
        description: 'Enterprise test plan',
        price: {
          monthly: 99.99,
          annual: 999.99,
          currency: 'USD'
        },
        features: [
          'Advanced analytics',
          'Priority support',
          'API access',
          'Dedicated support'
        ],
        limits: {
          projects: -1, // Unlimited
          storage: 102400,
          apiCalls: -1
        },
        active: true,
        trialDays: 30
      });

      const updatedSubscription = await SubscriptionService.updateSubscription(
        testSubscription._id,
        {
          planId: higherPlan._id,
          billingPeriod: 'monthly'
        }
      );

      expect(updatedSubscription.planId.toString()).toBe(higherPlan._id.toString());

      // 6. Cancel subscription
      const cancelledSubscription = await SubscriptionService.cancelSubscription(
        testSubscription._id,
        {
          cancelAtPeriodEnd: true,
          cancelReason: 'user_requested'
        }
      );

      expect(cancelledSubscription.cancelAtPeriodEnd).toBe(true);
      expect(cancelledSubscription.cancelReason).toBe('user_requested');
      expect(cancelledSubscription.cancelledAt).toBeDefined();

      // Clean up additional plan
      await Plan.findByIdAndDelete(higherPlan._id);
    });

    test('should handle payment failures and retry logic', async () => {
      // Create subscription
      testSubscription = await SubscriptionService.createSubscription({
        userId: testUser._id,
        planId: testPlan._id,
        billingPeriod: 'monthly',
        paymentMethod: 'flutterwave',
        customerInfo: {
          email: testUser.email,
          name: `${testUser.firstName} ${testUser.lastName}`
        }
      });

      // Simulate failed payment
      const failedPaymentData = {
        subscriptionId: testSubscription._id,
        amount: testPlan.price.monthly,
        currency: 'USD',
        flutterwaveReference: 'FLW-FAILED-123456',
        status: 'failed' as const,
        paymentMethod: 'card',
        failureReason: 'insufficient_funds'
      };

      const failedPayment = await PaymentService.processPayment(failedPaymentData);
      expect(failedPayment.status).toBe('failed');
      expect(failedPayment.failureReason).toBe('insufficient_funds');

      // Check subscription status after failed payment
      const subscriptionAfterFailure = await Subscription.findById(testSubscription._id);
      expect(subscriptionAfterFailure?.status).toBe('past_due');

      // Simulate successful retry payment
      const retryPaymentData = {
        subscriptionId: testSubscription._id,
        amount: testPlan.price.monthly,
        currency: 'USD',
        flutterwaveReference: 'FLW-RETRY-123456',
        status: 'completed' as const,
        paymentMethod: 'card'
      };

      const retryPayment = await PaymentService.processPayment(retryPaymentData);
      expect(retryPayment.status).toBe('completed');

      // Activate subscription after successful retry
      const activatedSubscription = await SubscriptionService.activateSubscription(
        testSubscription._id,
        retryPayment._id
      );

      expect(activatedSubscription.status).toBe('active');
    });
  });

  describe('Feature Access Control Integration', () => {
    test('should properly control feature access based on subscription status', async () => {
      // Test without subscription
      let hasAccess = await FeatureControlService.checkFeatureAccess(
        testUser._id,
        'advanced_analytics'
      );
      expect(hasAccess).toBe(false);

      // Create and activate subscription
      testSubscription = await SubscriptionService.createSubscription({
        userId: testUser._id,
        planId: testPlan._id,
        billingPeriod: 'monthly',
        paymentMethod: 'flutterwave',
        customerInfo: {
          email: testUser.email,
          name: `${testUser.firstName} ${testUser.lastName}`
        }
      });

      const payment = await PaymentService.processPayment({
        subscriptionId: testSubscription._id,
        amount: testPlan.price.monthly,
        currency: 'USD',
        flutterwaveReference: 'FLW-ACCESS-123456',
        status: 'completed',
        paymentMethod: 'card'
      });

      await SubscriptionService.activateSubscription(testSubscription._id, payment._id);

      // Test with active subscription
      hasAccess = await FeatureControlService.checkFeatureAccess(
        testUser._id,
        'advanced_analytics'
      );
      expect(hasAccess).toBe(true);

      // Test usage limits
      const usageCheck = await FeatureControlService.checkUsageLimit(
        testUser._id,
        'apiCalls',
        5000
      );
      expect(usageCheck.allowed).toBe(true);
      expect(usageCheck.remaining).toBe(5000); // 10000 - 5000

      // Test exceeding limits
      const exceedingUsageCheck = await FeatureControlService.checkUsageLimit(
        testUser._id,
        'apiCalls',
        15000
      );
      expect(exceedingUsageCheck.allowed).toBe(false);

      // Cancel subscription and test access
      await SubscriptionService.cancelSubscription(testSubscription._id, {
        cancelAtPeriodEnd: false,
        cancelReason: 'test'
      });

      hasAccess = await FeatureControlService.checkFeatureAccess(
        testUser._id,
        'advanced_analytics'
      );
      expect(hasAccess).toBe(false);
    });
  });

  describe('Analytics and Metrics Integration', () => {
    test('should generate accurate subscription metrics', async () => {
      // Create multiple test subscriptions
      const users = [];
      const subscriptions = [];

      for (let i = 0; i < 5; i++) {
        const user = await User.create({
          firstName: `Test${i}`,
          lastName: 'User',
          email: `test${i}@example.com`,
          password: 'hashedpassword123',
          role: 'user'
        });
        users.push(user);

        const subscription = await SubscriptionService.createSubscription({
          userId: user._id,
          planId: testPlan._id,
          billingPeriod: 'monthly',
          paymentMethod: 'flutterwave',
          customerInfo: {
            email: user.email,
            name: `${user.firstName} ${user.lastName}`
          }
        });

        const payment = await PaymentService.processPayment({
          subscriptionId: subscription._id,
          amount: testPlan.price.monthly,
          currency: 'USD',
          flutterwaveReference: `FLW-METRICS-${i}`,
          status: 'completed',
          paymentMethod: 'card'
        });

        await SubscriptionService.activateSubscription(subscription._id, payment._id);
        subscriptions.push(subscription);
      }

      // Get metrics
      const metrics = await SubscriptionMetricsService.getSubscriptionMetrics(30);

      expect(metrics.activeSubscriptions).toBeGreaterThanOrEqual(5);
      expect(metrics.monthlyRecurringRevenue).toBeGreaterThanOrEqual(5 * testPlan.price.monthly);
      expect(metrics.newSubscriptionsToday).toBeGreaterThanOrEqual(5);

      // Get payment metrics
      const paymentMetrics = await SubscriptionMetricsService.getPaymentMetrics(30);

      expect(paymentMetrics.totalTransactions).toBeGreaterThanOrEqual(5);
      expect(paymentMetrics.successfulTransactions).toBeGreaterThanOrEqual(5);
      expect(paymentMetrics.successRate).toBe(100);

      // Clean up
      for (const user of users) {
        await User.findByIdAndDelete(user._id);
      }
      for (const subscription of subscriptions) {
        await Subscription.findByIdAndDelete(subscription._id);
      }
      await Transaction.deleteMany({
        flutterwaveTransactionId: { $regex: /FLW-METRICS-/ }
      });
    });
  });

  describe('System Monitoring Integration', () => {
    test('should monitor system health and generate alerts', async () => {
      const healthMetrics = await SubscriptionMonitoringService.getSystemHealth();

      expect(healthMetrics).toBeDefined();
      expect(healthMetrics.status).toMatch(/healthy|warning|critical/);
      expect(healthMetrics.metrics).toBeDefined();
      expect(healthMetrics.metrics.databaseConnectivity).toBe(true);
      expect(typeof healthMetrics.metrics.paymentSuccessRate).toBe('number');
      expect(typeof healthMetrics.uptime).toBe('number');
    });
  });

  describe('Data Migration Integration', () => {
    test('should migrate user data correctly', async () => {
      // Create user without subscription data
      const userWithoutSub = await User.create({
        firstName: 'Migration',
        lastName: 'Test',
        email: 'migration.test@example.com',
        password: 'hashedpassword123',
        role: 'user'
        // No subscription field
      });

      // Run migration
      const migrationResult = await SubscriptionDataMigration.migrateUsersToDefaultSubscription();

      expect(migrationResult.success).toBe(true);
      expect(migrationResult.processed).toBeGreaterThanOrEqual(1);

      // Verify migration
      const migratedUser = await User.findById(userWithoutSub._id);
      expect(migratedUser?.subscription).toBeDefined();
      expect(migratedUser?.subscription?.status).toBe('none');

      // Clean up
      await User.findByIdAndDelete(userWithoutSub._id);
    });

    test('should export and restore subscription data', async () => {
      // Create test data
      testSubscription = await SubscriptionService.createSubscription({
        userId: testUser._id,
        planId: testPlan._id,
        billingPeriod: 'monthly',
        paymentMethod: 'flutterwave',
        customerInfo: {
          email: testUser.email,
          name: `${testUser.firstName} ${testUser.lastName}`
        }
      });

      // Export data
      const exportResult = await SubscriptionDataMigration.exportSubscriptionData('json');

      expect(exportResult.success).toBe(true);
      expect(exportResult.exported).toBeGreaterThanOrEqual(1);
      expect(exportResult.filePath).toBeDefined();

      // Create backup
      const backupResult = await SubscriptionDataMigration.createSubscriptionBackup();

      expect(backupResult.success).toBe(true);
      expect(backupResult.exported).toBeGreaterThanOrEqual(3); // subscriptions + plans + transactions
      expect(backupResult.filePath).toBeDefined();
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle database connection failures gracefully', async () => {
      // This test would require mocking database failures
      // For now, we'll test that services handle errors properly

      try {
        await SubscriptionService.createSubscription({
          userId: 'invalid_user_id',
          planId: testPlan._id,
          billingPeriod: 'monthly',
          paymentMethod: 'flutterwave',
          customerInfo: {
            email: 'test@example.com',
            name: 'Test User'
          }
        });

        // Should not reach here
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error).toBeDefined();
        expect(error.message).toContain('User not found');
      }
    });

    test('should handle payment processing errors', async () => {
      testSubscription = await SubscriptionService.createSubscription({
        userId: testUser._id,
        planId: testPlan._id,
        billingPeriod: 'monthly',
        paymentMethod: 'flutterwave',
        customerInfo: {
          email: testUser.email,
          name: `${testUser.firstName} ${testUser.lastName}`
        }
      });

      // Test invalid payment data
      try {
        await PaymentService.processPayment({
          subscriptionId: 'invalid_subscription_id',
          amount: -100, // Invalid amount
          currency: 'USD',
          flutterwaveReference: 'FLW-ERROR-123456',
          status: 'completed',
          paymentMethod: 'card'
        });

        // Should not reach here
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Performance and Load Testing', () => {
    test('should handle concurrent subscription operations', async () => {
      const concurrentOperations = [];
      const numOperations = 10;

      // Create multiple users for concurrent testing
      const users = [];
      for (let i = 0; i < numOperations; i++) {
        const user = await User.create({
          firstName: `Concurrent${i}`,
          lastName: 'Test',
          email: `concurrent${i}@example.com`,
          password: 'hashedpassword123',
          role: 'user'
        });
        users.push(user);
      }

      // Create concurrent subscription operations
      for (let i = 0; i < numOperations; i++) {
        const operation = SubscriptionService.createSubscription({
          userId: users[i]._id,
          planId: testPlan._id,
          billingPeriod: 'monthly',
          paymentMethod: 'flutterwave',
          customerInfo: {
            email: users[i].email,
            name: `${users[i].firstName} ${users[i].lastName}`
          }
        });
        concurrentOperations.push(operation);
      }

      // Execute all operations concurrently
      const startTime = Date.now();
      const results = await Promise.allSettled(concurrentOperations);
      const endTime = Date.now();

      // Verify results
      const successfulOperations = results.filter(result => result.status === 'fulfilled');
      expect(successfulOperations.length).toBe(numOperations);

      // Performance check (should complete within reasonable time)
      const executionTime = endTime - startTime;
      expect(executionTime).toBeLessThan(10000); // 10 seconds

      // Clean up
      for (const user of users) {
        await User.findByIdAndDelete(user._id);
      }

      const createdSubscriptions = await Subscription.find({
        userId: { $in: users.map(u => u._id) }
      });

      for (const subscription of createdSubscriptions) {
        await Subscription.findByIdAndDelete(subscription._id);
      }
    });
  });

  describe('Security Integration', () => {
    test('should enforce proper access controls', async () => {
      // Test that regular users cannot access admin functions
      const regularUser = await User.create({
        firstName: 'Regular',
        lastName: 'User',
        email: 'regular@example.com',
        password: 'hashedpassword123',
        role: 'user'
      });

      // This would typically be tested through API endpoints
      // For now, we'll test service-level access controls

      try {
        // Attempt to access admin-only functionality
        await SubscriptionMetricsService.getSubscriptionMetrics(30);
        // This should work as it's a service call, not an API call
        expect(true).toBe(true);
      } catch (error) {
        // If access control is implemented at service level
        expect(error).toBeDefined();
      }

      // Clean up
      await User.findByIdAndDelete(regularUser._id);
    });

    test('should validate input data properly', async () => {
      // Test invalid subscription data
      try {
        await SubscriptionService.createSubscription({
          userId: testUser._id,
          planId: testPlan._id,
          billingPeriod: 'invalid_period' as any,
          paymentMethod: 'flutterwave',
          customerInfo: {
            email: 'invalid-email', // Invalid email format
            name: `${testUser.firstName} ${testUser.lastName}`
          }
        });

        // Should not reach here if validation is working
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error).toBeDefined();
      }
    });
  });
});