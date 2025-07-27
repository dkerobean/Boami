import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/database/mongoose-connection';
import { Subscription, User, Plan } from '@/lib/database/models';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-config';

/**
 * GET /api/admin/subscriptions
 * Get all subscriptions with filtering and pagination (Admin only)
 */
export async function GET(request: NextRequest) {
  try {
    // Check admin authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status') || 'all';
    const search = searchParams.get('search') || '';

    // Build filter query
    const filter: any = {};

    if (status !== 'all') {
      filter.status = status;
    }

    // Build aggregation pipeline
    const pipeline: any[] = [
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
      }
    ];

    // Add search filter
    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { 'user.firstName': { $regex: search, $options: 'i' } },
            { 'user.lastName': { $regex: search, $options: 'i' } },
            { 'user.email': { $regex: search, $options: 'i' } }
          ]
        }
      });
    }

    // Add status filter
    if (status !== 'all') {
      pipeline.push({
        $match: { status }
      });
    }

    // Add sorting
    pipeline.push({
      $sort: { createdAt: -1 }
    });

    // Get total count
    const countPipeline = [...pipeline, { $count: 'total' }];
    const countResult = await Subscription.aggregate(countPipeline);
    const totalCount = countResult[0]?.total || 0;

    // Add pagination
    pipeline.push(
      { $skip: (page - 1) * limit },
      { $limit: limit }
    );

    // Execute query
    const subscriptions = await Subscription.aggregate(pipeline);

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    return NextResponse.json({
      success: true,
      data: {
        subscriptions,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          hasNextPage,
          hasPreviousPage,
          limit
        }
      }
    });

  } catch (error: any) {
    console.error('Admin subscriptions fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch subscriptions' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/subscriptions
 * Create a new subscription (Admin only)
 */
export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    await connectToDatabase();

    const body = await request.json();
    const { userId, planId, status = 'active', billingPeriod = 'monthly' } = body;

    if (!userId || !planId) {
      return NextResponse.json(
        { success: false, error: 'User ID and Plan ID are required' },
        { status: 400 }
      );
    }

    // Verify user and plan exist
    const user = await User.findById(userId);
    const plan = await Plan.findById(planId);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    if (!plan) {
      return NextResponse.json(
        { success: false, error: 'Plan not found' },
        { status: 404 }
      );
    }

    // Check if user already has an active subscription
    const existingSubscription = await Subscription.findOne({
      userId,
      isActive: true
    });

    if (existingSubscription) {
      return NextResponse.json(
        { success: false, error: 'User already has an active subscription' },
        { status: 400 }
      );
    }

    // Calculate period dates
    const now = new Date();
    const periodEnd = new Date(now);
    if (billingPeriod === 'monthly') {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    } else {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    }

    // Create subscription
    const subscription = new Subscription({
      userId,
      planId,
      status,
      isActive: status === 'active',
      billingPeriod,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
      createdBy: session.user.id
    });

    await subscription.save();

    // Populate the subscription for response
    await subscription.populate(['userId', 'planId']);

    return NextResponse.json({
      success: true,
      data: subscription,
      message: 'Subscription created successfully'
    });

  } catch (error: any) {
    console.error('Admin subscription creation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create subscription' },
      { status: 500 }
    );
  }
}