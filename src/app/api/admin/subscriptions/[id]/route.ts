import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/database/mongoose-connection';
import { Subscription, User, Plan } from '@/lib/database/models';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-config';

/**
 * GET /api/admin/subscriptions/[id]
 * Get a specific subscription (Admin only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const subscription = await Subscription.findById(params.id)
      .populate('userId', 'firstName lastName email phone')
      .populate('planId', 'name description price features');

    if (!subscription) {
      return NextResponse.json(
        { success: false, error: 'Subscription not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: subscription
    });

  } catch (error: any) {
    console.error('Admin subscription fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch subscription' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/subscriptions/[id]
 * Update a subscription (Admin only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const { status, planId, billingPeriod, cancelAtPeriodEnd, notes } = body;

    const subscription = await Subscription.findById(params.id);

    if (!subscription) {
      return NextResponse.json(
        { success: false, error: 'Subscription not found' },
        { status: 404 }
      );
    }

    // Update fields
    const updates: any = {};

    if (status !== undefined) {
      updates.status = status;
      updates.isActive = status === 'active';
    }

    if (planId !== undefined) {
      // Verify plan exists
      const plan = await Plan.findById(planId);
      if (!plan) {
        return NextResponse.json(
          { success: false, error: 'Plan not found' },
          { status: 404 }
        );
      }
      updates.planId = planId;
    }

    if (billingPeriod !== undefined) {
      updates.billingPeriod = billingPeriod;

      // Recalculate period end if billing period changes
      const now = new Date();
      const periodEnd = new Date(now);
      if (billingPeriod === 'monthly') {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      } else {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      }
      updates.currentPeriodEnd = periodEnd;
    }

    if (cancelAtPeriodEnd !== undefined) {
      updates.cancelAtPeriodEnd = cancelAtPeriodEnd;
    }

    if (notes !== undefined) {
      updates.adminNotes = notes;
    }

    updates.updatedAt = new Date();
    updates.updatedBy = session.user.id;

    const updatedSubscription = await Subscription.findByIdAndUpdate(
      params.id,
      updates,
      { new: true }
    ).populate('userId', 'firstName lastName email phone')
     .populate('planId', 'name description price features');

    return NextResponse.json({
      success: true,
      data: updatedSubscription,
      message: 'Subscription updated successfully'
    });

  } catch (error: any) {
    console.error('Admin subscription update error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update subscription' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/subscriptions/[id]
 * Delete a subscription (Admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const subscription = await Subscription.findById(params.id);

    if (!subscription) {
      return NextResponse.json(
        { success: false, error: 'Subscription not found' },
        { status: 404 }
      );
    }

    // Soft delete - mark as deleted instead of removing
    await Subscription.findByIdAndUpdate(params.id, {
      status: 'deleted',
      isActive: false,
      deletedAt: new Date(),
      deletedBy: session.user.id
    });

    return NextResponse.json({
      success: true,
      message: 'Subscription deleted successfully'
    });

  } catch (error: any) {
    console.error('Admin subscription delete error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete subscription' },
      { status: 500 }
    );
  }
}