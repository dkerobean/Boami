import { NextRequest, NextResponse } from 'next/server';
import { Plan, User } from '../../../../lib/database/models';
import { connectDB } from '../../../../lib/database/mongoose-connection';
import { SubscriptionService } from '../../../../lib/services/SubscriptionService';
import { Types } from 'mongoose';

/**
 * POST /api/subscriptions/subscribe
 * Create a new subscription
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { userId, planId, paymentMethod, customerData } = body;

    // Validate required fields
    if (!userId || !planId || !paymentMethod || !customerData) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: userId, planId, paymentMethod, customerData'
        },
        { status: 400 }
      );
    }

    // Validate payment method
    if (!['monthly', 'annual', 'free'].includes(paymentMethod)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Payment method must be either "monthly", "annual", or "free"'
        },
        { status: 400 }
      );
    }

    // Validate customer data
    if (!customerData.email || !customerData.name) {
      return NextResponse.json(
        {
          success: false,
          error: 'Customer email and name are required'
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

    // Validate plan exists
    const plan = await Plan.findById(planId);
    if (!plan || !plan.isActive) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid or inactive plan'
        },
        { status: 404 }
      );
    }

    // Check if this is a free plan
    const isFree = plan.price.monthly === 0 && plan.price.annual === 0;

    // Create subscription using service
    const subscriptionService = new SubscriptionService();

    const result = await subscriptionService.createSubscription({
      userId,
      planId,
      paymentMethod: isFree ? 'free' : paymentMethod,
      customerData,
      metadata: {
        source: 'api',
        userAgent: request.headers.get('user-agent'),
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        isFree
      }
    });

    // For free plans, return success without payment link
    if (isFree) {
      return NextResponse.json({
        success: true,
        data: {
          subscription: {
            id: result.subscription._id,
            status: result.subscription.status,
            planId: result.subscription.planId,
            currentPeriodStart: result.subscription.currentPeriodStart,
            currentPeriodEnd: result.subscription.currentPeriodEnd,
            plan: result.subscription.planId
          },
          message: 'Free subscription activated successfully!'
        }
      }, { status: 201 });
    }

    // For paid plans, return payment link
    return NextResponse.json({
      success: true,
      data: {
        subscription: {
          id: result.subscription._id,
          status: result.subscription.status,
          planId: result.subscription.planId,
          currentPeriodStart: result.subscription.currentPeriodStart,
          currentPeriodEnd: result.subscription.currentPeriodEnd,
          plan: result.subscription.planId
        },
        paymentLink: result.paymentLink,
        message: 'Subscription created successfully. Please complete payment to activate.'
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('Create subscription error:', error);

    // Handle specific error types
    if (error.message.includes('already has an active subscription')) {
      return NextResponse.json(
        {
          success: false,
          error: 'User already has an active subscription'
        },
        { status: 409 }
      );
    }

    if (error.message.includes('User not found')) {
      return NextResponse.json(
        {
          success: false,
          error: 'User not found'
        },
        { status: 404 }
      );
    }

    if (error.message.includes('Invalid or inactive plan')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid or inactive plan'
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create subscription'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/subscriptions/subscribe
 * Get subscription creation form data (plans, etc.)
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Get all active plans
    const plans = await Plan.findActivePlans();

    // Transform plans for subscription form
    const transformedPlans = plans.map(plan => ({
      id: plan._id,
      name: plan.name,
      description: plan.description,
      price: {
        monthly: plan.price.monthly,
        annual: plan.price.annual,
        currency: plan.currency
      },
      features: Object.keys(plan.features).map(key => ({
        name: key,
        enabled: plan.features[key].enabled,
        limit: plan.features[key].limit,
        description: plan.features[key].description
      })),
      sortOrder: plan.sortOrder,
      popular: plan.sortOrder === 2, // Mark middle plan as popular
      savings: {
        annual: plan.getAnnualDiscount(),
        monthsFreeBenefit: Math.floor((plan.price.monthly * 12 - plan.price.annual) / plan.price.monthly)
      }
    }));

    // Get supported currencies and payment methods
    const { SUPPORTED_CURRENCIES } = await import('../../../../lib/config/flutterwave');

    return NextResponse.json({
      success: true,
      data: {
        plans: transformedPlans,
        supportedCurrencies: Object.keys(SUPPORTED_CURRENCIES),
        paymentMethods: ['monthly', 'annual'],
        defaultCurrency: 'GHS'
      }
    });

  } catch (error: any) {
    console.error('Get subscription form data error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch subscription form data'
      },
      { status: 500 }
    );
  }
}