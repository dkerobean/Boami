import { FlutterwaveService } from '@/lib/services/FlutterwaveService';
import { PaymentService } from '@/lib/services/PaymentService';
import { SubscriptionService } from '@/lib/services/SubscriptionService';
import { connectToDatabase } from '@/lib/database/connection';
import { User, Plan, Subscription, Transaction } from '@/lib/database/models';
import mongoose from 'mongoose';

// Mock external services for integration testing
jest.mock('@/lib/services/FlutterwaveService');

describe('Flutterwave Payment Flow Integration', () => {
  let testUser: any;
  let testPlan: any;

  beforeAll(async () => {
    // Connect to test database
    await connectToDatabase();
  });

  beforeEach(async () => {
    // Clean up test data
    await User.deleteMany({ email: /test.*@example\.com/ });
    await Plan.deleteMany({ name: /Test.*Plan/ });
    await Subscription.deleteMany({});
    await Transaction.deleteMany({});

    // Create test user
    testUser = new User({
      email: 'test-payment@example.com',
      firstName: 'Test',
      lastName: 'User',
      password: 'password123',
      isEmailVerified: true
    });
    await testUser.save();

    // Create test plan
    testPlan = new Plan({
      name: 'Test Premium Plan',
      description: 'Test plan for integration testing',
      price: {
        monthly: 29.99,
        annual: 299.99,
        currency: 'USD'
      },
      features: ['Test Feature 1', 'Test Feature 2'],
      isActive: true
    });
    await testPlan.save();
  });

  afterAll(async () => {
    // Clean up and close connection
    await User.deleteMany({ email: /test.*@example\.com/ });
    await Plan.deleteMany({ name: /Test.*Plan/ });
    await Subscription.deleteMany({});
    await Transaction.deleteMany({});
    await mongoose.connection.close();
  });

  describe('Complete Payment Flow', () => {
    it('should complete full subscription payment flow', async () => {
      // Mock Flutterwave responses
      const mockInitializeResponse = {
        success: true,
        data: {
          link: 'https://checkout.flutterwave.com/pay/test123',
          reference: 'FLW_REF_TEST_123'
        }
      };

      const mockVerifyResponse = {
        success: true,
        data: {
          id: 'flw_txn_123',
          tx_ref: 'FLW_REF_TEST_123',
          status: 'successful',
          amount: 29.99,
          currency: 'USD',
          customer: {
            email: 'test-payment@example.com',
            name: 'Test User',
            phone_number: '+1234567890'
          },
          meta: {
            userId: testUser._id.toString(),
            planId: testPlan._id.toString(),
            billingPeriod: 'monthly'
          }
        }
      };

      (FlutterwaveService.initializePayment as jest.Mock).mockResolvedValue(mockInitializeResponse);
      (FlutterwaveService.verifyPayment as jest.Mock).mockResolvedValue(mockVerifyResponse);

      // Step 1: Initialize payment
      const paymentData = {
        amount: 29.99,
        currency: 'USD',
        email: testUser.email,
        name: `${testUser.firstName} ${testUser.lastName}`,
        phone: '+1234567890',
        metadata: {
          userId: testUser._id.toString(),
          planId: testPlan._id.toString(),
          billingPeriod: 'monthly'
        }
      };

      const initResult = await PaymentService.initializePayment(paymentData);
      expect(initResult.success).toBe(true);
      expect(initResult.paymentLink).toBe(mockInitializeResponse.data.link);

      // Step 2: Simulate payment completion and verification
      const verifyResult = await PaymentService.verifyPayment('flw_txn_123');
      expect(verifyResult.success).toBe(true);
      expect(verifyResult.transaction.status).toBe('successful');

      // Step 3: Create subscription after successful payment
      const subscriptionData = {
        userId: testUser._id.toString(),
        planId: testPlan._id.toString(),
        billingPeriod: 'monthly',
        transactionId: verifyResult.transaction.id
      };

      const subscriptionResult = await SubscriptionService.createSubscription(subscriptionData);
      expect(subscriptionResult.success).toBe(true);
      expect(subscriptionResult.subscription.status).toBe('active');

      // Step 4: Verify database state
      const createdSubscription = await Subscription.findById(subscriptionResult.subscription._id);
      expect(createdSubscription).toBeTruthy();
      expect(createdSubscription!.isActive).toBe(true);

      const createdTransaction = await Transaction.findOne({
        flutterwaveTransactionId: 'flw_txn_123'
      });
      expect(createdTransaction).toBeTruthy();
      expect(createdTransaction!.status).toBe('successful');
      expect(createdTransaction!.subscriptionId.toString()).toBe(createdSubscription!._id.toString());
    });

    it('should handle payment failure gracefully', async () => {
      // Mock failed payment verification
      const mockVerifyResponse = {
        success: true,
        data: {
          id: 'flw_txn_failed',
          tx_ref: 'FLW_REF_FAILED_123',
          status: 'failed',
          amount: 29.99,
          currency: 'USD',
          customer: {
            email: 'test-payment@example.com',
            name: 'Test User'
          },
          meta: {
            userId: testUser._id.toString(),
            planId: testPlan._id.toString()
          }
        }
      };

      (FlutterwaveService.verifyPayment as jest.Mock).mockResolvedValue(mockVerifyResponse);

      const verifyResult = await PaymentService.verifyPayment('flw_txn_failed');
      expect(verifyResult.success).toBe(false);
      expect(verifyResult.error).toContain('Payment failed');

      // Verify no subscription was created
      const subscriptions = await Subscription.find({ userId: testUser._id });
      expect(subscriptions).toHaveLength(0);

      // Verify transaction was still recorded for audit purposes
      const transaction = await Transaction.findOne({
        flutterwaveTransactionId: 'flw_txn_failed'
      });
      expect(transaction).toBeTruthy();
      expect(transaction!.status).toBe('failed');
    });

    it('should handle webhook payment processing', async () => {
      // Mock webhook payload
      const webhookPayload = {
        event: 'charge.completed',
        data: {
          id: 'flw_webhook_123',
          tx_ref: 'FLW_REF_WEBHOOK_123',
          status: 'successful',
          amount: 29.99,
          currency: 'USD',
          customer: {
            email: 'test-payment@example.com',
            name: 'Test User',
            phone_number: '+1234567890'
          },
          meta: {
            userId: testUser._id.toString(),
            planId: testPlan._id.toString(),
            billingPeriod: 'monthly'
          }
        }
      };

      // Process webhook (this would normally be done by webhook handler)
      const subscriptionData = {
        userId: webhookPayload.data.meta.userId,
        planId: webhookPayload.data.meta.planId,
        billingPeriod: webhookPayload.data.meta.billingPeriod
      };

      // Create transaction record
      const transaction = new Transaction({
        userId: webhookPayload.data.meta.userId,
        amount: webhookPayload.data.amount,
        currency: webhookPayload.data.currency,
        status: 'successful',
        type: 'subscription_payment',
        description: 'Subscription payment via webhook',
        flutterwaveTransactionId: webhookPayload.data.id,
        flutterwaveReference: webhookPayload.data.tx_ref,
        metadata: webhookPayload.data.meta,
        processedAt: new Date()
      });
      await transaction.save();

      // Create subscription
      const subscriptionResult = await SubscriptionService.createSubscription({
        ...subscriptionData,
        transactionId: transaction._id.toString()
      });

      expect(subscriptionResult.success).toBe(true);

      // Verify subscription is linked to transaction
      const createdSubscription = await Subscription.findById(subscriptionResult.subscription._id);
      const linkedTransaction = await Transaction.findById(transaction._id);

      expect(linkedTransaction!.subscriptionId.toString()).toBe(createdSubscription!._id.toString());
    });
  });

  describe('Subscription Lifecycle Integration', () => {
    let testSubscription: any;

    beforeEach(async () => {
      // Create a test subscription
      const subscriptionResult = await SubscriptionService.createSubscription({
        userId: testUser._id.toString(),
        planId: testPlan._id.toString(),
        billingPeriod: 'monthly'
      });
      testSubscription = subscriptionResult.subscription;
    });

    it('should handle subscription upgrade with prorated payment', async () => {
      // Create premium plan
      const premiumPlan = new Plan({
        name: 'Test Premium Plus Plan',
        description: 'Premium plus test plan',
        price: {
          monthly: 49.99,
          annual: 499.99,
          currency: 'USD'
        },
        features: ['Premium Feature 1', 'Premium Feature 2', 'Premium Feature 3'],
        isActive: true
      });
      await premiumPlan.save();

      // Mock prorated payment
      const mockProrationResponse = {
        success: true,
        data: {
          id: 'flw_proration_123',
          status: 'successful',
          amount: 20.00, // Prorated amount
          currency: 'USD'
        }
      };

      (FlutterwaveService.initializePayment as jest.Mock).mockResolvedValue({
        success: true,
        data: { link: 'https://checkout.flutterwave.com/pay/proration123' }
      });
      (FlutterwaveService.verifyPayment as jest.Mock).mockResolvedValue(mockProrationResponse);

      // Calculate proration
      const prorationResult = await SubscriptionService.calculateProration({
        currentPlanPrice: 29.99,
        newPlanPrice: 49.99,
        currentDate: new Date(),
        periodStart: testSubscription.currentPeriodStart,
        periodEnd: testSubscription.currentPeriodEnd,
        billingPeriod: 'monthly'
      });

      expect(prorationResult.success).toBe(true);
      expect(prorationResult.isUpgrade).toBe(true);

      // Update subscription
      const updateResult = await SubscriptionService.updateSubscription(testSubscription._id, {
        planId: premiumPlan._id.toString()
      });

      expect(updateResult.success).toBe(true);

      // Verify subscription was updated
      const updatedSubscription = await Subscription.findById(testSubscription._id);
      expect(updatedSubscription!.planId.toString()).toBe(premiumPlan._id.toString());
    });

    it('should handle subscription cancellation', async () => {
      const cancelResult = await SubscriptionService.cancelSubscription(testSubscription._id, {
        immediate: false,
        reason: 'User requested cancellation'
      });

      expect(cancelResult.success).toBe(true);

      // Verify subscription is marked for cancellation at period end
      const cancelledSubscription = await Subscription.findById(testSubscription._id);
      expect(cancelledSubscription!.cancelAtPeriodEnd).toBe(true);
      expect(cancelledSubscription!.status).toBe('active'); // Still active until period end
    });

    it('should handle immediate subscription cancellation', async () => {
      const cancelResult = await SubscriptionService.cancelSubscription(testSubscription._id, {
        immediate: true,
        reason: 'Immediate cancellation requested'
      });

      expect(cancelResult.success).toBe(true);

      // Verify subscription is immediately cancelled
      const cancelledSubscription = await Subscription.findById(testSubscription._id);
      expect(cancelledSubscription!.status).toBe('cancelled');
      expect(cancelledSubscription!.isActive).toBe(false);
      expect(cancelledSubscription!.cancelledAt).toBeTruthy();
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle Flutterwave service errors', async () => {
      // Mock service error
      (FlutterwaveService.initializePayment as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Flutterwave API error'
      });

      const paymentData = {
        amount: 29.99,
        currency: 'USD',
        email: testUser.email,
        name: `${testUser.firstName} ${testUser.lastName}`
      };

      const result = await PaymentService.initializePayment(paymentData);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Flutterwave API error');
    });

    it('should handle database errors gracefully', async () => {
      // Mock database error by using invalid ObjectId
      const result = await SubscriptionService.createSubscription({
        userId: 'invalid-id',
        planId: testPlan._id.toString(),
        billingPeriod: 'monthly'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should handle concurrent subscription creation', async () => {
      // Attempt to create multiple subscriptions simultaneously
      const promises = Array(3).fill(null).map(() =>
        SubscriptionService.createSubscription({
          userId: testUser._id.toString(),
          planId: testPlan._id.toString(),
          billingPeriod: 'monthly'
        })
      );

      const results = await Promise.all(promises);

      // Only one should succeed (assuming business logic prevents multiple active subscriptions)
      const successfulResults = results.filter(r => r.success);
      expect(successfulResults.length).toBeLessThanOrEqual(1);
    });
  });
});