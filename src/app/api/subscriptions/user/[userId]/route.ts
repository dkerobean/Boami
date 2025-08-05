import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../../../../lib/database/mongoose-connection';
import { Subscription, User } from '../../../../../lib/database/models';

/**
 * GET /api/subscriptions/user/[userId]
 * Get user's current subscription
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    await connectDB();

    const { userId } = params;

    // Validate user ID
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'User ID is required'
        },
        { status: 400 }
      );
    }

    // Validate user exists
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'User not found'
        },
        { status: 404 }
      );
    }

    // Find user's current subscription
    const subscription = await Subscription.findOne({
      userId,
      status: { $in: ['active', 'trialing'] }
    })
    .populate('planId')
    .sort({ createdAt: -1 }); // Get the most recent active subscription

    if (!subscription) {
      return NextResponse.json(
        {
          success: false,
          error: 'No active subscription found',
          data: null
        },
        { status: 404 }
      );
    }

    // Format subscription data
    const subscriptionData = {
      _id: subscription._id,
      userId: subscription.userId,
      planId: subscription.planId,
      status: subscription.status,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      createdAt: subscription.createdAt,
      updatedAt: subscription.updatedAt,
      plan: subscription.planId ? {
        _id: subscription.planId._id,
        name: subscription.planId.name,
        description: subscription.planId.description,
        price: subscription.planId.price,
        currency: subscription.planId.currency,
        features: subscription.planId.features
      } : null,
      payment: subscription.payment ? {
        method: subscription.payment.method,
        status: subscription.payment.status,
        amount: subscription.payment.amount,
        currency: subscription.payment.currency,
        reference: subscription.payment.reference
      } : null
    };

    return NextResponse.json({
      success: true,
      data: subscriptionData
    });

  } catch (error: any) {
    console.error('Get user subscription error:', error);

    // Handle specific error types
    if (error.message.includes('User not found')) {
      return NextResponse.json(
        {
          success: false,
          error: 'User not found'
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch subscription'
      },
      { status: 500 }
    );
  }
}