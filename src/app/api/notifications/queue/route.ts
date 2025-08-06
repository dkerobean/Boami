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

    // Check if user is admin (you may need to adjust this based on your auth setup)
    const userRole = (session.user as any).role;
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const stats = await notificationService.getQueueStats();

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Queue stats error:', error);
    return NextResponse.json(
      { error: 'Failed to get queue statistics' },
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

    // Check if user is admin
    const userRole = (session.user as any).role;
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { action } = await request.json();

    if (action === 'process') {
      const result = await notificationService.processQueue();
      return NextResponse.json({
        success: true,
        message: 'Queue processed successfully',
        result
      });
    } else if (action === 'cleanup') {
      const result = await notificationService.cleanupOldData();
      return NextResponse.json({
        success: true,
        message: 'Old data cleaned up successfully',
        result
      });
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Queue action error:', error);
    return NextResponse.json(
      { error: 'Failed to perform queue action' },
      { status: 500 }
    );
  }
}