import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { StockAlertsService } from '@/lib/services/stock-alerts';

/**
 * DELETE /api/stock-alerts/clear
 * Clear all stock alerts or specific types
 */
// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin privileges
    const userRole = (session.user as any).role;
    if (userRole !== 'admin') {
      return NextResponse.json({
        error: 'Admin privileges required'
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'all', 'resolved', 'active', 'acknowledged'
    const olderThanDays = searchParams.get('olderThanDays');

    let deletedCount = 0;

    if (type === 'all') {
      // Get all alert IDs and delete them
      const { alerts } = await StockAlertsService.getStockAlerts({ limit: 10000 });
      const alertIds = alerts.map(alert => alert._id!);

      if (alertIds.length > 0) {
        const success = await StockAlertsService.deleteAlerts(alertIds);
        if (success) {
          deletedCount = alertIds.length;
        }
      }
    } else if (type === 'resolved' && olderThanDays) {
      // Delete resolved alerts older than specified days
      const days = parseInt(olderThanDays);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const { alerts } = await StockAlertsService.getStockAlerts({
        status: 'resolved',
        limit: 10000
      });

      const oldAlerts = alerts.filter(alert =>
        new Date(alert.createdAt) < cutoffDate
      );

      const alertIds = oldAlerts.map(alert => alert._id!);

      if (alertIds.length > 0) {
        const success = await StockAlertsService.deleteAlerts(alertIds);
        if (success) {
          deletedCount = alertIds.length;
        }
      }
    } else if (type && ['active', 'acknowledged', 'resolved'].includes(type)) {
      // Delete alerts with specific status
      const { alerts } = await StockAlertsService.getStockAlerts({
        status: type as any,
        limit: 10000
      });

      const alertIds = alerts.map(alert => alert._id!);

      if (alertIds.length > 0) {
        const success = await StockAlertsService.deleteAlerts(alertIds);
        if (success) {
          deletedCount = alertIds.length;
        }
      }
    } else {
      return NextResponse.json({
        error: 'Invalid type. Use: all, resolved, active, or acknowledged'
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `Cleared ${deletedCount} stock alert(s)`,
      deletedCount
    });

  } catch (error) {
    console.error('Error clearing stock alerts:', error);
    return NextResponse.json({
      error: 'Failed to clear stock alerts'
    }, { status: 500 });
  }
}