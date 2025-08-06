import { connectToDatabase } from '@/lib/database/connection';
import { User, Plan, Subscription } from '@/lib/database/models';
import { SubscriptionService } from '@/lib/services/SubscriptionService';
import { FeatureControlService } from '@/lib/services/FeatureControlService';
import mongoose from 'mongoose';

describe('Subscription System Performance Tests', () => {
  let testUsers: any[] = [];
  let testPlans: any[] = [];
  let testSubscriptions: any[] = [];

  beforeAll(async () => {
    await connectToDatabase();

    // Create test plans
    const planData = [
      {
        name: 'Perf Basic Plan',
        price: { monthly: 9.99, annual: 99.99, currency: 'USD' },
        features: ['basic_feature_1', 'basic_feature_2'],
        limits: { products: 10, storage: 1000 }
      },
      {
        name: 'Perf Premium Plan',
        price: { monthly: 29.99, annual: 299.99, currency: 'USD' },
        features: ['basic_feature_1', 'basic_feature_2', 'premium_feate_1', 'premium_feature_2'],
        limits: { products: 100, storage: 10000 }
      },
      {
        name: 'Perf Enterprise Plan',
        price: { monthly: 99.99, annual: 999.99, currency: 'USD' },
        features: ['basic_feature_1', 'basic_feature_2', 'premium_feature_1', 'premium_feature_2', 'enterprise_feature_1'],
        limits: { products: -1, storage: -1 }
      }
    ];

    for (const plan of planData) {
      const createdPlan = new Plan({ ...plan, isActive: true });
      await createdPlan.save();
      testPlans.push(createdPlan);
    }

    // Create test users with subscriptions
    for (let i = 0; i < 100; i++) {
      const user = new User({
        email: `perf-user-${i}@test.com`,
        firstName: `PerfUser${i}`,
        lastName: 'Test',
        password: 'password123',
        isEmailVerified: true
      });
      await user.save();
      testUsers.push(user);

      // Create subscription for every other user
      if (i % 2 === 0) {
        const planIndex = i % testPlans.length;
        const subscription = new Subscription({
          userId: user._id,
          planId: testPlans[planIndex]._id,
          status: 'active',
          isActive: true,
          billingPeriod: 'monthly',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        });
        await subscription.save();
        testSubscriptions.push(subscription);
      }
    }
  });

  afterAll(async () => {
    // Clean up test data
    await User.deleteMany({ email: /perf-user-.*@test\.com/ });
    await Plan.deleteMany({ name: /Perf.*Plan/ });
    await Subscription.deleteMany({ userId: { $in: testUsers.map(u => u._id) } });
    await mongoose.connection.close();
  });

  describe('Subscription Status Checking Performance', () => {
    it('should check subscription status efficiently for single user', async () => {
      const user = testUsers[0];
      const iterations = 100;

      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        await SubscriptionService.getActiveSubscription(user._id.toString());
      }

      const endTime = Date.now();
      const duration = endTime - startTime;
      const avgTime = duration / iterations;

      console.log(`Single user subscription check: ${avgTime.toFixed(2)}ms average`);
      expect(avgTime).toBeLessThan(50); // Should be under 50ms per check
    });

    it('should handle bulk subscription status checks efficiently', async () => {
      const userIds = testUsers.slice(0, 50).map(u => u._id.toString());

      const startTime = Date.now();

      const promises = userIds.map(userId =>
        SubscriptionService.getActiveSubscription(userId)
      );

      const results = await Promise.all(promises);

      const endTime = Date.now();
      const duration = endTime - startTime;
      const avgTime = duration / userIds.length;

      console.log(`Bulk subscription check (${userIds.length} users): ${avgTime.toFixed(2)}ms average per user`);
      expect(avgTime).toBeLessThan(100); // Should be under 100ms per user in bulk
      expect(results.every(r => r.success)).toBe(true);
    });

    it('should efficiently query subscriptions with complex filters', async () => {
      const startTime = Date.now();

      // Complex query with multiple filters
      const subscriptions = await Subscription.find({
        status: 'active',
        isActive: true,
        currentPeriodEnd: { $gt: new Date() },
        billingPeriod: 'monthly'
      })
      .populate('userId', 'firstName lastName email')
      .populate('planId', 'name price features')
      .sort({ createdAt: -1 })
      .limit(20);

      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`Complex subscription query: ${duration}ms`);
      expect(duration).toBeLessThan(500); // Should complete within 500ms
      expect(subscriptions.length).toBeGreaterThan(0);
    });
  });

  describe('Feature Access Control Performance', () => {
    it('should check feature access efficiently', async () => {
      const userWithSubscription = testUsers.find(u =>
        testSubscriptions.some(s => s.userId.toString() === u._id.toString())
      );

      const features = ['basic_feature_1', 'premium_feature_1', 'enterprise_feature_1'];
      const iterations = 50;

      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        for (const feature of features) {
          await FeatureControlService.hasFeatureAccess(
            userWithSubscription._id.toString(),
            feature
          );
        }
      }

      const endTime = Date.now();
      const duration = endTime - startTime;
      const totalChecks = iterations * features.length;
      const avgTime = duration / totalChecks;

      console.log(`Feature access check: ${avgTime.toFixed(2)}ms average per check`);
      expect(avgTime).toBeLessThan(30); // Should be under 30ms per check
    });

    it('should handle bulk feature access checks efficiently', async () => {
      const usersWithSubscriptions = testUsers.filter(u =>
        testSubscriptions.some(s => s.userId.toString() === u._id.toString())
      ).slice(0, 20);

      const feature = 'premium_feature_1';

      const startTime = Date.now();

      const promises = usersWithSubscriptions.map(user =>
        FeatureControlService.hasFeatureAccess(user._id.toString(), feature)
      );

      const results = await Promise.all(promises);

      const endTime = Date.now();
      const duration = endTime - startTime;
      const avgTime = duration / usersWithSubscriptions.length;

      console.log(`Bulk feature access check (${usersWithSubscriptions.length} users): ${avgTime.toFixed(2)}ms average per user`);
      expect(avgTime).toBeLessThan(50); // Should be under 50ms per user
      expect(results.every(r => typeof r.hasAccess === 'boolean')).toBe(true);
    });

    it('should efficiently validate multiple features for single user', async () => {
      const userWithSubscription = testUsers.find(u =>
        testSubscriptions.some(s => s.userId.toString() === u._id.toString())
      );

      const features = [
        'basic_feature_1',
        'basic_feature_2',
        'premium_feature_1',
        'premium_feature_2',
        'enterprise_feature_1'
      ];

      const startTime = Date.now();

      const results = await FeatureControlService.validateMultipleFeatures(
        userWithSubscription._id.toString(),
        features
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`Multiple feature validation (${features.length} features): ${duration}ms`);
      expect(duration).toBeLessThan(200); // Should complete within 200ms
      expect(Object.keys(results.features)).toHaveLength(features.length);
    });
  });

  describe('Database Query Optimization', () => {
    it('should use indexes effectively for subscription queries', async () => {
      // Test query that should use userId index
      const startTime1 = Date.now();
      await Subscription.find({ userId: testUsers[0]._id });
      const duration1 = Date.now() - startTime1;

      // Test query that should use status index
      const startTime2 = Date.now();
      await Subscription.find({ status: 'active' });
      const duration2 = Date.now() - startTime2;

      // Test compound query that should use multiple indexes
      const startTime3 = Date.now();
      await Subscription.find({
        userId: testUsers[0]._id,
        status: 'active',
        isActive: true
      });
      const duration3 = Date.now() - startTime3;

      console.log(`Index usage - userId: ${duration1}ms, status: ${duration2}ms, compound: ${duration3}ms`);

      // All queries should be fast due to proper indexing
      expect(duration1).toBeLessThan(50);
      expect(duration2).toBeLessThan(100);
      expect(duration3).toBeLessThan(50);
    });

    it('should handle pagination efficiently', async () => {
      const pageSize = 10;
      const pages = 5;

      const startTime = Date.now();

      for (let page = 0; page < pages; page++) {
        await Subscription.find({ status: 'active' })
          .populate('userId', 'firstName lastName')
          .populate('planId', 'name price')
          .sort({ createdAt: -1 })
          .limit(pageSize)
          .skip(page * pageSize);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;
      const avgTime = duration / pages;

      console.log(`Pagination performance: ${avgTime.toFixed(2)}ms average per page`);
      expect(avgTime).toBeLessThan(100); // Should be under 100ms per page
    });

    it('should aggregate subscription data efficiently', async () => {
      const startTime = Date.now();

      const aggregationResult = await Subscription.aggregate([
        {
          $match: { status: 'active' }
        },
        {
          $group: {
            _id: '$planId',
            count: { $sum: 1 },
            totalRevenue: { $sum: '$lastPaymentAmount' },
            avgRevenue: { $avg: '$lastPaymentAmount' }
          }
        },
        {
          $lookup: {
            from: 'plans',
            localField: '_id',
            foreignField: '_id',
            as: 'plan'
          }
        },
        {
          $unwind: '$plan'
        },
        {
          $project: {
            planName: '$plan.name',
            subscriptionCount: '$count',
            totalRevenue: 1,
            avgRevenue: 1
          }
        }
      ]);

      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`Aggregation query: ${duration}ms`);
      expect(duration).toBeLessThan(300); // Should complete within 300ms
      expect(aggregationResult).toBeInstanceOf(Array);
    });
  });

  describe('Memory Usage and Resource Management', () => {
    it('should handle large result sets without memory issues', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Query large dataset
      const subscriptions = await Subscription.find({})
        .populate('userId')
        .populate('planId')
        .lean(); // Use lean() for better memory efficiency

      const afterQueryMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = afterQueryMemory - initialMemory;

      console.log(`Memory usage for large query: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);

      // Memory increase should be reasonable
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB
      expect(subscriptions.length).toBeGreaterThan(0);
    });

    it('should efficiently stream large datasets', async () => {
      let processedCount = 0;
      const startTime = Date.now();

      const cursor = Subscription.find({ status: 'active' }).cursor();

      for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
        processedCount++;
        // Simulate processing
        await new Promise(resolve => setImmediate(resolve));
      }

      const endTime = Date.now();
      const duration = endTime - startTime;
      const avgTime = processedCount > 0 ? duration / processedCount : 0;

      console.log(`Streaming performance: ${avgTime.toFixed(2)}ms per document (${processedCount} docs)`);
      expect(avgTime).toBeLessThan(10); // Should process each document quickly
    });
  });

  describe('Concurrent Access Performance', () => {
    it('should handle concurrent subscription operations', async () => {
      const concurrentUsers = testUsers.slice(50, 60); // 10 users
      const startTime = Date.now();

      // Simulate concurrent subscription status checks
      const promises = concurrentUsers.map(async (user, index) => {
        // Mix of different operations
        if (index % 3 === 0) {
          return SubscriptionService.getActiveSubscription(user._id.toString());
        } else if (index % 3 === 1) {
          return SubscriptionService.getSubscriptionsByUser(user._id.toString());
        } else {
          return FeatureControlService.hasFeatureAccess(user._id.toString(), 'basic_feature_1');
        }
      });

      const results = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`Concurrent operations (${concurrentUsers.length} users): ${duration}ms total`);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
      expect(results.length).toBe(concurrentUsers.length);
    });

    it('should maintain performance under load', async () => {
      const iterations = 20;
      const concurrentRequests = 5;
      const durations: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();

        const promises = Array(concurrentRequests).fill(null).map(() =>
          SubscriptionService.getActiveSubscription(testUsers[i % testUsers.length]._id.toString())
        );

        await Promise.all(promises);

        const duration = Date.now() - startTime;
        durations.push(duration);
      }

      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      const maxDuration = Math.max(...durations);

      console.log(`Load test - Average: ${avgDuration.toFixed(2)}ms, Max: ${maxDuration}ms`);

      expect(avgDuration).toBeLessThan(200); // Average should be under 200ms
      expect(maxDuration).toBeLessThan(500); // Max should be under 500ms
    });
  });
});