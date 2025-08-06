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
    const includeChurn = searchParams.get('includeChurn') === 'true';
    const includeTrends = searchParams.get('includeTrends') === 'true';

    // Validate date range
    if (dateRange < 1 || dateRange > 365) {
      return NextResponse.json(
        { success: false, error: 'Date range must be between 1 and 365 days' },
        { status: 400 }
      );
    }

    await subscriptionLogger.logAccessActivity('admin_fetch_subscription_metrics', {
      adminId: session.user.id,
      dateRange,
      includeChurn,
      includeTrends
    }, {
      userId: session.user.id,
      severity: 'info'
    });

    // Get subscription metrics
    const metrics = await SubscriptionMetricsService.getSubscriptionMetrics(dateRange);

    // Get additional data if requested
    const additionalData: any = {};

    if (includeChurn) {
      additionalData.churnAnalysis = await SubscriptionMetricsService.getChurnAnalysis(dateRange);
    }

    if (includeTrends) {
      additionalData.trends = await SubscriptionMetricsService.getSubscriptionTrends(dateRange);
    }

    await subscriptionLogger.logAccessActivity('admin_subscription_metrics_success', {
      adminId: session.user.id,
      metricsCount: Object.keys(metrics).length
    }, {
      userId: session.user.id,
      severity: 'info'
    });

    return NextResponse.json({
      success: true,
      data: {
        metrics,
        ...additionalData,
        generatedAt: new Date().toISOString(),
        dateRange
      }
    });

  } catch (error: any) {
    await subscriptionLogger.logAccessActivity('admin_subscription_metrics_error', {
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
      includeChurn = false,
      includeTrends = false,
      exportFormat = 'json'
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

    await subscriptionLogger.logAccessActivity('admin_generate_subscription_report', {
      adminId: session.user.id,
      dateRange,
      includeChurn,
      includeTrends,
      exportFormat
    }, {
      userId: session.user.id,
      severity: 'info'
    });

    // Get comprehensive metrics
    const [metrics, churnAnalysis, trends] = await Promise.all([
      SubscriptionMetricsService.getSubscriptionMetrics(dateRange),
      includeChurn ? SubscriptionMetricsService.getChurnAnalysis(dateRange) : null,
      includeTrends ? SubscriptionMetricsService.getSubscriptionTrends(dateRange) : null
    ]);

    const reportData = {
      metrics,
      churnAnalysis,
      trends,
      generatedAt: new Date().toISOString(),
      dateRange,
      generatedBy: session.user.email
    };

    if (exportFormat === 'csv') {
      // Convert to CSV format
      const csvData = convertMetricsToCSV(reportData);

      return new NextResponse(csvData, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="subscription-metrics-${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    }

    await subscriptionLogger.logAccessActivity('admin_subscription_report_success', {
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
    await subscriptionLogger.logAccessActivity('admin_subscription_report_error', {
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

function convertMetricsToCSV(data: any): string {
  const { metrics, churnAnalysis, trends } = data;

  let csv = 'Subscription Metrics Report\n\n';

  // Basic metrics
  csv += 'Metric,Value\n';
  csv += `Total Subscriptions,${metrics.totalSubscriptions}\n`;
  csv += `Active Subscriptions,${metrics.activeSubscriptions}\n`;
  csv += `Cancelled Subscriptions,${metrics.cancelledSubscriptions}\n`;
  csv += `Expired Subscriptions,${metrics.expiredSubscriptions}\n`;
  csv += `Past Due Subscriptions,${metrics.pastDueSubscriptions}\n`;
  csv += `Conversion Rate,${metrics.conversionRate.toFixed(2)}%\n`;
  csv += `Churn Rate,${metrics.churnRate.toFixed(2)}%\n`;
  csv += `Monthly Recurring Revenue,${metrics.monthlyRecurringRevenue}\n`;
  csv += `Annual Recurring Revenue,${metrics.annualRecurringRevenue}\n`;
  csv += `Average Revenue Per User,${metrics.averageRevenuePerUser}\n`;
  csv += `Customer Lifetime Value,${metrics.customerLifetimeValue}\n`;

  // Top plans
  if (metrics.topPlans?.length > 0) {
    csv += '\n\nTop Plans\n';
    csv += 'Plan Name,Subscription Count,Revenue\n';
    metrics.topPlans.forEach((plan: any) => {
      csv += `${plan.planName},${plan.subscriptionCount},${plan.revenue}\n`;
    });
  }

  // Churn analysis
  if (churnAnalysis) {
    csv += '\n\nChurn Reasons\n';
    csv += 'Reason,Count,Percentage\n';
    churnAnalysis.churnReasons.forEach((reason: any) => {
      csv += `${reason.reason},${reason.count},${reason.percentage.toFixed(2)}%\n`;
    });
  }

  // Trends
  if (trends?.length > 0) {
    csv += '\n\nDaily Trends\n';
    csv += 'Date,New Subscriptions,Cancelled Subscriptions,Revenue\n';
    trends.forEach((trend: any) => {
      csv += `${trend.date},${trend.newSubscriptions},${trend.cancelledSubscriptions},${trend.revenue}\n`;
    });
  }

  return csv;
}