import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { notificationService } from '@/lib/notifications/notification-service';
import { stockAlertMonitor } from '@/lib/notifications/monitors/stock-alert-monitor';
import { taskMonitor } from '@/lib/notifications/monitors/task-monitor';
import { invoiceMonitor } from '@/lib/notifications/monitors/invoice-monitor';
import { subscriptionMonitor } from '@/lib/notifications/monitors/subscription-monitor';
import { connectToDatabase } from '@/lib/database/mongoose-connection';

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type, subType } = await request.json();
    const userId = (session.user as any).id || session.user.email;

    let result;

    switch (type) {
      case 'stock':
        result = await stockAlertMonitor.testStockAlert(userId);
        break;
      case 'task':
        result = await taskMonitor.testTaskNotification(userId, subType || 'assigned');
        break;
      case 'invoice':
        result = await invoiceMonitor.testInvoiceNotification(userId, subType || 'status_changed');
        break;
      case 'subscription':
        result = await subscriptionMonitor.testSubscriptionNotification(userId, subType || 'renewal');
        break;
      case 'notification':
        result = await notificationService.testNotification(userId, subType || 'stock_alert');
        break;
      default:
        return NextResponse.json({ error: 'Invalid test type' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `Test ${type} notification sent successfully`,
      result
    });
  } catch (error) {
    console.error('Test notification error:', error);
    return NextResponse.json(
      { error: 'Failed to send test notification' },
      { status: 500 }
    );
  }
}