import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-config';
import { SubscriptionMetricsService } from '@/lib/services/SubscriptionMetricsService';
import { errorHandler } from '@/lib/utils/error-handler';
import { subscriptionLogger } from '@/lib/utils/subscription-logger';

export async function GET(request: NextRequest) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const dateRange = parseInt(searchParams.get('dateRange') || '30');

    // Validate date range
    if (dateRange < 1 || dateRange > 365) {
      return NextResponse.json(
        { success: false, error: 'Date range must be between 1 and 365 days' },
        { status: 400 }
      );
    }

    subscriptionLogger.info('Fetching payment metrics', {
      adminId: session.user.id,
      dateRange
    });

    // Get payment metrics
    const metrics = await SubscriptionMetricsService.getPaymentMetrics(dateRange);

    subscriptionLogger.info('Payment metrics fetched successfully', {
      adminId: session.user.id,
      totalTransactions: metrics.totalTransactions,
      successRate: metrics.successRate
    });

    return NextResponse.json({
      success: true,
      data: {
        metrics,
        generatedAt: new Date().toISOString(),
        dateRange
      }
    });

  } catch (error: any) {
    subscriptionLogger.error('Error fetching payment metrics', {
      error: error.message,
      stack: error.stack
    });

    const handledError = errorHandler.handleError(error);
    return NextResponse.json(
      { success: false, error: handledError.message },
      { status: handledError.statusCode }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      dateRange = 30,
      exportFormat = 'json',
      includeFailureAnalysis = false
    } = body;

    // Validate input
    if (dateRange < 1 || dateRange > 365) {
      return NextResponse.json(
        { success: false, error: 'Date range must be between 1 and 365 days' },
        { status: 400 }
      );
    }

    if (!['json', 'csv'].includes(exportFormat)) {
      return NextResponse.json(
        { success: false, error: 'Export format must be json or csv' },
        { status: 400 }
      );
    }

    subscriptionLogger.info('Generating payment metrics report', {
      adminId: session.user.id,
      dateRange,
      exportFormat,
      includeFailureAnalysis
    });

    // Get payment metrics
    const metrics = await SubscriptionMetricsService.getPaymentMetrics(dateRange);

    const reportData = {
      metrics,
      generatedAt: new Date().toISOString(),
      dateRange,
      generatedBy: session.user.email
    };

    if (exportFormat === 'csv') {
      // Convert to CSV format
      const csvData = convertPaymentMetricsToCSV(reportData);

      return new NextResponse(csvData, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="payment-metrics-${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    }

    subscriptionLogger.info('Payment metrics report generated successfully', {
      adminId: session.user.id,
      reportSize: JSON.stringify(reportData).length
    });

    return NextResponse.json({
      success: true,
      data: reportData
    });

  } catch (error: any) {
    subscriptionLogger.error('Error generating payment metrics report', {
      error: error.message,
      stack: error.stack
    });

    const handledError = errorHandler.handleError(error);
    return NextResponse.json(
      { success: false, error: handledError.message },
      { status: handledError.statusCode }
    );
  }
}

function convertPaymentMetricsToCSV(data: any): string {
  const { metrics } = data;

  let csv = 'Payment Metrics Report\n\n';

  // Basic metrics
  csv += 'Metric,Value\n';
  csv += `Total Transactions,${metrics.totalTransactions}\n`;
  csv += `Successful Transactions,${metrics.successfulTransactions}\n`;
  csv += `Failed Transactions,${metrics.failedTransactions}\n`;
  csv += `Success Rate,${metrics.successRate.toFixed(2)}%\n`;
  csv += `Total Revenue,${metrics.totalRevenue}\n`;
  csv += `Average Transaction Amount,${metrics.averageTransactionAmount}\n`;
  csv += `Transactions Today,${metrics.transactionsToday}\n`;
  csv += `Transactions This Week,${metrics.transactionsThisWeek}\n`;
  csv += `Transactions This Month,${metrics.transactionsThisMonth}\n`;

  // Revenue by day
  if (metrics.revenueByDay?.length > 0) {
    csv += '\n\nDaily Revenue\n';
    csv += 'Date,Revenue,Transaction Count\n';
    metrics.revenueByDay.forEach((day: any) => {
      csv += `${day.date},${day.revenue},${day.transactionCount}\n`;
    });
  }

  // Failure reasons
  if (metrics.failureReasons?.length > 0) {
    csv += '\n\nFailure Reasons\n';
    csv += 'Reason,Count,Percentage\n';
    metrics.failureReasons.forEach((reason: any) => {
      csv += `${reason.reason},${reason.count},${reason.percentage.toFixed(2)}%\n`;
    });
  }

  return csv;
}