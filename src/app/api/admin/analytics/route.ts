import { NextRequest, NextResponse } from 'next/server';
import { SubscriptionAnalyticsService } from '@/lib/services/SubscriptionAnalyticsService';
import { verifyJWT } from '@/lib/auth/jwt';
import { User } from '@/lib/database/models';

/**
 * GET /api/admin/analytics
 * Get subscription analytics (admin only)
 */
// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'metrics';
    const timeframe = searchParams.get('timeframe') || '30d';

    let result;

    switch (type) {
      case 'metrics':
        result = await SubscriptionAnalyticsService.getSubscriptionMetrics(timeframe);
        break;

      case 'conversion':
        result = await SubscriptionAnalyticsService.getConversionMetrics(timeframe);
        break;

      case 'churn':
        result = await SubscriptionAnalyticsService.getChurnAnalysis(timeframe);
        break;

      case 'payment':
        result = await SubscriptionAnalyticsService.getPaymentMetrics(timeframe);
        break;

      case 'cohort':
        const months = parseInt(searchParams.get('months') || '12');
        result = await SubscriptionAnalyticsService.getCohortAnalysis(months);
        break;

      case 'alerts':
        result = await SubscriptionAnalyticsService.getSubscriptionAlerts();
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid analytics type' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error: any) {
    console.error('Analytics error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get analytics data' },
      { status: 500 }
    );
  }
}

/**
 * Verify admin authentication
 */
async function verifyAdminAuth(request: NextRequest): Promise<{
  success: boolean;
  error?: string;
  status?: number;
  userId?: string;
}> {
  try {
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        success: false,
        error: 'Missing or invalid authorization header',
        status: 401
      };
    }

    const token = authHeader.split(' ')[1];
    const decoded = await verifyJWT(token);

    if (!decoded || !decoded.userId) {
      return {
        success: false,
        error: 'Invalid token',
        status: 401
      };
    }

    // Check if user is admin
    const user = await User.findById(decoded.userId).populate('role');

    if (!user) {
      return {
        success: false,
        error: 'User not found',
        status: 404
      };
    }

    if ((user.role as any)?.name !== 'admin') {
      return {
        success: false,
        error: 'Admin access required',
        status: 403
      };
    }

    return {
      success: true,
      userId: (user._id as any).toString()
    };

  } catch (error) {
    console.error('Admin auth verification error:', error);
    return {
      success: false,
      error: 'Authentication failed',
      status: 401
    };
  }
}