import { NextRequest, NextResponse } from 'next/server';
import { Subscription, Plan } from '../../../../lib/database/models';
import { connectDB } from '../../../../lib/database/mongoose-connection';
import { getServerSession } from 'next-auth';
import { Types } from 'mongoose';

/**
 * GET /api/subscriptions/current
 * Get current user's subscription
 */
// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // TODO: Replace with proper authentication
    // For now, we'll get user ID from query params or headers
    const userId = request.nextUrl.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'User ID is required'
        },
        { status: 401 }
      );
    }

    // Handle development mock user ID vs real ObjectId
    let subscription;
    if (userId === 'dev-user-123' || !Types.ObjectId.isValid(userId)) {
      // For development or invalid ObjectIds, return null (no subscription)
      subscription = null;
    } else {
      // Get user's subscription for valid ObjectId
      subscription = await Subscription.findByUserId(new Types.ObjectId(userId));
    }

    if (!subscription) {
      return NextResponse.json({
        success: true,
        data: null,
        message: 'No active subscription found'
      });
    }

    // Get plan details
    const plan = await Plan.findById(subscription.planId);

    // Transform subscription for client consumption
    const transformedSubscription = {
      id: subscription._id,
      status: subscription.status,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      trialEnd: subscription.trialEnd,
      isActive: subscription.isActive(),
      isExpired: subscription.isExpired(),
      daysUntilExpiry: subscription.daysUntilExpiry(),
      plan: plan ? {
        id: plan._id,
        name: plan.name,
        description: plan.description,
        price: plan.price,
        currency: plan.currency,
        features: plan.features
      } : null,
      metadata: subscription.metadata,
      createdAt: subscription.createdAt,
      updatedAt: subscription.updatedAt
    };

    return NextResponse.json({
      success: true,
      data: transformedSubscription
    });

  } catch (error: any) {
    console.error('Get current subscription error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch current subscription'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/subscriptions/current
 * Update current user's subscription (upgrade/downgrade)
 */
export async function PUT(request: NextRequest) {
  try {
    await connectDB();

    // TODO: Replace with proper authentication
    const userId = request.nextUrl.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'User ID is required'
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { planId, immediate = false } = body;

    if (!planId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Plan ID is required'
        },
        { status: 400 }
      );
    }

    // Handle development mock user ID vs real ObjectId
    let subscription;
    if (userId === 'dev-user-123' || !Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot update subscription for development user'
        },
        { status: 400 }
      );
    }

    // Get user's current subscription for valid ObjectId
    subscription = await Subscription.findByUserId(new Types.ObjectId(userId));

    if (!subscription) {
      return NextResponse.json(
        {
          success: false,
          error: 'No active subscription found'
        },
        { status: 404 }
      );
    }

    if (!subscription.isActive()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot update inactive subscription'
        },
        { status: 400 }
      );
    }

    // Validate new plan
    const newPlan = await Plan.findById(planId);
    if (!newPlan || !newPlan.isActive) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid or inactive plan'
        },
        { status: 400 }
      );
    }

    // Use subscription service to handle the update
    const { SubscriptionService } = await import('../../../../lib/services/SubscriptionService');
    const subscriptionService = new SubscriptionService();

    const result = await subscriptionService.updateSubscription(String(subscription._id), {
      planId,
      immediate
    });

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error: any) {
    console.error('Update subscription error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update subscription'
      },
      { status: 500 }
    );
  }
}