import { Types } from 'mongoose';
import { Plan, Subscription, Transaction, User } from '../database/models';
import { FlutterwaveService } from './FlutterwaveService';
import {
  generateSubscriptionReference,
  calculateProratedAmount,
  getNextRenewalDate,
  validatePaymentAmount
} from '../utils/payment-utils';
import { connectDB } from '../database/mongoose-connection';

/**
 * Subscription creation data interface
 */
export interface CreateSubscriptionData {
  userId: string;
  planId: string;
  paymentMethod: 'monthly' | 'annual';
  customerData: {
    email: string;
    name: string;
    phone?: string;
  };
  metadata?: Record<string, any>;
}

/**
 * Subscription update data interface
 */
export interface UpdateSubscriptionData {
  planId: string;
  immediate?: boolean;
  metadata?: Record<string, any>;
}

/**
 * Subscription service class
 * Handles all subscription-related business logic
 */
export class SubscriptionService {
  private flutterwaveService: FlutterwaveService;

  constructor() {
    this.flutterwaveService = new FlutterwaveService();
  }

  /**
   * Create a new subscription
   * @param data - Subscription creation data
   * @returns Promise<{ subscription: any, paymentLink: string }> - Created subscription and payment link
   */
  async createSubscription(data: CreateSubscriptionData): Promise<{ subscription: any, paymentLink: string }> {
    await connectDB();

    try {
      // Validate user exists
      const user = await User.findById(data.userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Check if user already has an active subscription
      const existingSubscription = await Subscription.findByUserId(new Types.ObjectId(data.userId));
      if (existingSubscription && existingSubscription.isActive()) {
        throw new Error('User already has an active subscription');
      }

      // Validate plan exists
      const plan = await Plan.findById(data.planId);
      if (!plan || !plan.isActive) {
        throw new Error('Invalid or inactive plan');
      }

      // Calculate subscription period
      const now = new Date();
      const periodEnd = data.paymentMethod === 'annual'
        ? new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())
        : new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

      // Create pending subscription
      const subscription = new Subscription({
        userId: new Types.ObjectId(data.userId),
        planId: new Types.ObjectId(data.planId),
        status: 'pending',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
        metadata: {
          paymentMethod: data.paymentMethod,
          ...data.metadata
        }
      });

      await subscription.save();

      // Generate transaction reference
      const txRef = generateSubscriptionReference(data.userId, data.planId, 'subscription');

      // Get plan price based on payment method
      const amount = data.paymentMethod === 'annual' ? plan.price.annual : plan.price.monthly;

      // Initialize payment with Flutterwave
      const paymentData = {
        tx_ref: txRef,
        amount: amount,
        currency: plan.currency,
        customer: data.customerData,
        customizations: {
          title: `${plan.name} Subscription`,
          description: `${data.paymentMethod === 'annual' ? 'Annual' : 'Monthly'} subscription to ${plan.name} plan`,
          logo: process.env.COMPANY_LOGO_URL
        },
        meta: {
          subscriptionId: String(subscription._id),
          planId: data.planId,
          userId: data.userId,
          paymentMethod: data.paymentMethod
        }
      };

      const paymentResponse = await this.flutterwaveService.initializePayment(paymentData);

      // Create transaction record
      await Transaction.create({
        userId: new Types.ObjectId(data.userId),
        subscriptionId: subscription._id,
        flutterwaveTransactionId: paymentResponse.data.id.toString(),
        flutterwaveReference: txRef,
        amount: amount,
        currency: plan.currency,
        status: 'pending',
        type: 'subscription',
        description: `${plan.name} subscription payment`,
        customerEmail: data.customerData.email,
        customerPhone: data.customerData.phone,
        metadata: {
          paymentMethod: data.paymentMethod,
          planName: plan.name
        }
      });

      return {
        subscription: await subscription.populate('planId'),
        paymentLink: paymentResponse.payment_link
      };

    } catch (error: any) {
      console.error('Subscription creation error:', error);
      throw new Error(`Failed to create subscription: ${error.message}`);
    }
  }

  /**
   * Update an existing subscription (upgrade/downgrade)
   * @param subscriptionId - Subscription ID
   * @param data - Update data
   * @returns Promise<any> - Updated subscription
   */
  async updateSubscription(subscriptionId: string, data: UpdateSubscriptionData): Promise<any> {
    await connectDB();

    try {
      const subscription = await Subscription.findById(subscriptionId).populate('planId').populate('userId');
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      if (!subscription.isActive()) {
        throw new Error('Cannot update inactive subscription');
      }

      const newPlan = await Plan.findById(data.planId);
      if (!newPlan || !newPlan.isActive) {
        throw new Error('Invalid or inactive plan');
      }

      const currentPlan = subscription.planId as any;

      // Check if it's actually a change
      if (currentPlan._id.toString() === data.planId) {
        throw new Error('New plan is the same as current plan');
      }

      const isUpgrade = newPlan.price.monthly > currentPlan.price.monthly;
      const transactionType = isUpgrade ? 'upgrade' : 'downgrade';

      if (data.immediate) {
        // Immediate change with prorated billing
        const daysRemaining = subscription.daysUntilExpiry();
        const totalDaysInPeriod = 30; // Assuming monthly billing for proration

        const currentPlanPrice = subscription.metadata.paymentMethod === 'annual'
          ? currentPlan.price.annual
          : currentPlan.price.monthly;

        const newPlanPrice = subscription.metadata.paymentMethod === 'annual'
          ? newPlan.price.annual
          : newPlan.price.monthly;

        const prorationCalc = calculateProratedAmount(
          { price: currentPlanPrice, currency: currentPlan.currency },
          { price: newPlanPrice, currency: newPlan.currency },
          daysRemaining,
          totalDaysInPeriod
        );

        if (prorationCalc.proratedAmount > 0) {
          // User needs to pay additional amount
          const txRef = generateSubscriptionReference(
            subscription.userId.toString(),
            data.planId,
            transactionType
          );

          const paymentData = {
            tx_ref: txRef,
            amount: prorationCalc.proratedAmount,
            currency: newPlan.currency,
            customer: {
              email: (subscription.userId as any).email,
              name: (subscription.userId as any).getFullName(),
              phone: (subscription.userId as any).phone
            },
            customizations: {
              title: `Plan ${isUpgrade ? 'Upgrade' : 'Change'}`,
              description: `Prorated payment for ${newPlan.name} plan`,
              logo: process.env.COMPANY_LOGO_URL
            },
            meta: {
              subscriptionId: String(subscription._id),
              planId: data.planId,
              userId: subscription.userId.toString(),
              transactionType,
              proratedAmount: prorationCalc.proratedAmount
            }
          };

          const paymentResponse = await this.flutterwaveService.initializePayment(paymentData);

          // Create transaction record
          await Transaction.create({
            userId: subscription.userId,
            subscriptionId: subscription._id,
            flutterwaveTransactionId: paymentResponse.data.id.toString(),
            flutterwaveReference: txRef,
            amount: prorationCalc.proratedAmount,
            currency: newPlan.currency,
            status: 'pending',
            type: transactionType,
            description: `Prorated payment for ${newPlan.name} plan`,
            customerEmail: (subscription.userId as any).email,
            metadata: {
              prorationDetails: prorationCalc,
              oldPlanId: currentPlan._id.toString(),
              newPlanId: data.planId
            }
          });

          return {
            subscription,
            paymentRequired: true,
            paymentLink: paymentResponse.payment_link,
            prorationDetails: prorationCalc
          };
        } else {
          // Downgrade or no additional payment required
          await subscription.upgrade(new Types.ObjectId(data.planId));

          // Create a record of the change
          await Transaction.create({
            userId: subscription.userId,
            subscriptionId: subscription._id,
            flutterwaveTransactionId: `internal_${Date.now()}`,
            flutterwaveReference: `internal_${transactionType}_${Date.now()}`,
            amount: 0,
            currency: newPlan.currency,
            status: 'successful',
            type: transactionType,
            description: `Plan changed to ${newPlan.name}`,
            processedAt: new Date(),
            metadata: {
              prorationDetails: prorationCalc,
              oldPlanId: currentPlan._id.toString(),
              newPlanId: data.planId
            }
          });

          return {
            subscription: await subscription.populate('planId'),
            paymentRequired: false,
            prorationDetails: prorationCalc
          };
        }
      } else {
        // Schedule change for next billing cycle
        subscription.metadata.scheduledPlanChange = {
          newPlanId: data.planId,
          effectiveDate: subscription.currentPeriodEnd,
          transactionType
        };

        if (data.metadata) {
          subscription.metadata = { ...subscription.metadata, ...data.metadata };
        }

        await subscription.save();

        return {
          subscription: await subscription.populate('planId'),
          paymentRequired: false,
          scheduledChange: true,
          effectiveDate: subscription.currentPeriodEnd
        };
      }

    } catch (error: any) {
      console.error('Subscription update error:', error);
      throw new Error(`Failed to update subscription: ${error.message}`);
    }
  }

  /**
   * Cancel a subscription
   * @param subscriptionId - Subscription ID
   * @param immediately - Whether to cancel immediately or at period end
   * @returns Promise<any> - Cancelled subscription
   */
  async cancelSubscription(subscriptionId: string, immediately: boolean = false): Promise<any> {
    await connectDB();

    try {
      const subscription = await Subscription.findById(subscriptionId).populate('planId');
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      if (subscription.status === 'cancelled') {
        throw new Error('Subscription is already cancelled');
      }

      await subscription.cancel(immediately);

      // Cancel Flutterwave payment plan if exists
      if (subscription.flutterwaveSubscriptionId) {
        try {
          await this.flutterwaveService.cancelPaymentPlan(subscription.flutterwaveSubscriptionId);
        } catch (error) {
          console.warn('Failed to cancel Flutterwave payment plan:', error);
          // Don't throw error as local cancellation is more important
        }
      }

      // Create cancellation record
      await Transaction.create({
        userId: subscription.userId,
        subscriptionId: subscription._id,
        flutterwaveTransactionId: `cancellation_${Date.now()}`,
        flutterwaveReference: `cancel_${subscription._id}_${Date.now()}`,
        amount: 0,
        currency: (subscription.planId as any).currency,
        status: 'successful',
        type: 'subscription',
        description: `Subscription cancelled ${immediately ? 'immediately' : 'at period end'}`,
        processedAt: new Date(),
        metadata: {
          cancellationType: immediately ? 'immediate' : 'at_period_end',
          cancelledAt: new Date()
        }
      });

      return await subscription.populate('planId');

    } catch (error: any) {
      console.error('Subscription cancellation error:', error);
      throw new Error(`Failed to cancel subscription: ${error.message}`);
    }
  }

  /**
   * Get user's current subscription
   * @param userId - User ID
   * @returns Promise<any> - User's subscription or null
   */
  async getSubscription(userId: string): Promise<any> {
    await connectDB();

    try {
      return await Subscription.findByUserId(new Types.ObjectId(userId));
    } catch (error: any) {
      console.error('Get subscription error:', error);
      throw new Error(`Failed to get subscription: ${error.message}`);
    }
  }

  /**
   * Check if user has access to a specific feature
   * @param userId - User ID
   * @param feature - Feature name
   * @returns Promise<boolean> - Whether user has access
   */
  async checkFeatureAccess(userId: string, feature: string): Promise<boolean> {
    await connectDB();

    try {
      const subscription = await Subscription.findByUserId(new Types.ObjectId(userId));

      if (!subscription || !subscription.isActive()) {
        return false;
      }

      const plan = await Plan.findById(subscription.planId);
      return plan?.hasFeature(feature) || false;

    } catch (error: any) {
      console.error('Feature access check error:', error);
      return false;
    }
  }

  /**
   * Get user's feature limits
   * @param userId - User ID
   * @returns Promise<Record<string, number | null>> - Feature limits
   */
  async getFeatureLimits(userId: string): Promise<Record<string, number | null>> {
    await connectDB();

    try {
      const subscription = await Subscription.findByUserId(new Types.ObjectId(userId));

      if (!subscription || !subscription.isActive()) {
        return {};
      }

      const plan = await Plan.findById(subscription.planId);
      if (!plan) {
        return {};
      }

      const limits: Record<string, number | null> = {};

      Object.keys(plan.features).forEach(featureName => {
        const feature = plan.features[featureName];
        if (feature.enabled) {
          limits[featureName] = feature.limit || null;
        }
      });

      return limits;

    } catch (error: any) {
      console.error('Get feature limits error:', error);
      return {};
    }
  }

  /**
   * Renew a subscription
   * @param subscriptionId - Subscription ID
   * @returns Promise<any> - Renewed subscription
   */
  async renewSubscription(subscriptionId: string): Promise<any> {
    await connectDB();

    try {
      const subscription = await Subscription.findById(subscriptionId).populate('planId');
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      const plan = subscription.planId as any;
      const paymentMethod = subscription.metadata.paymentMethod || 'monthly';

      // Calculate new period end
      const newPeriodEnd = getNextRenewalDate(subscription.currentPeriodEnd, paymentMethod);

      // Check for scheduled plan changes
      if (subscription.metadata.scheduledPlanChange) {
        const scheduledChange = subscription.metadata.scheduledPlanChange;
        const newPlan = await Plan.findById(scheduledChange.newPlanId);

        if (newPlan && newPlan.isActive) {
          // Apply the scheduled plan change
          subscription.planId = new Types.ObjectId(scheduledChange.newPlanId);
          delete subscription.metadata.scheduledPlanChange;
        }
      }

      // Renew the subscription
      await subscription.renew(newPeriodEnd);

      return await subscription.populate('planId');

    } catch (error: any) {
      console.error('Subscription renewal error:', error);
      throw new Error(`Failed to renew subscription: ${error.message}`);
    }
  }

  /**
   * Get subscription analytics for admin
   * @returns Promise<any> - Subscription analytics
   */
  async getSubscriptionAnalytics(): Promise<any> {
    await connectDB();

    try {
      const [
        totalSubscriptions,
        activeSubscriptions,
        cancelledSubscriptions,
        expiredSubscriptions,
        revenueData,
        planDistribution
      ] = await Promise.all([
        Subscription.countDocuments(),
        Subscription.countDocuments({ status: 'active' }),
        Subscription.countDocuments({ status: 'cancelled' }),
        Subscription.countDocuments({ status: 'expired' }),
        Transaction.getTotalRevenue(),
        Subscription.aggregate([
          { $match: { status: 'active' } },
          { $group: { _id: '$planId', count: { $sum: 1 } } },
          { $lookup: { from: 'plans', localField: '_id', foreignField: '_id', as: 'plan' } },
          { $unwind: '$plan' },
          { $project: { planName: '$plan.name', count: 1 } }
        ])
      ]);

      return {
        overview: {
          totalSubscriptions,
          activeSubscriptions,
          cancelledSubscriptions,
          expiredSubscriptions,
          totalRevenue: revenueData
        },
        planDistribution,
        conversionRate: totalSubscriptions > 0 ? (activeSubscriptions / totalSubscriptions) * 100 : 0,
        churnRate: totalSubscriptions > 0 ? (cancelledSubscriptions / totalSubscriptions) * 100 : 0
      };

    } catch (error: any) {
      console.error('Subscription analytics error:', error);
      throw new Error(`Failed to get subscription analytics: ${error.message}`);
    }
  }

  /**
   * Process expired subscriptions
   * @returns Promise<number> - Number of processed subscriptions
   */
  async processExpiredSubscriptions(): Promise<number> {
    await connectDB();

    try {
      const expiredSubscriptions = await Subscription.findExpiredSubscriptions();
      let processedCount = 0;

      for (const subscription of expiredSubscriptions) {
        if (subscription.cancelAtPeriodEnd) {
          subscription.status = 'cancelled';
        } else {
          subscription.status = 'expired';
        }

        await subscription.save();
        processedCount++;
      }

      return processedCount;

    } catch (error: any) {
      console.error('Process expired subscriptions error:', error);
      throw new Error(`Failed to process expired subscriptions: ${error.message}`);
    }
  }

  /**
   * Get subscriptions expiring soon
   * @param days - Number of days to look ahead
   * @returns Promise<any[]> - Expiring subscriptions
   */
  async getExpiringSubscriptions(days: number = 7): Promise<any[]> {
    await connectDB();

    try {
      return await Subscription.findExpiringSubscriptions(days);
    } catch (error: any) {
      console.error('Get expiring subscriptions error:', error);
      throw new Error(`Failed to get expiring subscriptions: ${error.message}`);
    }
  }
}

// Export singleton instance
export const subscriptionService = new SubscriptionService();
export default SubscriptionService;