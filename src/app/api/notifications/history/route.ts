import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { notificationService } from '@/lib/notifications/notification-service';
import { connectToDatabase } from '@/lib/database/connection';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const userId = (session.user as any).id || session.user.email;

    const history = await notificationService.getNotificationHistory(userId, limit);

    return NextResponse.json(history);
  } catch (error) {
    console.error('Notification history error:', error);
    return NextResponse.json(
      { error: 'Failed to get notification history' },
      { status: 500 }
    );
  }
}