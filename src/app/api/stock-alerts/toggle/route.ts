import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

/**
 * POST /api/stock-alerts/toggle
 * Toggle stock alerts on/off for the current user or globally
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, scope } = await request.json();

    // Validate input
    if (!['enable', 'disable'].includes(action)) {
      return NextResponse.json({
        error: 'Invalid action. Use "enable" or "disable"'
      }, { status: 400 });
    }

    if (!['user', 'global'].includes(scope)) {
      return NextResponse.json({
        error: 'Invalid scope. Use "user" or "global"'
      }, { status: 400 });
    }

    // Check if user has admin privileges for global changes
    const userRole = (session.user as any).role;
    if (scope === 'global' && userRole !== 'admin') {
      return NextResponse.json({
        error: 'Admin privileges required for global changes'
      }, { status: 403 });
    }

    if (scope === 'user') {
      // Update user's notification preferences
      const { preferenceManager } = await import('@/lib/notifications/preference-manager');
      const userId = (session.user as any).id || session.user.email;

      await preferenceManager.updateUserPreferences(userId, {
        stockAlerts: action === 'enable'
      });

      return NextResponse.json({
        success: true,
        message: `Stock alerts ${action}d for your account`,
        scope: 'user',
        enabled: action === 'enable'
      });
    } else {
      // Global toggle would require environment variable changes
      // For now, we'll just return a message
      return NextResponse.json({
        success: true,
        message: `To ${action} stock alerts globally, set STOCK_ALERTS_ENABLED=${action === 'enable'} in your environment variables and restart the application`,
        scope: 'global',
        action: action
      });
    }

  } catch (error) {
    console.error('Error toggling stock alerts:', error);
    return NextResponse.json({
      error: 'Failed to toggle stock alerts'
    }, { status: 500 });
  }
}

/**
 * GET /api/stock-alerts/toggle
 * Get current stock alerts status
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { isStockAlertsEnabled, isNotificationChannelEnabled } = await import('@/lib/config/stock-alerts-config');
    const { preferenceManager } = await import('@/lib/notifications/preference-manager');

    const userId = (session.user as any).id || session.user.email;
    const userPreferences = await preferenceManager.getUserPreferences(userId);

    return NextResponse.json({
      global: {
        enabled: isStockAlertsEnabled(),
        inApp: isNotificationChannelEnabled('IN_APP'),
        email: isNotificationChannelEnabled('EMAIL')
      },
      user: {
        stockAlerts: userPreferences?.stockAlerts ?? true
      }
    });

  } catch (error) {
    console.error('Error getting stock alerts status:', error);
    return NextResponse.json({
      error: 'Failed to get stock alerts status'
    }, { status: 500 });
  }
}