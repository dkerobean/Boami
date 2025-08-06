import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-config';
import { SubscriptionMonitoringService } from '@/lib/services/SubscriptionMonitoringService';
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

    await subscriptionLogger.logSecurityActivity('system_health_fetch', {
      adminId: session.user.id
    }, {
      userId: session.user.id,
      severity: 'info'
    });

    // Get system health metrics
    const healthMetrics = await SubscriptionMonitoringService.getSystemHealth();

    await subscriptionLogger.logSecurityActivity('system_health_fetched', {
      adminId: session.user.id,
      status: healthMetrics.status,
      alertCount: healthMetrics.alerts.length
    }, {
      userId: session.user.id,
      severity: 'info'
    });

    return NextResponse.json({
      success: true,
      data: healthMetrics
    });

  } catch (error: any) {
    await subscriptionLogger.logSecurityActivity('system_health_fetch_failed', {
      error: error.message,
      stack: error.stack
    }, {
      severity: 'error'
    });

    const handledError = errorHandler.handleError(error);
    
    // Map error severity to HTTP status code
    const statusCode = handledError.severity === 'critical' ? 500 :
                      handledError.severity === 'high' ? 500 :
                      handledError.severity === 'medium' ? 400 : 400;
    
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
    const { action, alertId, ruleId, ruleData } = body;

    await subscriptionLogger.logSecurityActivity('system_health_action_requested', {
      adminId: session.user.id,
      action,
      alertId,
      ruleId
    }, {
      userId: session.user.id,
      severity: 'info'
    });

    let result: any = {};

    switch (action) {
      case 'resolve_alert':
        if (!alertId) {
          return NextResponse.json(
            { success: false, error: 'Alert ID is required' },
            { status: 400 }
          );
        }

        const resolved = SubscriptionMonitoringService.resolveAlert(alertId);
        if (!resolved) {
          return NextResponse.json(
            { success: false, error: 'Alert not found' },
            { status: 404 }
          );
        }

        result = { alertId, resolved: true };
        break;

      case 'clear_old_alerts':
        const { days = 7 } = body;
        const clearedCount = SubscriptionMonitoringService.clearOldAlerts(days);
        result = { clearedCount };
        break;

      case 'update_monitoring_rule':
        if (!ruleId || !ruleData) {
          return NextResponse.json(
            { success: false, error: 'Rule ID and rule data are required' },
            { status: 400 }
          );
        }

        const updated = SubscriptionMonitoringService.updateMonitoringRule(ruleId, ruleData);
        if (!updated) {
          return NextResponse.json(
            { success: false, error: 'Monitoring rule not found' },
            { status: 404 }
          );
        }

        result = { ruleId, updated: true };
        break;

      case 'add_monitoring_rule':
        if (!ruleData) {
          return NextResponse.json(
            { success: false, error: 'Rule data is required' },
            { status: 400 }
          );
        }

        // Validate required fields
        const requiredFields = ['id', 'name', 'type', 'threshold', 'operator', 'timeWindow', 'alertSeverity'];
        for (const field of requiredFields) {
          if (!ruleData[field]) {
            return NextResponse.json(
              { success: false, error: `${field} is required` },
              { status: 400 }
            );
          }
        }

        SubscriptionMonitoringService.addMonitoringRule(ruleData);
        result = { ruleId: ruleData.id, added: true };
        break;

      case 'remove_monitoring_rule':
        if (!ruleId) {
          return NextResponse.json(
            { success: false, error: 'Rule ID is required' },
            { status: 400 }
          );
        }

        const removed = SubscriptionMonitoringService.removeMonitoringRule(ruleId);
        if (!removed) {
          return NextResponse.json(
            { success: false, error: 'Monitoring rule not found' },
            { status: 404 }
          );
        }

        result = { ruleId, removed: true };
        break;

      case 'get_monitoring_rules':
        result = { rules: SubscriptionMonitoringService.getMonitoringRules() };
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }

    await subscriptionLogger.logSecurityActivity('system_health_action_completed', {
      adminId: session.user.id,
      action,
      result
    }, {
      userId: session.user.id,
      severity: 'info'
    });

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error: any) {
    await subscriptionLogger.logSecurityActivity('system_health_action_failed', {
      error: error.message,
      stack: error.stack
    }, {
      severity: 'error'
    });

    const handledError = errorHandler.handleError(error);
    
    // Map error severity to HTTP status code
    const statusCode = handledError.severity === 'critical' ? 500 :
                      handledError.severity === 'high' ? 500 :
                      handledError.severity === 'medium' ? 400 : 400;
    
    return NextResponse.json(
      { success: false, error: handledError.message },
      { status: statusCode }
    );
  }
}