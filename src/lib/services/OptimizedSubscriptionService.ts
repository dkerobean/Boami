import { SubscriptionCache } from '../cache/subscription-cache';
import { DatabaseOptimization } from '../utils/database-optimization';
import { SubscriptionService } from './SubscriptionService';
import { connectToDatabase } from '../database/mongoose-connection';
import { User, Subscription, Plan } from '../database/models';

/**
 * Optimized subscription service with caching and performance improvements
 */
export class OptimizedSubscriptionService extends SubscriptionService {

  /**
   * Get user's active subscription with caching
   */
  static async getActiveSubscriptionOptimized(userId: string): Promise<any> {
    try {
      // Try cache first
      const cached = await SubscriptionCache.getCachedUserSubscription(userId);
      if (cached) {
        return {
          success: true,
          subscription: cached,
          fromCache: true
        };
      }

      // Use optimized database query
      const subscription = await DatabaseOptimization.getOptimizedSubscription(userId);

      return {
        success: true,
        subscription,
        fromCache: false
      };
    } catch (error) {
      console.error('Error getting optimized active subscription:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Batch get subscriptions for multiple users
   */
  static async batchGetSubscriptions(userIds: string[]): Promise<any> {
    try {
      const subscriptions = await DatabaseOptimization.batchLoadSubscriptions(userIds);

      return {
        success: true,
        subscriptions: Object.fromEntries(subscriptions),
        count: subscriptions.size
      };
    } catch (error) {
      console.error('Error batch getting subscriptions:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Get plan with caching
   */
  static async getPlanOptimized(planId: string): Promise<any> {
    try {
      // Try cache first
      const cached = await SubscriptionCache.getCachedPlan(planId);
      if (cached) {
        return {
          success: true,
          plan: cached,
          fromCache: true
        };
      }

      // Use optimized database query
      const plan = await DatabaseOptimization.getOptimizedPlan(planId);

      return {
        success: true,
        plan,
        fromCache: false
      };
    } catch (error) {
      console.error('Error getting optimized plan:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Create subscription with cache invalidation
   */
  static async createSubscriptionOptimized(subscriptionData: any): Promise<any> {
    try {
      // Create subscription using parent method
      const subscriptionService = new SubscriptionService();
      const result = await subscriptionService.createSubscription(subscriptionData);

      if (result.subscription) {
        // Cache the new subscription
        await SubscriptionCache.cacheSubscription(result.subscription);

        // Invalidate user's feature access cache
        await SubscriptionCache.invalidateUserFeatureAccess(subscriptionData.userId);
      }

      return result;
    } catch (error) {
      console.error('Error creating optimized subscription:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Update subscription with cache invalidation
   */
  static async updateSubscriptionOptimized(subscriptionId: string, updateData: any): Promise<any> {
    try {
      // Update subscription using parent method
      const subscriptionService = new SubscriptionService();
      const result = await subscriptionService.updateSubscription(subscriptionId, updateData);

      if (result.success && result.subscription) {
        // Invalidate cache
        await SubscriptionCache.invalidateSubscription(
          subscriptionId,
          result.subscription.userId?.toString()
        );

        // Cache the updated subscription
        await SubscriptionCache.cacheSubscription(result.subscription);
      }

      return result;
    } catch (error) {
      console.error('Error updating optimized subscription:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Cancel subscription with cache invalidation
   */
  static async cancelSubscriptionOptimized(subscriptionId: string, options: any = {}): Promise<any> {
    try {
      // Cancel subscription using parent method
      const subscriptionService = new SubscriptionService();
      const result = await subscriptionService.cancelSubscription(subscriptionId, options);

      if (result.success && result.subscription) {
        // Invalidate cache
        await SubscriptionCache.invalidateSubscription(
          subscriptionId,
          result.subscription.use.toString()
        );

        // Cache the cancelled subscription
        await SubscriptionCache.cacheSubscription(result.subscription);
      }

      return result;
    } catch (error) {
      console.error('Error cancelling optimized subscription:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Get subscription analytics with caching
   */
  static async getSubscriptionAnalytics(timeframe: string = '30d'): Promise<any> {
    try {
      const cacheKey = `analytics:subscriptions:${timeframe}`;
      const cacheTTL = 3600; // 1 hour

      // Try cache first
      const cached = await SubscriptionCache.getCustomCache(cacheKey);
      if (cached) {
        return {
          success: true,
          analytics: cached,
          fromCache: true
        };
      }

      await connectToDatabase();

      const now = new Date();
      const startDate = new Date();

      // Calculate start date based on timeframe
      switch (timeframe) {
        case '7d':
          startDate.setDate(now.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(now.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(now.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
        default:
          startDate.setDate(now.getDate() - 30);
      }

      // Optimized aggregation pipeline
      const pipeline = DatabaseOptimization.optimizeAggregationPipeline([
        {
          $match: {
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              status: '$status',
              planId: '$planId',
              billingPeriod: '$billingPeriod'
            },
            count: { $sum: 1 },
            totalRevenue: { $sum: '$lastPaymentAmount' },
            avgRevenue: { $avg: '$lastPaymentAmount' }
          }
        },
        {
          $lookup: {
            from: 'plans',
            localField: '_id.planId',
            foreignField: '_id',
            as: 'plan'
          }
        },
        {
          $unwind: '$plan'
        },
        {
          $group: {
            _id: '$_id.status',
            totalSubscriptions: { $sum: '$count' },
            totalRevenue: { $sum: '$totalRevenue' },
            avgRevenue: { $avg: '$avgRevenue' },
            planBreakdown: {
              $push: {
                planName: '$plan.name',
                planId: '$plan._id',
                billingPeriod: '$_id.billingPeriod',
                count: '$count',
                revenue: '$totalRevenue'
              }
            }
          }
        }
      ]);

      const analytics = await Subscription.aggregate(pipeline);

      // Calculate additional metrics
      const totalActive = analytics.find(a => a._id === 'active')?.totalSubscriptions || 0;
      const totalCancelled = analytics.find(a => a._id === 'cancelled')?.totalSubscriptions || 0;
      const totalRevenue = analytics.reduce((sum, a) => sum + (a.totalRevenue || 0), 0);

      const result = {
        timeframe,
        summary: {
          totalActive,
          totalCancelled,
          totalRevenue,
          churnRate: totalActive > 0 ? (totalCancelled / (totalActive + totalCancelled)) * 100 : 0
        },
        breakdown: analytics,
        generatedAt: new Date()
      };

      // Cache the result
      await SubscriptionCache.setCustomCache(cacheKey, result, cacheTTL);

      return {
        success: true,
        analytics: result,
        fromCache: false
      };
    } catch (error) {
      console.error('Error getting subscription analytics:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Get subscription trends with caching
   */
  static async getSubscriptionTrends(period: string = 'daily'): Promise<any> {
    try {
      const cacheKey = `trends:subscriptions:${period}`;
      const cacheTTL = 1800; // 30 minutes

      // Try cache first
      const cached = await SubscriptionCache.getCustomCache(cacheKey);
      if (cached) {
        return {
          success: true,
          trends: cached,
          fromCache: true
        };
      }

      await connectToDatabase();

      let groupBy: any;
      let startDate = new Date();

      switch (period) {
        case 'hourly':
          groupBy = {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' },
            hour: { $hour: '$createdAt' }
          };
          startDate.setDate(startDate.getDate() - 7); // Last 7 days
          break;
        case 'daily':
          groupBy = {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          };
          startDate.setDate(startDate.getDate() - 30); // Last 30 days
          break;
        case 'weekly':
          groupBy = {
            year: { $year: '$createdAt' },
            week: { $week: '$createdAt' }
          };
          startDate.setDate(startDate.getDate() - 90); // Last 90 days
          break;
        case 'monthly':
          groupBy = {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          };
          startDate.setFullYear(startDate.getFullYear() - 1); // Last year
          break;
        default:
          groupBy = {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          };
          startDate.setDate(startDate.getDate() - 30);
      }

      const pipeline = [
        {
          $match: {
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: groupBy,
            newSubscriptions: { $sum: 1 },
            revenue: { $sum: '$lastPaymentAmount' }
          }
        },
        {
          $sort: { '_id': 1 as const }
        }
      ];

      const trends = await Subscription.aggregate(pipeline);

      const result = {
        period,
        data: trends,
        generatedAt: new Date()
      };

      // Cache the result
      await SubscriptionCache.setCustomCache(cacheKey, result, cacheTTL);

      return {
        success: true,
        trends: result,
        fromCache: false
      };
    } catch (error) {
      console.error('Error getting subscription trends:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Preload frequently accessed data
   */
  static async preloadFrequentData(): Promise<void> {
    try {
      console.log('🚀 Preloading frequently accessed subscription data...');

      await connectToDatabase();

      // Preload active subscriptions
      const activeSubscriptions = await Subscription.find({
        isActive: true,
        status: 'active'
      })
      .populate('planId')
      .limit(50)
      .sort({ updatedAt: -1 })
      .lean();

      // Cache active subscriptions
      await SubscriptionCache.cacheMultipleSubscriptions(activeSubscriptions);

      // Preload active plans
      const activePlans = await Plan.find({ isActive: true }).lean();
      await SubscriptionCache.cacheMultiplePlans(activePlans);

      // Preload analytics for common timeframes
      await Promise.all([
        this.getSubscriptionAnalytics('7d'),
        this.getSubscriptionAnalytics('30d'),
        this.getSubscriptionTrends('daily')
      ]);

      console.log(`🚀 Preloaded ${activeSubscriptions.length} subscriptions and ${activePlans.length} plans`);
    } catch (error) {
      console.error('Error preloading frequent data:', error);
    }
  }

  /**
   * Get cache performance metrics
   */
  static async getCacheMetrics(): Promise<any> {
    try {
      const stats = await SubscriptionCache.getCacheStats();

      return {
        success: true,
        metrics: {
          ...stats,
          cacheAvailable: await SubscriptionCache['isCacheAvailable'](),
          timestamp: new Date()
        }
      };
    } catch (error) {
      console.error('Error getting cache metrics:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Warm up cache with essential data
   */
  static async warmUpCache(): Promise<any> {
    try {
      await SubscriptionCache.warmUpCache();
      await this.preloadFrequentData();

      return {
        success: true,
        message: 'Cache warmed up successfully'
      };
    } catch (error) {
      console.error('Error warming up cache:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}