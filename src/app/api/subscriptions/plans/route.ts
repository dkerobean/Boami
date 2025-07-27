import { NextRequest, NextResponse } from 'next/server';
import { Plan } from '../../../../lib/database/models';
import { connectDB } from '../../../../lib/database/mongoose-connection';

/**
 * GET /api/subscriptions/plans
 * Get all available subscription plans
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Get all active plans sorted by sortOrder
    const plans = await Plan.findActivePlans();

    // Transform plans for client consumption
    const transformedPlans = plans.map(plan => ({
      id: plan._id,
      name: plan.name,
      description: plan.description,
      price: {
        monthly: plan.price.monthly,
        annual: plan.price.annual,
        currency: plan.currency
      },
      features: plan.features,
      sortOrder: plan.sortOrder,
      pricing: {
        monthly: {
          amount: plan.price.monthly,
          period: 'month',
          currency: plan.currency
        },
        annual: {
          amount: plan.price.annual,
          period: 'year',
          currency: plan.currency,
          discount: plan.getAnnualDiscount(),
          monthlyEquivalent: Math.round(plan.price.annual / 12)
        }
      },
      popular: plan.sortOrder === 2 // Mark middle plan as popular
    }));

    return NextResponse.json({
      success: true,
      data: transformedPlans
    });

  } catch (error: any) {
    console.error('Get plans error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch subscription plans'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/subscriptions/plans
 * Create a new subscription plan (Admin only)
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // TODO: Add admin authentication middleware
    // For now, we'll skip authentication but this should be protected

    const body = await request.json();
    const { name, description, price, currency, features, sortOrder } = body;

    // Validate required fields
    if (!name || !description || !price || !features) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: name, description, price, features'
        },
        { status: 400 }
      );
    }

    // Validate price structure
    if (!price.monthly || !price.annual || price.monthly <= 0 || price.annual <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid price structure. Both monthly and annual prices are required and must be positive'
        },
        { status: 400 }
      );
    }

    // Check if plan name already exists
    const existingPlan = await Plan.findByName(name);
    if (existingPlan) {
      return NextResponse.json(
        {
          success: false,
          error: 'Plan with this name already exists'
        },
        { status: 409 }
      );
    }

    // Create new plan
    const plan = new Plan({
      name,
      description,
      price,
      currency: currency || 'NGN',
      features,
      sortOrder: sortOrder || 0,
      isActive: true
    });

    await plan.save();

    return NextResponse.json({
      success: true,
      data: {
        id: plan._id,
        name: plan.name,
        description: plan.description,
        price: plan.price,
        currency: plan.currency,
        features: plan.features,
        sortOrder: plan.sortOrder,
        isActive: plan.isActive
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('Create plan error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create subscription plan'
      },
      { status: 500 }
    );
  }
}