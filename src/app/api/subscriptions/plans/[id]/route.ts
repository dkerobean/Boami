import { NextRequest, NextResponse } from 'next/server';
import { Plan } from '../../../../../lib/database/models';
import { connectDB } from '../../../../../lib/database/mongoose-connection';

/**
 * GET /api/subscriptions/plans/[id]
 * Get specific subscription plan details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const plan = await Plan.findById(params.id);
    if (!plan || !plan.isActive) {
      return NextResponse.json(
        {
          success: false,
          error: 'Plan not found'
        },
        { status: 404 }
      );
    }

    // Transform plan for client consumption
    const transformedPlan = {
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
      featureList: Object.keys(plan.features).map(key => ({
        name: key,
        enabled: plan.features[key].enabled,
        limit: plan.features[key].limit,
        description: plan.features[key].description
      }))
    };

    return NextResponse.json({
      success: true,
      data: transformedPlan
    });

  } catch (error: any) {
    console.error('Get plan error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch subscription plan'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/subscriptions/plans/[id]
 * Update subscription plan (Admin only)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    // TODO: Add admin authentication middleware

    const plan = await Plan.findById(params.id);
    if (!plan) {
      return NextResponse.json(
        {
          success: false,
          error: 'Plan not found'
        },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, description, price, currency, features, sortOrder, isActive } = body;

    // Update plan fields
    if (name !== undefined) plan.name = name;
    if (description !== undefined) plan.description = description;
    if (price !== undefined) {
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
      plan.price = price;
    }
    if (currency !== undefined) plan.currency = currency;
    if (features !== undefined) plan.features = features;
    if (sortOrder !== undefined) plan.sortOrder = sortOrder;
    if (isActive !== undefined) plan.isActive = isActive;

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
    });

  } catch (error: any) {
    console.error('Update plan error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update subscription plan'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/subscriptions/plans/[id]
 * Delete subscription plan (Admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    // TODO: Add admin authentication middleware

    const plan = await Plan.findById(params.id);
    if (!plan) {
      return NextResponse.json(
        {
          success: false,
          error: 'Plan not found'
        },
        { status: 404 }
      );
    }

    // Check if plan has active subscriptions
    const { Subscription } = await import('../../../../../lib/database/models');
    const activeSubscriptions = await Subscription.countDocuments({
      planId: plan._id,
      status: 'active'
    });

    if (activeSubscriptions > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete plan with ${activeSubscriptions} active subscriptions. Deactivate the plan instead.`
        },
        { status: 409 }
      );
    }

    // Soft delete by deactivating
    plan.isActive = false;
    await plan.save();

    return NextResponse.json({
      success: true,
      message: 'Plan deactivated successfully'
    });

  } catch (error: any) {
    console.error('Delete plan error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete subscription plan'
      },
      { status: 500 }
    );
  }
}