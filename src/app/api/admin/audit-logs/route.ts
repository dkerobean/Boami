import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/database/mongoose-connection';
import { SubscriptionLogger } from '@/lib/utils/subscription-logger';
import { verifyJWT } from '@/lib/auth/jwt';
import { User } from '@/lib/database/models';

/**
 * GET /api/admin/audit-logs
 * Get audit logs (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    // Verify admin authentication
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      );
    }

    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const filters = {
      userId: searchParams.get('userId') || undefined,
      subscriptionId: searchParams.get('subscriptionId') || undefined,
      category: searchParams.get('category') || undefined,
      action: searchParams.get('action') || undefined,
      severity: searchParams.get('severity') || undefined,
      startDate: searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined,
      endDate: searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined,
      limit: parseInt(searchParams.get('limit') || '50'),
      offset: parseInt(searchParams.get('offset') || '0')
    };

    // Get audit logs
    const result = await SubscriptionLogger.getAuditLogs(filters);

    // Log admin access
    await SubscriptionLogger.logAccessActivity(
      'admin_audit_logs_accessed',
      { filters },
      {
        userId: authResult.userId,
        ipAddress: getClientIP(request),
        userAgent: request.headers.get('user-agent') || ''
      }
    );

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error: any) {
    console.error('Get audit logs error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get audit logs' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/audit-logs/stats
 * Get audit log statistics (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    // Verify admin authentication
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      );
    }

    const body = await request.json();
    const { action, days } = body;

    let result;

    switch (action) {
      case 'stats':
        result = await SubscriptionLogger.getAuditStats(days || 30);
        break;

      case 'security-alerts':
        result = await SubscriptionLogger.getSecurityAlerts(50);
        break;

      case 'cleanup':
        if (!body.confirm) {
          return NextResponse.json(
            { success: false, error: 'Cleanup requires confirmation' },
            { status: 400 }
          );
        }
        result = await SubscriptionLogger.cleanupOldLogs(days || 730);
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }

    // Log admin action
    await SubscriptionLogger.logAccessActivity(
      `admin_audit_${action}`,
      { days, result: typeof result === 'number' ? { count: result } : result },
      {
        userId: authResult.userId,
        ipAddress: getClientIP(request),
        userAgent: request.headers.get('user-agent') || ''
      }
    );

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error: any) {
    console.error('Audit logs action error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to perform audit action' },
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

/**
 * Get client IP address
 */
function getClientIP(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');

  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  if (realIP) {
    return realIP;
  }

  return request.ip || 'unknown';
}