import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/database/mongoose-connection';
import { RecurringPaymentProcessor } from '@/lib/services/RecurringPaymentProcessor';
import { verifyJWT } from '@/lib/auth/jwt';

/**
 * POST /api/finance/recurring/process
 * Processes due recurring payments
 * Can be called manually or by scheduled jobs
 */
export async function POST(request: NextRequest) {
  try {
    // Check for cron job authentication or user authentication
    const cronSecret = request.headers.get('x-cron-secret');
    const authToken = request.headers.get('authorization')?.replace('Bearer ', '');

    let userId: string | null = null;
    let isSystemJob = false;

    // Verify authentication
    if (cronSecret) {
      // Cron job authentication
      if (cronSecret !== process.env.CRON_SECRET) {
        return NextResponse.json(
          { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid cron secret' } },
          { status: 401 }
        );
      }
      isSystemJob = true;
    } else if (authToken) {
      // User authentication
      const decoded = verifyJWT(authToken);
      if (!decoded || !decoded.userId) {
        return NextResponse.json(
          { success: false, error: { code: 'INVALID_TOKEN', message: 'Invalid authentication token' } },
          { status: 401 }
        );
      }
      userId = decoded.userId;
    } else {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    await connectDB();

    // Parse request body for options
    const body = await request.json().catch(() => ({}));
    const { forceProcess = false, specificPaymentId } = body;

    let result;

    if (specificPaymentId) {
      // Process specific recurring payment
      result = await RecurringPaymentProcessor.processSpecificRecurringPayment(
        specificPaymentId,
        userId || undefined
      );
    } else if (isSystemJob || forceProcess) {
      // Process all due payments (system-wide)
      result = await RecurringPaymentProcessor.processAllDueRecurringPayments();
    } else if (userId) {
      // Process user-specific due payments
      result = await RecurringPaymentProcessor.processUserRecurringPayments(userId);
    } else {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_REQUEST', message: 'Invalid processing request' } },
        { status: 400 }
      );
    }

    // Log processing results
    console.log('Recurring payment processing completed:', {
      success: result.success,
      processedCount: result.processedCount,
      createdRecords: result.createdRecords.length,
      errors: result.errors.length,
      deactivatedCount: result.deactivatedCount,
      userId: userId || 'system',
      timestamp: new Date().toISOString()
    });

    // Return results
    return NextResponse.json({
      success: true,
      data: {
        processedCount: result.processedCount,
        createdRecords: result.createdRecords,
        deactivatedCount: result.deactivatedCount,
        hasErrors: result.errors.length > 0,
        errorCount: result.errors.length,
        errors: result.errors
      },
      message: `Successfully processed ${result.processedCount} recurring payments`
    });

  } catch (error) {
    console.error('Recurring payment processing error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'PROCESSING_ERROR',
          message: 'Failed to process recurring payments',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/finance/recurring/process
 * Gets information about upcoming and overdue recurring payments
 */
export async function GET(request: NextRequest) {
  try {
    // Verify user authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const decoded = verifyJWT(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_TOKEN', message: 'Invalid authentication token' } },
        { status: 401 }
      );
    }

    await connectDB();

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const daysAhead = parseInt(searchParams.get('daysAhead') || '30');
    const includeOverdue = searchParams.get('includeOverdue') === 'true';

    // Get upcoming schedule
    const upcomingSchedule = await RecurringPaymentProcessor.getUpcomingSchedule(
      decoded.userId,
      daysAhead
    );

    // Get overdue payments if requested
    let overduePayments: any[] = [];
    if (includeOverdue) {
      overduePayments = await RecurringPaymentProcessor.getOverduePayments(decoded.userId);
    }

    // Calculate summary statistics
    const summary = {
      upcoming: upcomingSchedule.filter(p => !p.isOverdue).length,
      overdue: overduePayments.length,
      totalIncome: upcomingSchedule
        .filter(p => p.type === 'income')
        .reduce((sum, p) => sum + p.amount, 0),
      totalExpenses: upcomingSchedule
        .filter(p => p.type === 'expense')
        .reduce((sum, p) => sum + p.amount, 0)
    };

    return NextResponse.json({
      success: true,
      data: {
        upcomingSchedule,
        overduePayments,
        summary
      }
    });

  } catch (error) {
    console.error('Recurring payment schedule error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SCHEDULE_ERROR',
          message: 'Failed to retrieve recurring payment schedule'
        }
      },
      { status: 500 }
    );
  }
}