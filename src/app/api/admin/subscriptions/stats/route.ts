import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/database/connection';
import { Subscription, Transaction } from '@/lib/database/models';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-config';

/**
 * GET /api/admin/subscriptions/stats
 * Get subscription statistics (Admin only)
 */
// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Check admin authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role?.name !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    await connectToDatabase();

    // Get current date ranges
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Basic subscription counts
    const [
      totalSubscriptions,
      activeSubscriptions,
      cancelledSubscriptions,
      expiredSubscriptions,
      pendingSubscriptions
    ] = await Promise.all([
      Subscription.countDocuments({}),
      Subscription.countDocuments({ isActive: true, status: 'active' }),
      Subscription.countDocuments({ status: 'cancelled' }),
      Subscription.countDocuments({ status: 'expired' }),
      Subscription.countDocuments({ status: 'pending' })
    ]);

    // Revenue calculations
    const monthlyRevenueAgg = await Subscription.aggregate([
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
        $match: {
          isActive: true,
          status: 'active',
          billingPeriod: 'monthly'
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$plan.price.monthly' }
        }
      }
    ]);

    const annualRevenueAgg = await Subscription.aggregate([
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
        $match: {
          isActive: true,
          status: 'active',
          billingPeriod: 'annual'
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$plan.price.annual' }
        }
      }
    ]);

    const monthlyRevenue = monthlyRevenueAgg[0]?.totalRevenue || 0;
    const annualRevenue = annualRevenueAgg[0]?.totalRevenue || 0;

    // Churn rate calculation (cancelled subscriptions in last month / total active at start of month)
    const cancelledLastMonth = await Subscription.countDocuments({
      status: 'cancelled',
      updatedAt: {
        $gte: lastMonth,
        $lt: startOfMonth
      }
    });

    const activeAtStartOfLastMonth = await Subscription.countDocuments({
      isActive: true,
      createdAt: { $lt: lastMonth }
    });

    const churnRate = activeAtStartOfLastMonth > 0
      ? (cancelledLastMonth / activeAtStartOfLastMonth) * 100
      : 0;

    // Growth metrics
    const newSubscriptionsThisMonth = await Subscription.countDocuments({
      createdAt: { $gte: startOfMonth }
    });

    const newSubscriptionsLastMonth = await Subscription.countDocuments({
      createdAt: {
        $gte: lastMonth,
        $lt: startOfMonth
      }
    });

    const growthRate = newSubscriptionsLastMonth > 0
      ? ((newSubscriptionsThisMonth - newSubscriptionsLastMonth) / newSubscriptionsLastMonth) * 100
      : 0;

    // Plan distribution
    const planDistribution = await Subscription.aggregate([
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
        $match: { isActive: true }
      },
      {
        $group: {
          _id: '$plan.name',
          count: { $sum: 1 },
          revenue: { $sum: '$plan.price.monthly' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // Recent activity
    const recentSubscriptions = await Subscription.aggregate([
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
        $sort: { createdAt: -1 }
      },
      {
        $limit: 5
      },
      {
        $project: {
          _id: 1,
          status: 1,
          createdAt: 1,
          'user.firstName': 1,
          'user.lastName': 1,
          'user.email': 1,
          'plan.name': 1
        }
      }
    ]);

    // Monthly trends (last 6 months)
    const monthlyTrends = await Subscription.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(now.getFullYear(), now.getMonth() - 5, 1)
          }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          newSubscriptions: { $sum: 1 },
          activeSubscriptions: {
            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
          }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    const stats = {
      totalSubscriptions,
      activeSubscriptions,
      cancelledSubscriptions,
      expiredSubscriptions,
      pendingSubscriptions,
      monthlyRevenue,
      annualRevenue,
      totalRevenue: monthlyRevenue + annualRevenue,
      churnRate,
      growthRate,
      newSubscriptionsThisMonth,
      newSubscriptionsLastMonth,
      planDistribution,
      recentSubscriptions,
      monthlyTrends
    };

    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error: any) {
    console.error('Admin subscription stats error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch subscription statistics' },
      { status: 500 }
    );
  }
}