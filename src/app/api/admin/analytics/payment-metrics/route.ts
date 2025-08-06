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

    if (session.user.role?.name !== 'admin') {
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

    await subscriptionLogger.logAccessActivity('admin_fetch_payment_metrics', {
      adminId: session.user.id,
      dateRange
    }, {
      userId: session.user.id,
      severity: 'info'
    });

    // Get payment metrics
    const metrics = await SubscriptionMetricsService.getPaymentMetrics(dateRange);

    await subscriptionLogger.logAccessActivity('admin_payment_metrics_success', {
      adminId: session.user.id,
      totalTransactions: metrics.totalTransactions,
      successRate: metrics.successRate
    }, {
      userId: session.user.id,
      severity: 'info'
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
    await subscriptionLogger.logAccessActivity('admin_payment_metrics_error', {
      error: error.message,
      stack: error.stack
    }, {
      severity: 'error'
    });

    const handledError = errorHandler.handleError(error);
    const statusCode = handledError.severity === 'critical' ? 500 :
                      handledError.severity === 'high' ? 500 :
                      handledError.category === 'authentication' ? 401 :
                      handledError.category === 'authorization' ? 403 :
                      handledError.category === 'validation' ? 400 : 500;

    return NextResponse.json(
      { success: false, error: handledError.message },
      { status: statusCode }
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

    if (session.user.role?.name !== 'admin') {
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

    await subscriptionLogger.logAccessActivity('admin_generate_payment_report', {
      adminId: session.user.id,
      dateRange,
      exportFormat,
      includeFailureAnalysis
    }, {
      userId: session.user.id,
      severity: 'info'
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

    await subscriptionLogger.logAccessActivity('admin_payment_report_success', {
      adminId: session.user.id,
      reportSize: JSON.stringify(reportData).length
    }, {
      userId: session.user.id,
      severity: 'info'
    });

    return NextResponse.json({
      success: true,
      data: reportData
    });

  } catch (error: any) {
    await subscriptionLogger.logAccessActivity('admin_payment_report_error', {
      error: error.message,
      stack: error.stack
    }, {
      severity: 'error'
    });

    const handledError = errorHandler.handleError(error);
    const statusCode = handledError.severity === 'critical' ? 500 :
                      handledError.severity === 'high' ? 500 :
                      handledError.category === 'authentication' ? 401 :
                      handledError.category === 'authorization' ? 403 :
                      handledError.category === 'validation' ? 400 : 500;

    return NextResponse.json(
      { success: false, error: handledError.message },
      { status: statusCode }
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