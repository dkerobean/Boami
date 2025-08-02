import { NextRequest, NextResponse } from 'next/server';
import { Subscription } from '../../../../lib/database/models';
import { connectDB } from '../../../../lib/database/mongoose-connection';
import { SubscriptionService } from '../../../../lib/services/SubscriptionService';
import { Types } from 'mongoose';

/**
 * POST /api/subscriptions/cancel
 * Cancel user's subscription
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { userId, immediately = false, reason } = body;

    // TODO: Replace with proper authentication
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
    if (userId === 'dev-user-123' || !Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot cancel subscription for development user'
        },
        { status: 400 }
      );
    }

    // Get user's subscription
    const subscription = await Subscription.findByUserId(new Types.ObjectId(userId));

    if (!subscription) {
      return NextResponse.json(
        {
          success: false,
          error: 'No active subscription found'
        },
        { status: 404 }
      );
    }

    if (subscription.status === 'cancelled') {
      return NextResponse.json(
        {
          success: false,
          error: 'Subscription is already cancelled'
        },
        { status: 400 }
      );
    }

    // Cancel subscription using service
    const subscriptionService = new SubscriptionService();

    const result = await subscriptionService.cancelSubscription(
      subscription._id.toString(),
      immediately
    );

    // Add cancellation reason to metadata if provided
    if (reason) {
      result.metadata = {
        ...result.metadata,
        cancellationReason: reason,
        cancelledAt: new Date()
      };
      await result.save();
    }

    return NextResponse.json({
      success: true,
      data: {
        subscription: {
          id: result._id,
          status: result.status,
          cancelAtPeriodEnd: result.cancelAtPeriodEnd,
          currentPeriodEnd: result.currentPeriodEnd,
          cancelledImmediately: immediately
        },
        message: immediately
          ? 'Subscription cancelled immediately'
          : `Subscription will be cancelled at the end of the current period (${result.currentPeriodEnd.toDateString()})`
      }
    });

  } catch (error: any) {
    console.error('Cancel subscription error:', error);

    // Handle specific error types
    if (error.message.includes('Subscription not found')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Subscription not found'
        },
        { status: 404 }
      );
    }

    if (error.message.includes('already cancelled')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Subscription is already cancelled'
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to cancel subscription'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/subscriptions/cancel
 * Get cancellation information and options
 */
export async function GET(request: NextRequest) {
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

    // Handle development mock user ID vs real ObjectId
    if (userId === 'dev-user-123' || !Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'No subscription found for development user'
        },
        { status: 404 }
      );
    }

    // Get user's subscription
    const subscription = await Subscription.findByUserId(new Types.ObjectId(userId));

    if (!subscription) {
      return NextResponse.json(
        {
          success: false,
          error: 'No active subscription found'
        },
        { status: 404 }
      );
    }

    if (subscription.status === 'cancelled') {
      return NextResponse.json({
        success: true,
        data: {
          alreadyCancelled: true,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          currentPeriodEnd: subscription.currentPeriodEnd,
          message: subscription.cancelAtPeriodEnd
            ? `Your subscription will end on ${subscription.currentPeriodEnd.toDateString()}`
            : 'Your subscription has been cancelled'
        }
      });
    }

    // Calculate what user will lose by cancelling
    const plan = await subscription.populate('planId');
    const daysRemaining = subscription.daysUntilExpiry();

    // Get available plans for potential retention offers
    const { Plan } = await import('../../../../lib/database/models');
    const availablePlans = await Plan.findActivePlans();
    const downgradePlans = availablePlans.filter(p =>
      p.price.monthly < (plan.planId as any).price.monthly
    );

    return NextResponse.json({
      success: true,
      data: {
        currentSubscription: {
          id: subscription._id,
          status: subscription.status,
          planName: (plan.planId as any).name,
          currentPeriodEnd: subscription.currentPeriodEnd,
          daysRemaining
        },
        cancellationOptions: {
          immediate: {
            available: true,
            description: 'Cancel immediately and lose access to all features',
            effectiveDate: new Date()
          },
          atPeriodEnd: {
            available: true,
            description: `Keep access until ${subscription.currentPeriodEnd.toDateString()}`,
            effectiveDate: subscription.currentPeriodEnd
          }
        },
        retentionOffers: {
          downgradePlans: downgradePlans.map(p => ({
            id: p._id,
            name: p.name,
            price: p.price,
            savings: (plan.planId as any).price.monthly - p.price.monthly
          })),
          pauseOption: {
            available: false, // Not implemented yet
            description: 'Pause subscription for up to 3 months'
          }
        },
        commonReasons: [
          'Too expensive',
          'Not using enough features',
          'Found a better alternative',
          'Temporary financial constraints',
          'Technical issues',
          'Other'
        ]
      }
    });

  } catch (error: any) {
    console.error('Get cancellation info error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch cancellation information'
      },
      { status: 500 }
    );
  }
}