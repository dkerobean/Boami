import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { RealNotificationsService } from '@/lib/services/real-notifications';
import { connectToDatabase } from '@/lib/database/mongoose-connection';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const session = await getServerSession();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '8');
    const format = searchParams.get('format') || 'full'; // 'full' or 'header'

    const userId = session?.user ? (session.user as any).id || session.user.email : undefined;

    if (format === 'header') {
      // Format for header component compatibility
      const notifications = await RealNotificationsService.getFormattedNotifications(userId, limit);
      return NextResponse.json(notifications);
    } else {
      // Full notification objects
      const notifications = await RealNotificationsService.getRealNotifications(userId, limit);
      const count = await RealNotificationsService.getNotificationCount(userId);

      return NextResponse.json({
        notifications,
        count,
        unreadCount: notifications.filter(n => !n.isRead).length
      });
    }

  } catch (error) {
    console.error('Real notifications API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, notificationId } = await request.json();

    if (action === 'mark_read' && notificationId) {
      const success = await RealNotificationsService.markAsRead(notificationId);

      return NextResponse.json({
        success,
        message: success ? 'Notification marked as read' : 'Failed to mark as read'
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Real notifications POST error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}