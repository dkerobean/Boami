import { NextRequest, NextResponse } from 'next/server';
import { SubscriptionMonitoringService } from '@/lib/services/SubscriptionMonitoringService';
import { subscriptionLogger } from '@/lib/utils/subscription-logger';

export async function GET(request: NextRequest) {
  try {
    // Verify cron job authorization
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      subscriptionLogger.warn('Unauthorized cron job access attempt', {
        authHeader,
        userAgent: request.headers.get('user-agent'),
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
      });

      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    subscriptionLogger.info('Starting automated system health check');

    // Perform system health check
    const healthMetrics = await SubscriptionMonitoringService.getSystemHealth();

    // Log health status
    subscriptionLogger.info('System health check completed', {
      status: healthMetrics.status,
      paymentSuccessRate: healthMetrics.metrics.paymentSuccessRate,
      subscriptionErrors: healthMetrics.metrics.subscriptionErrors,
      webhookFailures: healthMetrics.metrics.webhookFailures,
      alertCount: healthMetrics.alerts.length,
      uptime: healthMetrics.uptime
    });

    // Clean up old alerts (older than 7 days)
    const clearedAlerts = SubscriptionMonitoringService.clearOldAlerts(7);
    if (clearedAlerts > 0) {
      subscriptionLogger.info('Old alerts cleared', { clearedCount: clearedAlerts });
    }

    // Send critical alerts if system is in critical state
    if (healthMetrics.status === 'critical') {
      subscriptionLogger.error('System in critical state', {
        status: healthMetrics.status,
        metrics: healthMetrics.metrics,
        activeAlerts: healthMetrics.alerts.length
      });

      // Here you would integrate with your alerting system
      // For example, send email, Slack notification, or webhook
      await sendCriticalSystemAlert(healthMetrics);
    }

    return NextResponse.json({
      success: true,
      data: {
        status: healthMetrics.status,
        timestamp: new Date().toISOString(),
        metrics: healthMetrics.metrics,
        alertCount: healthMetrics.alerts.length,
        clearedAlerts
      }
    });

  } catch (error: any) {
    subscriptionLogger.error('Error in system health check cron job', {
      error: error.message,
      stack: error.stack
    });

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Send critical system alert
 */
async function sendCriticalSystemAlert(healthMetrics: any): Promise<void> {
  try {
    // This would integrate with your notification system
    // For now, we'll just log the critical alert

    const alertMessage = `
🚨 CRITICAL SYSTEM ALERT 🚨

System Status: ${healthMetrics.status.toUpperCase()}
Timestamp: ${new Date().toISOString()}

Metrics:
- Payment Success Rate: ${healthMetrics.metrics.paymentSuccessRate.toFixed(2)}%
- Subscription Errors: ${healthMetrics.metrics.subscriptionErrors}
- Webhook Failures: ${healthMetrics.metrics.webhookFailures}
- Database Connectivity: ${healthMetrics.metrics.databaseConnectivity ? 'OK' : 'FAILED'}
- Flutterwave Connectivity: ${healthMetrics.metrics.flutterwaveConnectivity ? 'OK' : 'FAILED'}

Active Alerts: ${healthMetrics.alerts.length}
${healthMetrics.alerts.map((alert: any) => `- ${alert.type}: ${alert.message}`).join('\n')}

Please investigate immediately.
    `;

    subscriptionLogger.error('Critical system alert', {
      alertMessage,
      healthMetrics
    });

    // Example integrations (uncomment and configure as needed):

    // Send email alert
    // await sendEmailAlert({
    //   to: process.env.ADMIN_EMAIL,
    //   subject: 'CRITICAL: Subscription System Alert',
    //   body: alertMessage
    // });

    // Send Slack notification
    // await sendSlackAlert({
    //   channel: '#alerts',
    //   message: alertMessage
    // });

    // Send webhook notification
    // await sendWebhookAlert({
    //   url: process.env.ALERT_WEBHOOK_URL,
    //   payload: {
    //     type: 'critical_system_alert',
    //     status: healthMetrics.status,
    //     metrics: healthMetrics.metrics,
    //     alerts: healthMetrics.alerts,
    //     timestamp: new Date().toISOString()
    //   }
    // });

  } catch (error: any) {
    subscriptionLogger.error('Failed to send critical system alert', {
      error: error.message,
      stack: error.stack
    });
  }
}

// Example email alert function (implement based on your email service)
async function sendEmailAlert(params: { to: string; subject: string; body: string }): Promise<void> {
  // Implementation would depend on your email service (SendGrid, AWS SES, etc.)
  // This is just a placeholder
  console.log('Email alert would be sent:', params);
}

// Example Slack alert function (implement based on your Slack integration)
async function sendSlackAlert(params: { channel: string; message: string }): Promise<void> {
  // Implementation would use Slack Web API or webhook
  // This is just a placeholder
  console.log('Slack alert would be sent:', params);
}

// Example webhook alert function
async function sendWebhookAlert(params: { url: string; payload: any }): Promise<void> {
  try {
    if (!params.url) return;

    const response = await fetch(params.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SubscriptionSystem/1.0'
      },
      body: JSON.stringify(params.payload)
    });

    if (!response.ok) {
      throw new Error(`Webhook failed with status ${response.status}`);
    }

    subscriptionLogger.info('Webhook alert sent successfully', {
      url: params.url,
      status: response.status
    });

  } catch (error: any) {
    subscriptionLogger.error('Failed to send webhook alert', {
      url: params.url,
      error: error.message
    });
  }
}