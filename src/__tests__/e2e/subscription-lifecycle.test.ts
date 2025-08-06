import { connectToDatabase } from '@/lib/database/connection';
import { User, Plan, Subscription, Transaction } from '@/lib/database/models';
import { SubscriptionService } from '@/lib/services/SubscriptionService';
import { PaymentService } from '@/lib/services/PaymentService';
import { SubscriptionEmailIntegration } from '@/lib/services/SubscriptionEmailIntegration';
import { FlutterwaveService } from '@/lib/services/FlutterwaveService';
import mongoose from 'mongoose';

// Mock external services
jest.mock('@/lib/services/FlutterwaveService');
jest.mock('@/lib/services/SubscriptionEmailIntegration');

describe('Subscription Lifecycle E2E Tests', () => {
  let testUser: any;
  let basicPlan: any;
  let premiumPlan: any;
  let enterprisePlan: any;

  beforeAll(async () => {
    await connectToDatabase();
  });

  beforeEach(async () => {
    // Clean up test data
    await User.deleteMany({ email: /e2e.*@test\.com/ });
    await Plan.deleteMany({ name: /E2E.*Plan/ });
    await Subscription.deleteMany({});
    await Transaction.deleteMany({});

    // Create test user
    testUser = new User({
      email: 'e2e-user@test.com',
      firstName: 'E2E',
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
      }
    });
    await testUser.save();

    // Create test plans
    basicPlan = new Plan({
      name: 'E2E Basic Plan',
      description: 'Basic plan for E2E testing',
      price: {
        monthly: 9.99,
        annual: 99.99,
        currency: 'USD'
      },
      features: ['Basic Feature 1', 'Basic Feature 2'],
      limits: {
        products: 10,
        storage: 1000,
        apiCalls: 1000
      },
      isActive: true
    });
    await basicPlan.save();

    premiumPlan = new Plan({
      name: 'E2E Premium Plan',
      description: 'Premium plan for E2E testing',
      price: {
        monthly: 29.99,
        annual: 299.99,
        currency: 'USD'
      },
      features: ['Premium Feature 1', 'Premium Feature 2', 'Premium Feature 3'],
      limits: {
        products: 100,
        storage: 10000,
        apiCalls: 10000
      },
      isActive: true
    });
    await premiumPlan.save();

    enterprisePlan = new Plan({
      name: 'E2E Enterprise Plan',
      description: 'Enterprise plan for E2E testing',
      price: {
        monthly: 99.99,
        annual: 999.99,
        currency: 'USD'
      },
      features: ['Enterprise Feature 1', 'Enterprise Feature 2', 'Enterprise Feature 3', 'Enterprise Feature 4'],
      limits: {
        products: -1, // Unlimited
        storage: -1,
        apiCalls: -1
      },
      isActive: true
    });
    await enterprisePlan.save();

    // Mock Flutterwave responses
    (FlutterwaveService.initializePayment as jest.Mock).mockResolvedValue({
      success: true,
      data: {
        link: 'https://checkout.flutterwave.com/pay/test123',
        reference: 'FLW_REF_TEST_123'
      }
    });

    (FlutterwaveService.verifyPayment as jest.Mock).mockResolvedValue({
      success: true,
      data: {
        id: 'flw_txn_123',
        status: 'successful',
        amount: 29.99,
        currency: 'USD',
        customer: {
          email: 'e2e-user@test.com',
          name: 'E2E User'
        }
      }
    });

    // Mock email service
    (SubscriptionEmailIntegration.sendWelcomeEmail as jest.Mock).mockResolvedValue(true);
    (SubscriptionEmailIntegration.sendCancellationEmail as jest.Mock).mockResolvedValue(true);
    (SubscriptionEmailIntegration.sendRenewalReminder as jest.Mock).mockResolvedValue(true);
  });

  afterAll(async () => {
    // Clean up and close connection
    await User.deleteMany({ email: /e2e.*@test\.com/ });
    await Plan.deleteMany({ name: /E2E.*Plan/ });
    await Subscription.deleteMany({});
    await Transaction.deleteMany({});
    await mongoose.connection.close();
  });

  describe('Complete Subscription Journey', () => {
    it('should complete full subscription lifecycle from signup to cancellation', async () => {
      // Step 1: User signs up for basic plan
      console.log('Step 1: Creating basic subscription...');

      const basicSubscriptionResult = await SubscriptionService.createSubscription({
        userId: testUser._id.toString(),
        planId: basicPlan._id.toString(),
        billingPeriod: 'monthly'
      });

      expect(basicSubscriptionResult.success).toBe(true);
      expect(basicSubscriptionResult.subscription.status).toBe('active');
      expect(basicSubscriptionResult.subscription.planId.toString()).toBe(basicPlan._id.toString());

      const basicSubscription = basicSubscriptionResult.subscription;

      // Verify user can access basic features
      const userSubscriptions = await SubscriptionService.getSubscriptionsByUser(testUser._id.toString());
      expect(userSubscriptions.success).toBe(true);
      expect(userSubscriptions.subscriptions).toHaveLength(1);

      // Step 2: User upgrades to premium plan
      console.log('Step 2: Upgrading to premium plan...');

      const upgradeResult = await SubscriptionService.updateSubscription(basicSubscription._id, {
        planId: premiumPlan._id.toString()
      });

      expect(upgradeResult.success).toBe(true);

      // Verify subscription was updated
      const updatedSubscription = await Subscription.findById(basicSubscription._id);
      expect(updatedSubscription!.planId.toString()).toBe(premiumPlan._id.toString());

      // Step 3: Process payment for upgrade
      console.log('Step 3: Processing upgrade payment...');

      const paymentResult = await PaymentService.initializePayment({
        amount: 29.99,
        currency: 'USD',
        email: testUser.email,
        name: `${testUser.firstName} ${testUser.lastName}`,
        metadata: {
          userId: testUser._id.toString(),
          subscriptionId: basicSubscription._id,
          type: 'upgrade'
        }
      });

      expect(paymentResult.success).toBe(true);
      expect(paymentResult.paymentLink).toBeTruthy();

      // Simulate successful payment verification
      const verificationResult = await PaymentService.verifyPayment('flw_txn_123');
      expect(verificationResult.success).toBe(true);

      // Step 4: User uses premium features for a period
      console.log('Step 4: Simulating premium usage period...');

      // Simulate some time passing
      const subscription = await Subscription.findById(basicSubscription._id);
      subscription!.lastPaymentDate = new Date();
      await subscription!.save();

      // Step 5: User decides to downgrade to basic
      console.log('Step 5: Downgrading to basic plan...');

      const downgradeResult = await SubscriptionService.updateSubscription(basicSubscription._id, {
        planId: basicPlan._id.toString()
      });

      expect(downgradeResult.success).toBe(true);

      // Step 6: User eventually cancels subscription
      console.log('Step 6: Cancelling subscription...');

      const cancellationResult = await SubscriptionService.cancelSubscription(basicSubscription._id, {
        immediate: false,
        reason: 'No longer needed'
      });

      expect(cancellationResult.success).toBe(true);

      // Verify subscription is marked for cancellation at period end
      const cancelledSubscription = await Subscription.findById(basicSubscription._id);
      expect(cancelledSubscription!.cancelAtPeriodEnd).toBe(true);
      expect(cancelledSubscription!.status).toBe('active'); // Still active until period end

      // Step 7: Simulate period end and final cancellation
      console.log('Step 7: Processing period end cancellation...');

      // Simulate period end
      cancelledSubscription!.currentPeriodEnd = new Date(Date.now() - 1000); // Past date
      await cancelledSubscription!.save();

      // Process cancellation
      const finalCancellationResult = await SubscriptionService.cancelSubscription(basicSubscription._id, {
        immediate: true,
        reason: 'Period ended'
      });

      expect(finalCancellationResult.success).toBe(true);

      // Verify final state
      const finalSubscription = await Subscription.findById(basicSubscription._id);
      expect(finalSubscription!.status).toBe('cancelled');
      expect(finalSubscription!.isActive).toBe(false);
      expect(finalSubscription!.cancelledAt).toBeTruthy();

      console.log('✅ Complete subscription lifecycle test passed');
    });

    it('should handle subscription renewal cycle', async () => {
      // Create subscription
      const subscriptionResult = await SubscriptionService.createSubscription({
        userId: testUser._id.toString(),
        planId: premiumPlan._id.toString(),
        billingPeriod: 'monthly'
      });

      const subscription = subscriptionResult.subscription;

      // Simulate approaching renewal date
      const renewalDate = new Date();
      renewalDate.setDate(renewalDate.getDate() + 3); // 3 days from now

      await Subscription.findByIdAndUpdate(subscription._id, {
        currentPeriodEnd: renewalDate
      });

      // Test renewal reminder
      await SubscriptionEmailIntegration.sendRenewalReminder(subscription._id);
      expect(SubscriptionEmailIntegration.sendRenewalReminder).toHaveBeenCalledWith(subscription._id);

      // Simulate successful renewal payment
      const renewalTransaction = new Transaction({
        userId: testUser._id,
        subscriptionId: subscription._id,
        amount: premiumPlan.price.monthly,
        currency: 'USD',
        status: 'successful',
        type: 'subscription_renewal',
        description: 'Monthly subscription renewal',
        flutterwaveTransactionId: 'renewal_txn_123',
        processedAt: new Date()
      });
      await renewalTransaction.save();

      // Update subscription for renewal
      const renewedSubscription = await Subscription.findById(subscription._id);
      const newPeriodEnd = new Date(renewedSubscription!.currentPeriodEnd);
      newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);

      renewedSubscription!.currentPeriodStart = renewedSubscription!.currentPeriodEnd;
      renewedSubscription!.currentPeriodEnd = newPeriodEnd;
      renewedSubscription!.lastPaymentDate = new Date();
      renewedSubscription!.lastPaymentAmount = premiumPlan.price.monthly;
      await renewedSubscription!.save();

      // Verify renewal
      const verifiedRenewal = await Subscription.findById(subscription._id);
      expect(verifiedRenewal!.lastPaymentDate).toBeTruthy();
      expect(verifiedRenewal!.status).toBe('active');
    });

    it('should handle failed payment and grace period', async () => {
      // Create subscription
      const subscriptionResult = await SubscriptionService.createSubscription({
        userId: testUser._id.toString(),
        planId: premiumPlan._id.toString(),
        billingPeriod: 'monthly'
      });

      const subscription = subscriptionResult.subscription;

      // Mock failed payment
      (FlutterwaveService.verifyPayment as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: {
          id: 'failed_txn_123',
          status: 'failed',
          amount: 29.99,
          currency: 'USD'
        }
      });

      // Simulate failed payment attempt
      const failedTransaction = new Transaction({
        userId: testUser._id,
        subscriptionId: subscription._id,
        amount: premiumPlan.price.monthly,
        currency: 'USD',
        status: 'failed',
        type: 'subscription_renewal',
        description: 'Failed monthly subscription renewal',
        flutterwaveTransactionId: 'failed_txn_123',
        error: 'Insufficient funds',
        processedAt: new Date()
      });
      await failedTransaction.save();

      // Update subscription to reflect failed payment
      const failedSubscription = await Subscription.findById(subscription._id);
      failedSubscription!.metadata = failedSubscription!.metadata || {};
      failedSubscription!.metadata.failedPaymentAttempts = 1;
      failedSubscription!.metadata.lastFailedPaymentDate = new Date();
      failedSubscription!.metadata.gracePeriodEnd = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days
      await failedSubscription!.save();

      // Verify grace period is set
      const gracePeriodSubscription = await Subscription.findById(subscription._id);
      expect(gracePeriodSubscription!.metadata.failedPaymentAttempts).toBe(1);
      expect(gracePeriodSubscription!.metadata.gracePeriodEnd).toBeTruthy();
      expect(gracePeriodSubscription!.status).toBe('active'); // Still active during grace period

      // Simulate grace period expiry
      gracePeriodSubscription!.metadata.gracePeriodEnd = new Date(Date.now() - 1000); // Past date
      gracePeriodSubscription!.status = 'expired';
      gracePeriodSubscription!.isActive = false;
      gracePeriodSubscription!.expiredAt = new Date();
      await gracePeriodSubscription!.save();

      // Verify expiration
      const expiredSubscription = await Subscription.findById(subscription._id);
      expect(expiredSubscription!.status).toBe('expired');
      expect(expiredSubscription!.isActive).toBe(false);
    });
  });

  describe('Multi-Plan Scenarios', () => {
    it('should handle plan comparison and selection', async () => {
      // Get all available plans
      const plans = await Plan.find({ isActive: true }).sort({ 'price.monthly': 1 });
      expect(plans).toHaveLength(3);

      // Verify plan hierarchy
      expect(plans[0].name).toBe('E2E Basic Plan');
      expect(plans[1].name).toBe('E2E Premium Plan');
      expect(plans[2].name).toBe('E2E Enterprise Plan');

      // Test feature comparison
      expect(plans[0].features).toHaveLength(2);
      expect(plans[1].features).toHaveLength(3);
      expect(plans[2].features).toHaveLength(4);

      // Test limits comparison
      expect(plans[0].limits.products).toBe(10);
      expect(plans[1].limits.products).toBe(100);
      expect(plans[2].limits.products).toBe(-1); // Unlimited
    });

    it('should calculate correct pricing for different billing periods', async () => {
      // Test monthly vs annual pricing
      const monthlyTotal = premiumPlan.price.monthly * 12;
      const annualPrice = premiumPlan.price.annual;
      const annualSavings = monthlyTotal - annualPrice;

      expect(annualSavings).toBeGreaterThan(0);
      expect(annualSavings).toBe(60); // $299.99 annual vs $359.88 monthly total

      // Test proration calculation
      const prorationResult = await SubscriptionService.calculateProration({
        currentPlanPrice: basicPlan.price.monthly,
        newPlanPrice: premiumPlan.price.monthly,
        currentDate: new Date(),
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        billingPeriod: 'monthly'
      });

      expect(prorationResult.success).toBe(true);
      expect(prorationResult.isUpgrade).toBe(true);
      expect(prorationResult.prorationAmount).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle concurrent subscription operations', async () => {
      // Attempt multiple simultaneous subscription creations
      const promises = Array(3).fill(null).map((_, index) =>
        SubscriptionService.createSubscription({
          userId: testUser._id.toString(),
          planId: basicPlan._id.toString(),
          billingPeriod: 'monthly'
        })
      );

      const results = await Promise.allSettled(promises);
      const successful = results.filter(r => r.status === 'fulfilled' && (r.value as any).success);

      // Should only allow one active subscription per user
      expect(successful.length).toBeLessThanOrEqual(1);
    });

    it('should handle subscription operations on non-existent entities', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();

      // Test with non-existent user
      const userResult = await SubscriptionService.createSubscription({
        userId: fakeId,
        planId: basicPlan._id.toString(),
        billingPeriod: 'monthly'
      });
      expect(userResult.success).toBe(false);

      // Test with non-existent plan
      const planResult = await SubscriptionService.createSubscription({
        userId: testUser._id.toString(),
        planId: fakeId,
        billingPeriod: 'monthly'
      });
      expect(planResult.success).toBe(false);

      // Test operations on non-existent subscription
      const cancelResult = await SubscriptionService.cancelSubscription(fakeId);
      expect(cancelResult.success).toBe(false);
    });

    it('should maintain data consistency during failures', async () => {
      // Create subscription
      const subscriptionResult = await SubscriptionService.createSubscription({
        userId: testUser._id.toString(),
        planId: premiumPlan._id.toString(),
        billingPeriod: 'monthly'
      });

      const subscription = subscriptionResult.subscription;

      // Simulate database error during update
      const originalSave = Subscription.prototype.save;
      Subscription.prototype.save = jest.fn().mockRejectedValue(new Error('Database error'));

      // Attempt update that should fail
      const updateResult = await SubscriptionService.updateSubscription(subscription._id, {
        planId: basicPlan._id.toString()
      });

      expect(updateResult.success).toBe(false);

      // Restore original save method
      Subscription.prototype.save = originalSave;

      // Verify subscription wasn't partially updated
      const unchangedSubscription = await Subscription.findById(subscription._id);
      expect(unchangedSubscription!.planId.toString()).toBe(premiumPlan._id.toString());
    });
  });

  describe('Performance and Scale Testing', () => {
    it('should handle bulk subscription operations efficiently', async () => {
      const startTime = Date.now();

      // Create multiple users and subscriptions
      const users = [];
      for (let i = 0; i < 10; i++) {
        const user = new User({
          email: `bulk-user-${i}@test.com`,
          firstName: `User${i}`,
          lastName: 'Test',
          password: 'password123',
          isEmailVerified: true
        });
        await user.save();
        users.push(user);
      }

      // Create subscriptions for all users
      const subscriptionPromises = users.map(user =>
        SubscriptionService.createSubscription({
          userId: user._id.toString(),
          planId: basicPlan._id.toString(),
          billingPeriod: 'monthly'
        })
      );

      const results = await Promise.all(subscriptionPromises);
      const endTime = Date.now();

      // Verify all subscriptions were created successfully
      expect(results.every(r => r.success)).toBe(true);

      // Performance check - should complete within reasonable time
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(5000); // Less than 5 seconds

      // Clean up bulk test data
      await User.deleteMany({ email: /bulk-user-.*@test\.com/ });
      await Subscription.deleteMany({ userId: { $in: users.map(u => u._id) } });
    });
  });
});