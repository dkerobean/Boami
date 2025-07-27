import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/database/mongoose-connection';
import { SubscriptionEmailIntegration } from '@/lib/services/SubscriptionEmailIntegration';

/**
 * GET /api/cron/email-notifications
 * Cron job endpoint for sending subscription email notifications
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron job secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || !authHeader || !authHeader.startsWith('Bearer ') || authHeader.split(' ')[1] !== cronSecret) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const task = searchParams.get('task') || 'renewal-reminders';

    let result;

    switch (task) {
      case 'renewal-reminders':
        result = await SubscriptionEmailIntegration.sendBatchRenewalReminders();
        break;

      case 'test':
        const testEmail = searchParams.get('email');
        if (!testEmail) {
          return NextResponse.json(
            { success: false, error: 'Test email address required' },
            { status: 400 }
          );
        }
        result = await SubscriptionEmailIntegration.testSubscriptionEmails(testEmail);
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Unknown task' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      task,
      data: result
    });

  } catch (error: any) {
    console.error('Email notifications cron job error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Email notifications cron job failed' },
      { status: 500 }
    );
  }
}