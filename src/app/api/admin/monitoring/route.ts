import { NextRequest, NextResponse } from 'next/server';
import { SubscriptionMonitor } from '@/lib/utils/subscription-monitor';
import { verifyJWT } from '@/lib/auth/jwt';
import { User } from '@/lib/database/models';

/**
 * GET /api/admin/monitoring
 * Get monitoring status and health reports (admin only)
 */
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
    const action = searchParams.get('action') || 'status';

    let result;

    switch (action) {
      case 'status':
        result = SubscriptionMonitor.getMonitoringStatus();
        break;

      case 'health':
        result = await SubscriptionMonitor.getHealthReport();
        break;

      case 'check':
        result = await SubscriptionMonitor.performHealthCheck();
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error: any) {
    console.error('Monitoring API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get monitoring data' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/monitoring
 * Control monitoring system (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      );
    }

    const body = await request.json();
    const { action, options = {} } = body;

    let result;

    switch (action) {
      case 'start':
        const interval = options.intervalMinutes || 5;
        SubscriptionMonitor.startMonitoring(interval);
        result = { message: `Monitoring started with ${interval} minute intervals` };
        break;

      case 'stop':
        SubscriptionMonitor.stopMonitoring();
        result = { message: 'Monitoring stopped' };
        break;

      case 'update-thresholds':
        if (!options.thresholds) {
          return NextResponse.json(
            { success: false, error: 'Thresholds are required' },
            { status: 400 }
          );
        }
        SubscriptionMonitor.updateThresholds(options.thresholds);
        result = { message: 'Alert thresholds updated', thresholds: options.thresholds };
        break;

      case 'clear-alerts':
        SubscriptionMonitor.clearAlertHistory();
        result = { message: 'Alert history cleared' };
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error: any) {
    console.error('Monitoring control error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to control monitoring system' },
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
    const user = await User.findById(decoded.userId);

    if (!user) {
      return {
        success: false,
        error: 'User not found',
        status: 404
      };
    }

    if (user.role !== 'admin') {
      return {
        success: false,
        error: 'Admin access required',
        status: 403
      };
    }

    return {
      success: true,
      userId: user._id.toString()
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