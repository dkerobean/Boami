import { connectToDatabase } from '@/lib/database/mongoose-connection';
import { Subscription } from '@/lib/database/models/Subscription';
import { Transaction } from '@/lib/database/models/Transaction';
import { User } from '@/lib/database/models/User';
import { Plan } from '@/lib/database/models/Plan';
import { subDays, startOfDay, endOfDay, format } from 'date-fns';

export interface SubscriptionMetrics {
  totalSubscriptions: number;
  activeSubscriptions: number;
  cancelledSubscriptions: number;
  expiredSubscriptions: number;
  pastDueSubscriptions: number;
  conversionRate: number;
  churnRate: number;
  monthlyRecurringRevenue: number;
  annualRecurringRevenue: number;
  averageRevenuePerUser: number;
  customerLifetimeValue: number;
  newSubscriptionsToday: number;
  newSubscriptionsThisWeek: number;
  newSubscriptionsThisMonth: number;
  revenueToday: number;
  revenueThisWeek: number;
  revenueThisMonth: number;
  topPlans: Array<{
    planId: string;
    planName: string;
    subscriptionCount: number;
    revenue: number;
  }>;
  recentActivity: Array<{
    type: 'subscription_created' | 'subscription_cancelled' | 'payment_success' | 'payment_failed';
    timestamp: Date;
    userId: string;
    userEmail: string;
    amount?: number;
    currency?: string;
    planName?: string;
  }>;
}

export interface PaymentMetrics {
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  successRate: number;
  totalRevenue: number;
  averageTransactionAmount: number;
  transactionsToday: number;
  transactionsThisWeek: number;
  transactionsThisMonth: number;
  revenueByDay: Array<{
    date: string;
    revenue: number;
    transactionCount: number;
  }>;
  failureReasons: Array<{
    reason: string;
    count: number;
    percentage: number;
  }>;
}

export interface ChurnAnalysis {
  churnRate: number;
  churnReasons: Array<{
    reason: string;
    count: number;
    percentage: number;
  }>;
  churnByPlan: Array<{
    planId: string;
    planName: string;
    churnRate: number;
    totalCancellations: number;
  }>;
  retentionRate: number;
  averageSubscriptionDuration: number;
}

export class SubscriptionMetricsService {
  /**
   * Get comprehensive subscription metrics
   */
  static async getSubscriptionMetrics(dateRange: number = 30): Promise<SubscriptionMetrics> {
    await connectToDatabase();

    const startDate = startOfDay(subDays(new Date(), dateRange));
    const endDate = endOfDay(new Date());
    const today = startOfDay(new Date());
    const weekAgo = startOfDay(subDays(new Date(), 7));
    const monthAgo = startOfDay(subDays(new Date(), 30));

    // Get subscription counts by status
    const [
      totalSubscriptions,
      activeSubscriptions,
      cancelledSubscriptions,
      expiredSubscriptions,
      pastDueSubscriptions
    ] = await Promise.all([
      Subscription.countDocuments(),
      Subscription.countDocuments({ status: 'active' }),
      Subscription.countDocuments({ status: 'cancelled' }),
      Subscription.countDocuments({ status: 'expired' }),
      Subscription.countDocuments({ status: 'past_due' })
    ]);

    // Get new subscriptions
    const [newSubscriptionsToday, newSubscriptionsThisWeek, newSubscriptionsThisMonth] = await Promise.all([
      Subscription.countDocuments({ createdAt: { $gte: today } }),
      Subscription.countDocuments({ createdAt: { $gte: weekAgo } }),
      Subscription.countDocuments({ createdAt: { $gte: monthAgo } })
    ]);

    // Get revenue data
    const revenueData = await Transaction.aggregate([
      {
        $match: {
          status: 'completed',
          type: 'subscription_payment'
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' },
          averageAmount: { $avg: '$amount' },
          revenueToday: {
            $sum: {
              $cond: [
                { $gte: ['$createdAt', today] },
                '$amount',
                0
              ]
            }
          },
          revenueThisWeek: {
            $sum: {
              $cond: [
                { $gte: ['$createdAt', weekAgo] },
                '$amount',
                0
              ]
            }
          },
          revenueThisMonth: {
            $sum: {
              $cond: [
                { $gte: ['$createdAt', monthAgo] },
                '$amount',
                0
              ]
            }
          }
        }
      }
    ]);

    const revenue = revenueData[0] || {
      totalRevenue: 0,
      averageAmount: 0,
      revenueToday: 0,
      revenueThisWeek: 0,
      revenueThisMonth: 0
    };

    // Calculate MRR and ARR
    const mrrData = await Subscription.aggregate([
      {
        $match: { status: 'active' }
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
          _id: null,
          monthlyRevenue: {
            $sum: {
              $cond: [
                { $eq: ['$billingPeriod', 'monthly'] },
                '$plan.price.monthly',
                { $divide: ['$plan.price.annual', 12] }
              ]
            }
          }
        }
      }
    ]);

    const monthlyRecurringRevenue = mrrData[0]?.monthlyRevenue || 0;
    const annualRecurringRevenue = monthlyRecurringRevenue * 12;

    // Calculate conversion rate (active subscriptions / total users)
    const totalUsers = await User.countDocuments();
    const conversionRate = totalUsers > 0 ? (activeSubscriptions / totalUsers) * 100 : 0;

    // Calculate churn rate
    const churnData = await Subscription.aggregate([
      {
        $match: {
          status: 'cancelled',
          cancelledAt: { $gte: monthAgo }
        }
      },
      {
        $count: 'churned'
      }
    ]);

    const churnedThisMonth = churnData[0]?.churned || 0;
    const churnRate = activeSubscriptions > 0 ? (churnedThisMonth / (activeSubscriptions + churnedThisMonth)) * 100 : 0;

    // Calculate ARPU and CLV
    const averageRevenuePerUser = activeSubscriptions > 0 ? monthlyRecurringRevenue / activeSubscriptions : 0;
    const customerLifetimeValue = churnRate > 0 ? averageRevenuePerUser / (churnRate / 100) : 0;

    // Get top plans
    const topPlans = await Subscription.aggregate([
      {
        $match: { status: 'active' }
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
          _id: '$planId',
          planName: { $first: '$plan.name' },
          subscriptionCount: { $sum: 1 },
          revenue: {
            $sum: {
              $cond: [
                { $eq: ['$billingPeriod', 'monthly'] },
                '$plan.price.monthly',
                { $divide: ['$plan.price.annual', 12] }
              ]
            }
          }
        }
      },
      {
        $sort: { subscriptionCount: -1 }
      },
      {
        $limit: 5
      },
      {
        $project: {
          planId: '$_id',
          planName: 1,
          subscriptionCount: 1,
          revenue: 1,
          _id: 0
        }
      }
    ]);

    // Get recent activity
    const recentActivity = await Subscription.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
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
        $unwind: '$user'
      },
      {
        $unwind: '$plan'
      },
      {
        $sort: { updatedAt: -1 }
      },
      {
        $limit: 10
      },
      {
        $project: {
          type: {
            $cond: [
              { $eq: ['$status', 'cancelled'] },
              'subscription_cancelled',
              'subscription_created'
            ]
          },
          timestamp: '$updatedAt',
          userId: '$userId',
          userEmail: '$user.email',
          planName: '$plan.name'
        }
      }
    ]);

    return {
      totalSubscriptions,
      activeSubscriptions,
      cancelledSubscriptions,
      expiredSubscriptions,
      pastDueSubscriptions,
      conversionRate,
      churnRate,
      monthlyRecurringRevenue,
      annualRecurringRevenue,
      averageRevenuePerUser,
      customerLifetimeValue,
      newSubscriptionsToday,
      newSubscriptionsThisWeek,
      newSubscriptionsThisMonth,
      revenueToday: revenue.revenueToday,
      revenueThisWeek: revenue.revenueThisWeek,
      revenueThisMonth: revenue.revenueThisMonth,
      topPlans,
      recentActivity
    };
  }

  /**
   * Get payment processing metrics
   */
  static async getPaymentMetrics(dateRange: number = 30): Promise<PaymentMetrics> {
    await connectToDatabase();

    const startDate = startOfDay(subDays(new Date(), dateRange));
    const endDate = endOfDay(new Date());
    const today = startOfDay(new Date());
    const weekAgo = startOfDay(subDays(new Date(), 7));
    const monthAgo = startOfDay(subDays(new Date(), 30));

    // Get transaction counts and success rate
    const [
      totalTransactions,
      successfulTransactions,
      failedTransactions,
      transactionsToday,
      transactionsThisWeek,
      transactionsThisMonth
    ] = await Promise.all([
      Transaction.countDocuments({ createdAt: { $gte: startDate, $lte: endDate } }),
      Transaction.countDocuments({
        status: 'completed',
        createdAt: { $gte: startDate, $lte: endDate }
      }),
      Transaction.countDocuments({
        status: 'failed',
        createdAt: { $gte: startDate, $lte: endDate }
      }),
      Transaction.countDocuments({ createdAt: { $gte: today } }),
      Transaction.countDocuments({ createdAt: { $gte: weekAgo } }),
      Transaction.countDocuments({ createdAt: { $gte: monthAgo } })
    ]);

    const successRate = totalTransactions > 0 ? (successfulTransactions / totalTransactions) * 100 : 0;

    // Get revenue data
    const revenueData = await Transaction.aggregate([
      {
        $match: {
          status: 'completed',
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' },
          averageAmount: { $avg: '$amount' }
        }
      }
    ]);

    const { totalRevenue = 0, averageAmount = 0 } = revenueData[0] || {};

    // Get revenue by day
    const revenueByDay = await Transaction.aggregate([
      {
        $match: {
          status: 'completed',
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt'
            }
          },
          revenue: { $sum: '$amount' },
          transactionCount: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      },
      {
        $project: {
          date: '$_id',
          revenue: 1,
          transactionCount: 1,
          _id: 0
        }
      }
    ]);

    // Get failure reasons
    const failureReasons = await Transaction.aggregate([
      {
        $match: {
          status: 'failed',
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$failureReason',
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          reason: { $ifNull: ['$_id', 'Unknown'] },
          count: 1,
          percentage: {
            $multiply: [
              { $divide: ['$count', failedTransactions || 1] },
              100
            ]
          },
          _id: 0
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    return {
      totalTransactions,
      successfulTransactions,
      failedTransactions,
      successRate,
      totalRevenue,
      averageTransactionAmount: averageAmount,
      transactionsToday,
      transactionsThisWeek,
      transactionsThisMonth,
      revenueByDay,
      failureReasons
    };
  }

  /**
   * Get detailed churn analysis
   */
  static async getChurnAnalysis(dateRange: number = 90): Promise<ChurnAnalysis> {
    await connectToDatabase();

    const startDate = startOfDay(subDays(new Date(), dateRange));
    const endDate = endOfDay(new Date());

    // Get churn data
    const churnData = await Subscription.aggregate([
      {
        $match: {
          status: 'cancelled',
          cancelledAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$cancelReason',
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          reason: { $ifNull: ['$_id', 'No reason provided'] },
          count: 1,
          _id: 0
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    const totalChurned = churnData.reduce((sum, item) => sum + item.count, 0);
    const churnReasons = churnData.map(item => ({
      ...item,
      percentage: totalChurned > 0 ? (item.count / totalChurned) * 100 : 0
    }));

    // Get churn by plan
    const churnByPlan = await Subscription.aggregate([
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
          _id: '$planId',
          planName: { $first: '$plan.name' },
          totalSubscriptions: { $sum: 1 },
          cancelledSubscriptions: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', 'cancelled'] },
                    { $gte: ['$cancelledAt', startDate] },
                    { $lte: ['$cancelledAt', endDate] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $project: {
          planId: '$_id',
          planName: 1,
          totalCancellations: '$cancelledSubscriptions',
          churnRate: {
            $cond: [
              { $gt: ['$totalSubscriptions', 0] },
              {
                $multiply: [
                  { $divide: ['$cancelledSubscriptions', '$totalSubscriptions'] },
                  100
                ]
              },
              0
            ]
          },
          _id: 0
        }
      },
      {
        $sort: { churnRate: -1 }
      }
    ]);

    // Calculate overall metrics
    const activeSubscriptions = await Subscription.countDocuments({ status: 'active' });
    const churnRate = activeSubscriptions > 0 ? (totalChurned / (activeSubscriptions + totalChurned)) * 100 : 0;
    const retentionRate = 100 - churnRate;

    // Calculate average subscription duration
    const durationData = await Subscription.aggregate([
      {
        $match: {
          status: 'cancelled',
          cancelledAt: { $exists: true }
        }
      },
      {
        $project: {
          duration: {
            $divide: [
              { $subtract: ['$cancelledAt', '$createdAt'] },
              1000 * 60 * 60 * 24 // Convert to days
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          averageDuration: { $avg: '$duration' }
        }
      }
    ]);

    const averageSubscriptionDuration = durationData[0]?.averageDuration || 0;

    return {
      churnRate,
      churnReasons,
      churnByPlan,
      retentionRate,
      averageSubscriptionDuration
    };
  }

  /**
   * Get subscription trends over time
   */
  static async getSubscriptionTrends(days: number = 30): Promise<Array<{
    date: string;
    newSubscriptions: number;
    cancelledSubscriptions: number;
    activeSubscriptions: number;
    revenue: number;
  }>> {
    await connectToDatabase();

    const startDate = startOfDay(subDays(new Date(), days));
    const endDate = endOfDay(new Date());

    const trends = await Subscription.aggregate([
      {
        $facet: {
          newSubscriptions: [
            {
              $match: {
                createdAt: { $gte: startDate, $lte: endDate }
              }
            },
            {
              $group: {
                _id: {
                  $dateToString: {
                    format: '%Y-%m-%d',
                    date: '$createdAt'
                  }
                },
                count: { $sum: 1 }
              }
            }
          ],
          cancelledSubscriptions: [
            {
              $match: {
                status: 'cancelled',
                cancelledAt: { $gte: startDate, $lte: endDate }
              }
            },
            {
              $group: {
                _id: {
                  $dateToString: {
                    format: '%Y-%m-%d',
                    date: '$cancelledAt'
                  }
                },
                count: { $sum: 1 }
              }
            }
          ]
        }
      }
    ]);

    // Get revenue trends from transactions
    const revenueTrends = await Transaction.aggregate([
      {
        $match: {
          status: 'completed',
          type: 'subscription_payment',
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt'
            }
          },
          revenue: { $sum: '$amount' }
        }
      }
    ]);

    // Combine data by date
    const dateMap = new Map();

    // Initialize all dates with zero values
    for (let i = 0; i < days; i++) {
      const date = format(subDays(new Date(), days - 1 - i), 'yyyy-MM-dd');
      dateMap.set(date, {
        date,
        newSubscriptions: 0,
        cancelledSubscriptions: 0,
        activeSubscriptions: 0,
        revenue: 0
      });
    }

    // Add new subscriptions data
    trends[0].newSubscriptions.forEach((item: any) => {
      if (dateMap.has(item._id)) {
        dateMap.get(item._id).newSubscriptions = item.count;
      }
    });

    // Add cancelled subscriptions data
    trends[0].cancelledSubscriptions.forEach((item: any) => {
      if (dateMap.has(item._id)) {
        dateMap.get(item._id).cancelledSubscriptions = item.count;
      }
    });

    // Add revenue data
    revenueTrends.forEach((item: any) => {
      if (dateMap.has(item._id)) {
        dateMap.get(item._id).revenue = item.revenue;
      }
    });

    return Array.from(dateMap.values());
  }
}