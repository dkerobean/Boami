import { SubscriptionService } from '@/lib/services/SubscriptionService';
import { connectToDatabase } from '@/lib/database/connection';
import { User, Subscription, Plan, Transaction } from '@/lib/database/models';
import mongoose from 'mongoose';

// Mock the database connection
jest.mock('@/lib/database/connection');
jest.mock('@/lib/database/models');

describe('SubscriptionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('createSubscription', () => {
    it('should create a new subscription successfully', async () => {
      // Mock data
      const mockUser = {
        _id: 'user123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe'
      };

      const mockPlan = {
        _id: 'plan123',
        name: 'Premium Plan',
        price: { monthly: 29.99, annual: 299.99, currency: 'USD' },
        features: ['feature1', 'feature2']
      };

      const mockSubscription = {
        _id: 'sub123',
        userId: 'user123',
        planId: 'plan123',
        status: 'active',
        isActive: true,
        billingPeriod: 'monthly',
        save: jest.fn().mockResolvedValue(true)
      };

      // Mock database calls
      (User.findById as jest.Mock).mockResolvedValue(mockUser);
      (Plan.findById as jest.Mock).mockResolvedValue(mockPlan);
      (Subscription as any).mockImplementation(() => mockSubscription);

      const subscriptionData = {
        userId: 'user123',
        planId: 'plan123',
        billingPeriod: 'monthly'
      };

      const result = await SubscriptionService.createSubscription(subscriptionData);

      expect(result.success).toBe(true);
      expect(result.subscription).toBeDefined();
      expect(User.findById).toHaveBeenCalledWith('user123');
      expect(Plan.findById).toHaveBeenCalledWith('plan123');
    });

    it('should fail when user is not found', async () => {
      (User.findById as jest.Mock).mockResolvedValue(null);

      const subscriptionData = {
        userId: 'nonexistent',
        planId: 'plan123',
        billingPeriod: 'monthly'
      };

      const result = await SubscriptionService.createSubscription(subscriptionData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('User not found');
    });

    it('should fail when plan is not found', async () => {
      const mockUser = { _id: 'user123', email: 'test@example.com' };
      (User.findById as jest.Mock).mockResolvedValue(mockUser);
      (Plan.findById as jest.Mock).mockResolvedValue(null);

      const subscriptionData = {
        userId: 'user123',
        planId: 'nonexistent',
        billingPeriod: 'monthly'
      };

      const result = await SubscriptionService.createSubscription(subscriptionData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Plan not found');
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel subscription immediately', async () => {
      const mockSubscription = {
        _id: 'sub123',
        userId: 'user123',
        status: 'active',
        isActive: true,
        cancelledAt: null,
        save: jest.fn().mockResolvedValue(true)
      };

      (Subscription.findById as jest.Mock).mockResolvedValue(mockSubscription);

      const result = await SubscriptionService.cancelSubscription('sub123', {
        immediate: true,
        reason: 'User requested'
      });

      expect(result.success).toBe(true);
      expect(mockSubscription.status).toBe('cancelled');
      expect(mockSubscription.isActive).toBe(false);
      expect(mockSubscription.cancelledAt).toBeDefined();
      expect(mockSubscription.save).toHaveBeenCalled();
    });

    it('should schedule cancellation at period end', async () => {
      const mockSubscription = {
        _id: 'sub123',
        userId: 'user123',
        status: 'active',
        isActive: true,
        cancelAtPeriodEnd: false,
        save: jest.fn().mockResolvedValue(true)
      };

      (Subscription.findById as jest.Mock).mockResolvedValue(mockSubscription);

      const result = await SubscriptionService.cancelSubscription('sub123', {
        immediate: false,
        reason: 'User requested'
      });

      expect(result.success).toBe(true);
      expect(mockSubscription.cancelAtPeriodEnd).toBe(true);
      expect(mockSubscription.status).toBe('active'); // Should remain active until period end
      expect(mockSubscription.save).toHaveBeenCalled();
    });

    it('should fail when subscription is not found', async () => {
      (Subscription.findById as jest.Mock).mockResolvedValue(null);

      const result = await SubscriptionService.cancelSubscription('nonexistent');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Subscription not found');
    });
  });

  describe('updateSubscription', () => {
    it('should upgrade subscription plan', async () => {
      const mockSubscription = {
        _id: 'sub123',
        userId: 'user123',
        planId: 'basic-plan',
        status: 'active',
        save: jest.fn().mockResolvedValue(true)
      };

      const mockNewPlan = {
        _id: 'premium-plan',
        name: 'Premium Plan',
        price: { monthly: 49.99, currency: 'USD' }
      };

      (Subscription.findById as jest.Mock).mockResolvedValue(mockSubscription);
      (Plan.findById as jest.Mock).mockResolvedValue(mockNewPlan);

      const result = await SubscriptionService.updateSubscription('sub123', {
        planId: 'premium-plan'
      });

      expect(result.success).toBe(true);
      expect(mockSubscription.planId).toBe('premium-plan');
      expect(mockSubscription.save).toHaveBeenCalled();
    });

    it('should change billing period', async () => {
      const mockSubscription = {
        _id: 'sub123',
        userId: 'user123',
        billingPeriod: 'monthly',
        save: jest.fn().mockResolvedValue(true)
      };

      (Subscription.findById as jest.Mock).mockResolvedValue(mockSubscription);

      const result = await SubscriptionService.updateSubscription('sub123', {
        billingPeriod: 'annual'
      });

      expect(result.success).toBe(true);
      expect(mockSubscription.billingPeriod).toBe('annual');
      expect(mockSubscription.save).toHaveBeenCalled();
    });
  });

  describe('getSubscriptionsByUser', () => {
    it('should return user subscriptions', async () => {
      const mockSubscriptions = [
        {
          _id: 'sub1',
          userId: 'user123',
          status: 'active',
          planId: { name: 'Premium Plan' }
        },
        {
          _id: 'sub2',
          userId: 'user123',
          status: 'cancelled',
          planId: { name: 'Basic Plan' }
        }
      ];

      (Subscription.find as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue(mockSubscriptions)
        })
      });

      const result = await SubscriptionService.getSubscriptionsByUser('user123');

      expect(result.success).toBe(true);
      expect(result.subscriptions).toHaveLength(2);
      expect(Subscription.find).toHaveBeenCalledWith({ userId: 'user123' });
    });

    it('should return empty array for user with no subscriptions', async () => {
      (Subscription.find as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue([])
        })
      });

      const result = await SubscriptionService.getSubscriptionsByUser('user123');

      expect(result.success).toBe(true);
      expect(result.subscriptions).toHaveLength(0);
    });
  });

  describe('getActiveSubscription', () => {
    it('should return active subscription for user', async () => {
      const mockSubscription = {
        _id: 'sub123',
        userId: 'user123',
        status: 'active',
        isActive: true
      };

      (Subscription.findOne as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockSubscription)
      });

      const result = await SubscriptionService.getActiveSubscription('user123');

      expect(result.success).toBe(true);
      expect(result.subscription).toBeDefined();
      expect(Subscription.findOne).toHaveBeenCalledWith({
        userId: 'user123',
        isActive: true
      });
    });

    it('should return null when no active subscription exists', async () => {
      (Subscription.findOne as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue(null)
      });

      const result = await SubscriptionService.getActiveSubscription('user123');

      expect(result.success).toBe(true);
      expect(result.subscription).toBeNull();
    });
  });

  describe('calculateProration', () => {
    it('should calculate prorated amount for upgrade', async () => {
      const currentDate = new Date('2024-01-15');
      const periodStart = new Date('2024-01-01');
      const periodEnd = new Date('2024-02-01');

      const result = await SubscriptionService.calculateProration({
        currentPlanPrice: 29.99,
        newPlanPrice: 49.99,
        currentDate,
        periodStart,
        periodEnd,
        billingPeriod: 'monthly'
      });

      expect(result.success).toBe(true);
      expect(result.prorationAmount).toBeGreaterThan(0);
      expect(result.isUpgrade).toBe(true);
    });

    it('should calculate prorated refund for downgrade', async () => {
      const currentDate = new Date('2024-01-15');
      const periodStart = new Date('2024-01-01');
      const periodEnd = new Date('2024-02-01');

      const result = await SubscriptionService.calculateProration({
        currentPlanPrice: 49.99,
        newPlanPrice: 29.99,
        currentDate,
        periodStart,
        periodEnd,
        billingPeriod: 'monthly'
      });

      expect(result.success).toBe(true);
      expect(result.prorationAmount).toBeLessThan(0);
      expect(result.isUpgrade).toBe(false);
    });
  });
});