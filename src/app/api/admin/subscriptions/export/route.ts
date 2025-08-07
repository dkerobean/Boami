import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/database/connection';
import { Subscription } from '@/lib/database/models';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-config';

/**
 * GET /api/admin/subscriptions/export
 * Export subscriptions to CSV (Admin only)
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

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'csv';
    const status = searchParams.get('status') || 'all';

    // Build filter
    const filter: any = {};
    if (status !== 'all') {
      filter.status = status;
    }

    // Get subscriptions with user and plan data
    const subscriptions = await Subscription.aggregate([
      {
        $match: filter
      },
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
      }
    ]);

    if (format === 'csv') {
      // Generate CSV
      const csvHeaders = [
        'Subscription ID',
        'User Name',
        'User Email',
        'Plan Name',
        'Status',
        'Is Active',
        'Billing Period',
        'Monthly Price',
        'Currency',
        'Current Period Start',
        'Current Period End',
        'Cancel At Period End',
        'Created At',
        'Updated At'
      ];

      const csvRows = subscriptions.map(sub => [
        sub._id.toString(),
        `${sub.user.firstName} ${sub.user.lastName}`,
        sub.user.email,
        sub.plan.name,
        sub.status,
        sub.isActive ? 'Yes' : 'No',
        sub.billingPeriod,
        sub.plan.price.monthly,
        sub.plan.price.currency,
        new Date(sub.currentPeriodStart).toISOString().split('T')[0],
        new Date(sub.currentPeriodEnd).toISOString().split('T')[0],
        sub.cancelAtPeriodEnd ? 'Yes' : 'No',
        new Date(sub.createdAt).toISOString().split('T')[0],
        new Date(sub.updatedAt).toISOString().split('T')[0]
      ]);

      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.map(field => `"${field}"`).join(','))
      ].join('\n');

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="subscriptions-${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    }

    if (format === 'json') {
      // Return JSON format
      return NextResponse.json({
        success: true,
        data: subscriptions,
        exportedAt: new Date().toISOString(),
        totalRecords: subscriptions.length
      });
    }

    return NextResponse.json(
      { success: false, error: 'Unsupported export format' },
      { status: 400 }
    );

  } catch (error: any) {
    console.error('Admin subscription export error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to export subscriptions' },
      { status: 500 }
    );
  }
}