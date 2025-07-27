import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { notificationAnalytics } from '@/lib/notifications/analytics';
import { connectToDatabase } from '@/lib/database/mongoose-connection';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'summary';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const userId = searchParams.get('userId');

    const timeRange = {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined
    };

    let result;

    switch (type) {
      case 'delivery':
        result = await notificationAnalytics.getDeliveryAnalytics(timeRange);
        break;
      case 'engagement':
        result = await notificationAnalytics.getEngagementAnalytics(timeRange);
        break;
      case 'queue':
        result = await notificationAnalytics.getQueueAnalytics();
        break;
      case 'user':
        if (!userId) {
          return NextResponse.json({ error: 'userId required for user analytics' }, { status: 400 });
        }
        result = await notificationAnalytics.getUserEngagementAnalytics(userId, timeRange);
        break;
      case 'top-types':
        result = await notificationAnalytics.getTopPerformingTypes(timeRange);
        break;
      case 'report':
        result = await notificationAnalytics.generateAnalyticsReport(timeRange);
        break;
      default:
        result = await notificationAnalytics.generateAnalyticsReport(timeRange);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { error: 'Failed to get analytics data' },
      { status: 500 }
    );
  }
}