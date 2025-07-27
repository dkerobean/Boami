import { connectToDatabase } from '../database/mongoose-connection';
import { Subscription, Transaction, Plan, User } from '../database/models';
import { SubscriptionCache } from '../cache/subscription-cache';

/**
 * Subscription analytics and monitoring service
 */
export class SubscriptionAnalyticsService {

  /**
   * Get subscription metrics for dashboard
   */
  static async getSubscriptionMetrics(timeframe: string = '30d'): Promise<any> {
    try {
      await connectToDatabase();

      const cacheKey = `metrics:subscription:${timeframe}`;
      const cached = await SubscriptionCache.getCustomCache(cacheKey);

      if (cached) {
        return {
          success: true,
          metrics: cached,
          fromCache: true
        };
      }

      const now = new Date();
      const startDate = this.getStartDate(timeframe, now);

      // Get basic subscription metrics
      const [
        totalSubscriptions,
        activeSubscriptions,
        cancelledSubscriptions,
        expiredSubscriptions,
        newSubscriptions,
        churnedSubscriptions
      ] = await Promise.all([
        Subscription.countDocuments({}),
        Subscription.countDocuments({ isActive: true, status: 'active' }),
        Subscription.countDocuments({ status: 'cancelled' }),
        Subscription.countDocuments({ status: 'expired' }),
        Subscription.countDocuments({
          createdAt: { $gte: startDate },
          status: 'active'
        }),
        Subscription.countDocuments({
          cancelledAt: { $gte: startDate },
          status: 'cancelled'
        })
      ]);

      // Calculate key metrics
      const churnRate = activeSubscriptions > 0 ?
        (churnedSubscriptions / (activeSubscriptions + churnedSubscriptions)) * 100 : 0;

      const growthRate = activeSubscriptions > 0 ?
        ((newSubscriptions - churnedSubscriptions) / activeSubscriptions) * 100 : 0;

      // Get revenue metrics
      const revenueMetrics = await this.getRevenueMetrics(startDate);

      // Get plan distribution
      const planDistribution = await this.getPlanDistribution();

      const metrics = {
        overview: {
          totalSubscriptions,
          activeSubscriptions,
          cancelledSubscriptions,
          expiredSubscriptions,
          newSubscriptions,
          churnedSubscriptions,
          churnRate: Math.round(churnRate * 100) / 100,
          growthRate: Math.round(growthRate * 100) / 100
        },
        revenue: revenueMetrics,
        planDistribution,
        timeframe,
        generatedAt: new Date()
      };

      // Cache for 30 minutes
      await SubscriptionCache.setCustomCache(cacheKey, metrics, 1800);

      return {
        success: true,
        metrics,
        fromCache: false
      };
    } catch (error) {
      console.error('Error getting subscription metrics:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get revenue metrics
   */
  private static async getRevenueMetrics(startDate: Date): Promise<any> {
    const revenueAggregation = await Transaction.aggregate([
      {
        $match: {
          status: 'successful',
          type: { $in: ['subscription_payment', 'subscription_renewal'] },
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' },
          averageRevenue: { $avg: '$amount' },
          transactionCount: { $sum: 1 }
        }
      }
    ]);

    const revenue = revenueAggregation[0] || {
      totalRevenue: 0,
      averageRevenue: 0,
      transactionCount: 0
    };

    // Get MRR (Monthly Recurring Revenue)
    const mrrAggregation = await Subscription.aggregate([
      {
        $match: {
          isActive: true,
          status: 'active'
        }
      },
      {
        $lookup: {
          from: 'plans',
          localField: 'planId',
          foreignField: '_id',
          as: 'plan'
        }
      },
      {
        $unwind: '$plan'
      },
      {
        $group: {
          _id: '$billingPeriod',
          totalRevenue: {
            $sum: {
              $cond: [
                { $eq: ['$billingPeriod', 'monthly'] },
                '$plan.price.monthly',
                { $divide: ['$plan.price.annual', 12] }
              ]
            }
          },
          count: { $sum: 1 }
        }
      }
    ]);

    const mrr = mrrAggregation.reduce((total, item) => total + item.totalRevenue, 0);
    const arr = mrr * 12; // Annual Recurring Revenue

    return {
      ...revenue,
      mrr: Math.round(mrr * 100) / 100,
      arr: Math.round(arr * 100) / 100
    };
  }

  /**
   * Get plan distribution
   */
  private static async getPlanDistribution(): Promise<any> {
    const distribution = await Subscription.aggregate([
      {
        $match: {
          isActive: true,
          status: 'active'
        }
      },
      {
        $lookup: {
          from: 'plans',
          localField: 'planId',
          foreignField: '_id',
          as: 'plan'
        }
      },
      {
        $unwind: '$plan'
      },
      {
        $group: {
          _id: {
            planId: '$planId',
            planName: '$plan.name',
            billingPeriod: '$billingPeriod'
          },
          count: { $sum: 1 },
          revenue: {
            $sum: {
              $cond: [
                { $eq: ['$billingPeriod', 'monthly'] },
                '$plan.price.monthly',
                '$plan.price.annual'
              ]
            }
          }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    return distribution.map(item => ({
      planId: item._id.planId,
      planName: item._id.planName,
      billingPeriod: item._id.billingPeriod,
      subscriptions: item.count,
      revenue: Math.round(item.revenue * 100) / 100
    }));
  }

  /**
   * Get conversion funnel metrics
   */
  static async getConversionMetrics(timeframe: string = '30d'): Promise<any> {
    try {
      await connectToDatabase();

      const startDate = this.getStartDate(timeframe);

      // Get user registration to subscription conversion
      const [totalUsers, subscribedUsers, trialUsers] = await Promise.all([
        User.countDocuments({
          createdAt: { $gte: startDate },
          isEmailVerified: true
        }),
        User.countDocuments({
          createdAt: { $gte: startDate },
          'subscription.active': true
        }),
        Subscription.countDocuments({
          createdAt: { $gte: startDate },
          status: 'trialing'
        })
      ]);

      const conversionRate = totalUsers > 0 ?
        (subscribedUsers / totalUsers) * 100 : 0;

      // Get payment attempt to success conversion
      const paymentConversion = await Transaction.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate },
            type: { $in: ['subscription_payment', 'subscription_renewal'] }
          }
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      const totalPaymentAttempts = paymentConversion.reduce((sum, item) => sum + item.count, 0);
      const successfulPayments = paymentConversion.find(item => item._id === 'successful')?.count || 0;
      const paymentSuccessRate = totalPaymentAttempts > 0 ?
        (successfulPayments / totalPaymentAttempts) * 100 : 0;

      return {
        success: true,
        metrics: {
          userToSubscription: {
            totalUsers,
            subscribedUsers,
            trialUsers,
            conversionRate: Math.round(conversionRate * 100) / 100
          },
          paymentConversion: {
            totalAttempts: totalPaymentAttempts,
            successfulPayments,
            successRate: Math.round(paymentSuccessRate * 100) / 100
          },
          timeframe,
          generatedAt: new Date()
        }
      };
    } catch (error) {
      console.error('Error getting conversion metrics:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get churn analysis
   */
  static async getChurnAnalysis(timeframe: string = '90d'): Promise<any> {
    try {
      await connectToDatabase();

      const startDate = this.getStartDate(timeframe);

      // Get churn by reason
      const churnByReason = await Subscription.aggregate([
        {
          $match: {
            status: 'cancelled',
            cancelledAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: '$cancelReason',
            count: { $sum: 1 }
          }
        },
        {
          $sort: { count: -1 }
        }
      ]);

      // Get churn by plan
      const churnByPlan = await Subscription.aggregate([
        {
          $match: {
            status: 'cancelled',
            cancelledAt: { $gte: startDate }
          }
        },
        {
          $lookup: {
            from: 'plans',
            localField: 'planId',
            foreignField: '_id',
            as: 'plan'
          }
        },
        {
          $unwind: '$plan'
        },
        {
          $group: {
            _id: {
              planId: '$planId',
              planName: '$plan.name'
            },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { count: -1 }
        }
      ]);

      // Get churn timeline
      const churnTimeline = await Subscription.aggregate([
        {
          $match: {
            status: 'cancelled',
            cancelledAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$cancelledAt' },
              month: { $month: '$cancelledAt' },
              day: { $dayOfMonth: '$cancelledAt' }
            },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
        }
      ]);

      return {
        success: true,
        analysis: {
          byReason: churnByReason.map(item => ({
            reason: item._id || 'Unknown',
            count: item.count
          })),
          byPlan: churnByPlan.map(item => ({
            planId: item._id.planId,
            planName: item._id.planName,
            count: item.count
          })),
          timeline: churnTimeline.map(item => ({
            date: new Date(item._id.year, item._id.month - 1, item._id.day),
            count: item.count
          })),
          timeframe,
          generatedAt: new Date()
        }
      };
    } catch (error) {
      console.error('Error getting churn analysis:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get payment processing metrics
   */
  static async getPaymentMetrics(timeframe: string = '30d'): Promise<any> {
    try {
      await connectToDatabase();

      const startDate = this.getStartDate(timeframe);

      // Get payment success/failure rates
      const paymentStats = await Transaction.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              status: '$status',
              type: '$type'
            },
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' }
          }
        }
      ]);

      // Get payment processing times
      const processingTimes = await Transaction.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate },
            processedAt: { $exists: true }
          }
        },
        {
          $project: {
            processingTime: {
              $subtract: ['$processedAt', '$createdAt']
            }
          }
        },
        {
          $group: {
            _id: null,
            avgProcessingTime: { $avg: '$processingTime' },
            maxProcessingTime: { $max: '$processingTime' },
            minProcessingTime: { $min: '$processingTime' }
          }
        }
      ]);

      // Get failed payment reasons
      const failureReasons = await Transaction.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate },
            status: 'failed'
          }
        },
        {
          $group: {
            _id: '$error',
            count: { $sum: 1 }
          }
        },
        {
          $sort: { count: -1 }
        }
      ]);

      return {
        success: true,
        metrics: {
          paymentStats: paymentStats.map(item => ({
            status: item._id.status,
            type: item._id.type,
            count: item.count,
            totalAmount: Math.round(item.totalAmount * 100) / 100
          })),
          processingTimes: processingTimes[0] ? {
            average: Math.round(processingTimes[0].avgProcessingTime),
            maximum: processingTimes[0].maxProcessingTime,
            minimum: processingTimes[0].minProcessingTime
          } : null,
          failureReasons: failureReasons.map(item => ({
            reason: item._id || 'Unknown',
            count: item.count
          })),
          timeframe,
          generatedAt: new Date()
        }
      };
    } catch (error) {
      console.error('Error getting payment metrics:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get cohort analysis
   */
  static async getCohortAnalysis(months: number = 12): Promise<any> {
    try {
      await connectToDatabase();

      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      // Get subscription cohorts by month
      const cohorts = await Subscription.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate }
          }
        },
        {
          $project: {
            cohortMonth: {
              $dateToString: {
                format: '%Y-%m',
                date: '$createdAt'
              }
            },
            isActive: '$isActive',
            status: '$status',
            createdAt: '$createdAt',
            cancelledAt: '$cancelledAt'
          }
        },
        {
          $group: {
            _id: '$cohortMonth',
            totalSubscriptions: { $sum: 1 },
            activeSubscriptions: {
              $sum: {
                $cond: [{ $eq: ['$isActive', true] }, 1, 0]
              }
            },
            cancelledSubscriptions: {
              $sum: {
                $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0]
              }
            }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ]);

      // Calculate retention rates
      const cohortAnalysis = cohorts.map(cohort => {
        const retentionRate = cohort.totalSubscriptions > 0 ?
          (cohort.activeSubscriptions / cohort.totalSubscriptions) * 100 : 0;

        return {
          month: cohort._id,
          totalSubscriptions: cohort.totalSubscriptions,
          activeSubscriptions: cohort.activeSubscriptions,
          cancelledSubscriptions: cohort.cancelledSubscriptions,
          retentionRate: Math.round(retentionRate * 100) / 100
        };
      });

      return {
        success: true,
        analysis: {
          cohorts: cohortAnalysis,
          months,
          generatedAt: new Date()
        }
      };
    } catch (error) {
      console.error('Error getting cohort analysis:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get real-time subscription alerts
   */
  static async getSubscriptionAlerts(): Promise<any> {
    try {
      await connectToDatabase();

      const now = new Date();
      const alerts = [];

      // Check for subscriptions expiring soon
      const expiringSubscriptions = await Subscription.countDocuments({
        isActive: true,
        currentPeriodEnd: {
          $gte: now,
          $lte: new Date(now.getTime() + 24 * 60 * 60 * 1000) // Next 24 hours
        }
      });

      if (expiringSubscriptions > 0) {
        alerts.push({
          type: 'warning',
          message: `${expiringSubscriptions} subscriptions expiring in the next 24 hours`,
          count: expiringSubscriptions,
          priority: 'medium'
        });
      }

      // Check for failed payments in last hour
      const recentFailedPayments = await Transaction.countDocuments({
        status: 'failed',
        createdAt: { $gte: new Date(now.getTime() - 60 * 60 * 1000) }
      });

      if (recentFailedPayments > 0) {
        alerts.push({
          type: 'error',
          message: `${recentFailedPayments} payment failures in the last hour`,
          count: recentFailedPayments,
          priority: 'high'
        });
      }

      // Check for high churn rate today
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayCancellations = await Subscription.countDocuments({
        status: 'cancelled',
        cancelledAt: { $gte: todayStart }
      });

      if (todayCancellations > 5) { // Threshold for alert
        alerts.push({
          type: 'warning',
          message: `High cancellation rate today: ${todayCancellations} cancellations`,
          count: todayCancellations,
          priority: 'medium'
        });
      }

      // Check for subscription processing delays
      const delayedSubscriptions = await Subscription.countDocuments({
        status: 'pending',
        createdAt: { $lt: new Date(now.getTime() - 30 * 60 * 1000) } // Older than 30 minutes
      });

      if (delayedSubscriptions > 0) {
        alerts.push({
          type: 'warning',
          message: `${delayedSubscriptions} subscriptions pending for over 30 minutes`,
          count: delayedSubscriptions,
          priority: 'high'
        });
      }

      return {
        success: true,
        alerts,
        generatedAt: new Date()
      };
    } catch (error) {
      console.error('Error getting subscription alerts:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Helper method to get start date based on timeframe
   */
  private static getStartDate(timeframe: string, baseDate: Date = new Date()): Date {
    const startDate = new Date(baseDate);

    switch (timeframe) {
      case '24h':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    return startDate;
  }
}