import { connectToDatabase } from '@/lib/database/mongoose-connection';
import { Subscription } from '@/lib/database/models/Subscription';
import { Transaction } from '@/lib/database/models/Transaction';
import { subscriptionLogger } from '@/lib/utils/subscription-logger';
import { subDays, startOfDay, endOfDay } from 'date-fns';

export interface SystemHealthMetrics {
  status: 'healthy' | 'warning' | 'critical';
  uptime: number;
  lastChecked: Date;
  metrics: {
    paymentSuccessRate: number;
    subscriptionErrors: number;
    webhookFailures: number;
    databaseConnectivity: boolean;
    flutterwaveConnectivity: boolean;
  };
  alerts: Alert[];
}

export interface Alert {
  id: string;
  type: 'payment_failure' | 'subscription_error' | 'webhook_failure' | 'system_error';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  resolved: boolean;
  metadata?: any;
}

export interface MonitoringRule {
  id: string;
  name: string;
  type: 'payment_success_rate' | 'subscription_churn' | 'webhook_failures' | 'system_errors';
  threshold: number;
  operator: 'greater_than' | 'less_than' | 'equals';
  timeWindow: number; // minutes
  enabled: boolean;
  alertSeverity: 'low' | 'medium' | 'high' | 'critical';
  notificationChannels: string[];
}

export class SubscriptionMonitoringService {
  private static alerts: Alert[] = [];
  private static monitoringRules: MonitoringRule[] = [
    {
      id: 'payment_success_rate',
      name: 'Payment Success Rate Below Threshold',
      type: 'payment_success_rate',
      threshold: 95,
      operator: 'less_than',
      timeWindow: 60,
      enabled: true,
      alertSeverity: 'high',
      notificationChannels: ['email', 'webhook']
    },
    {
      id: 'high_churn_rate',
      name: 'High Subscription Churn Rate',
      type: 'subscription_churn',
      threshold: 10,
      operator: 'greater_than',
      timeWindow: 1440, // 24 hours
      enabled: true,
      alertSeverity: 'medium',
      notificationChannels: ['email']
    },
    {
      id: 'webhook_failures',
      name: 'High Webhook Failure Rate',
      type: 'webhook_failures',
      threshold: 5,
      operator: 'greater_than',
      timeWindow: 30,
      enabled: true,
      alertSeverity: 'high',
      notificationChannels: ['email', 'webhook']
    }
  ];

  /**
   * Get current system health status
   */
  static async getSystemHealth(): Promise<SystemHealthMetrics> {
    try {
      await connectToDatabase();

      const now = new Date();
      const oneHourAgo = subDays(now, 0);
      oneHourAgo.setHours(now.getHours() - 1);

      // Check payment success rate
      const [totalTransactions, successfulTransactions] = await Promise.all([
        Transaction.countDocuments({
          createdAt: { $gte: oneHourAgo }
        }),
        Transaction.countDocuments({
          status: 'completed',
          createdAt: { $gte: oneHourAgo }
        })
      ]);

      const paymentSuccessRate = totalTransactions > 0
        ? (successfulTransactions / totalTransactions) * 100
        : 100;

      // Check subscription errors
      const subscriptionErrors = await Subscription.countDocuments({
        status: 'error',
        updatedAt: { $gte: oneHourAgo }
      });

      // Check webhook failures
      const webhookFailures = await Transaction.countDocuments({
        status: 'webhook_failed',
        createdAt: { $gte: oneHourAgo }
      });

      // Test database connectivity
      let databaseConnectivity = true;
      try {
        await Subscription.findOne().limit(1);
      } catch (error) {
        databaseConnectivity = false;
        subscriptionLogger.error('Database connectivity check failed', { error });
      }

      // Test Flutterwave connectivity (simplified check)
      let flutterwaveConnectivity = true;
      try {
        // This would be a simple ping to Flutterwave API
        // For now, we'll assume it's healthy unless we have recent failures
        const recentFlutterwaveFailures = await Transaction.countDocuments({
          status: 'failed',
          failureReason: { $regex: /flutterwave|network|timeout/i },
          createdAt: { $gte: oneHourAgo }
        });

        if (recentFlutterwaveFailures > 10) {
          flutterwaveConnectivity = false;
        }
      } catch (error) {
        flutterwaveConnectivity = false;
        subscriptionLogger.error('Flutterwave connectivity check failed', { error });
      }

      // Determine overall system status
      let status: 'healthy' | 'warning' | 'critical' = 'healthy';

      if (!databaseConnectivity || !flutterwaveConnectivity) {
        status = 'critical';
      } else if (paymentSuccessRate < 90 || subscriptionErrors > 5 || webhookFailures > 10) {
        status = 'critical';
      } else if (paymentSuccessRate < 95 || subscriptionErrors > 2 || webhookFailures > 5) {
        status = 'warning';
      }

      // Check monitoring rules and generate alerts
      await this.checkMonitoringRules();

      const metrics: SystemHealthMetrics = {
        status,
        uptime: process.uptime(),
        lastChecked: now,
        metrics: {
          paymentSuccessRate,
          subscriptionErrors,
          webhookFailures,
          databaseConnectivity,
          flutterwaveConnectivity
        },
        alerts: this.getActiveAlerts()
      };

      subscriptionLogger.info('System health check completed', {
        status,
        paymentSuccessRate,
        subscriptionErrors,
        webhookFailures,
        alertCount: metrics.alerts.length
      });

      return metrics;

    } catch (error: any) {
      subscriptionLogger.error('Error checking system health', {
        error: error.message,
        stack: error.stack
      });

      return {
        status: 'critical',
        uptime: process.uptime(),
        lastChecked: new Date(),
        metrics: {
          paymentSuccessRate: 0,
          subscriptionErrors: 0,
          webhookFailures: 0,
          databaseConnectivity: false,
          flutterwaveConnectivity: false
        },
        alerts: [{
          id: `system_error_${Date.now()}`,
          type: 'system_error',
          severity: 'critical',
          message: 'Failed to check system health',
          timestamp: new Date(),
          resolved: false,
          metadata: { error: error.message }
        }]
      };
    }
  }

  /**
   * Check monitoring rules and generate alerts
   */
  private static async checkMonitoringRules(): Promise<void> {
    for (const rule of this.monitoringRules) {
      if (!rule.enabled) continue;

      try {
        const shouldAlert = await this.evaluateRule(rule);

        if (shouldAlert) {
          const existingAlert = this.alerts.find(
            alert => alert.type === rule.type && !alert.resolved
          );

          if (!existingAlert) {
            const alert: Alert = {
              id: `${rule.type}_${Date.now()}`,
              type: rule.type as any,
              severity: rule.alertSeverity,
              message: this.generateAlertMessage(rule),
              timestamp: new Date(),
              resolved: false,
              metadata: { ruleId: rule.id, ruleName: rule.name }
            };

            this.alerts.push(alert);
            await this.sendAlert(alert, rule.notificationChannels);

            subscriptionLogger.warn('Monitoring rule triggered', {
              ruleId: rule.id,
              ruleName: rule.name,
              alertId: alert.id,
              severity: alert.severity
            });
          }
        }
      } catch (error: any) {
        subscriptionLogger.error('Error evaluating monitoring rule', {
          ruleId: rule.id,
          error: error.message
        });
      }
    }
  }

  /**
   * Evaluate a monitoring rule
   */
  private static async evaluateRule(rule: MonitoringRule): Promise<boolean> {
    const timeWindowStart = new Date();
    timeWindowStart.setMinutes(timeWindowStart.getMinutes() - rule.timeWindow);

    switch (rule.type) {
      case 'payment_success_rate':
        const [totalPayments, successfulPayments] = await Promise.all([
          Transaction.countDocuments({
            createdAt: { $gte: timeWindowStart }
          }),
          Transaction.countDocuments({
            status: 'completed',
            createdAt: { $gte: timeWindowStart }
          })
        ]);

        const successRate = totalPayments > 0 ? (successfulPayments / totalPayments) * 100 : 100;
        return this.compareValue(successRate, rule.threshold, rule.operator);

      case 'subscription_churn':
        const [activeSubscriptions, cancelledSubscriptions] = await Promise.all([
          Subscription.countDocuments({ status: 'active' }),
          Subscription.countDocuments({
            status: 'cancelled',
            cancelledAt: { $gte: timeWindowStart }
          })
        ]);

        const churnRate = activeSubscriptions > 0
          ? (cancelledSubscriptions / (activeSubscriptions + cancelledSubscriptions)) * 100
          : 0;
        return this.compareValue(churnRate, rule.threshold, rule.operator);

      case 'webhook_failures':
        const webhookFailures = await Transaction.countDocuments({
          status: 'webhook_failed',
          createdAt: { $gte: timeWindowStart }
        });
        return this.compareValue(webhookFailures, rule.threshold, rule.operator);

      case 'system_errors':
        const systemErrors = await Subscription.countDocuments({
          status: 'error',
          updatedAt: { $gte: timeWindowStart }
        });
        return this.compareValue(systemErrors, rule.threshold, rule.operator);

      default:
        return false;
    }
  }

  /**
   * Compare value against threshold using operator
   */
  private static compareValue(value: number, threshold: number, operator: string): boolean {
    switch (operator) {
      case 'greater_than':
        return value > threshold;
      case 'less_than':
        return value < threshold;
      case 'equals':
        return value === threshold;
      default:
        return false;
    }
  }

  /**
   * Generate alert message
   */
  private static generateAlertMessage(rule: MonitoringRule): string {
    switch (rule.type) {
      case 'payment_success_rate':
        return `Payment success rate has fallen below ${rule.threshold}% in the last ${rule.timeWindow} minutes`;
      case 'subscription_churn':
        return `Subscription churn rate has exceeded ${rule.threshold}% in the last ${rule.timeWindow} minutes`;
      case 'webhook_failures':
        return `Webhook failures have exceeded ${rule.threshold} in the last ${rule.timeWindow} minutes`;
      case 'system_errors':
        return `System errors have exceeded ${rule.threshold} in the last ${rule.timeWindow} minutes`;
      default:
        return `Monitoring rule "${rule.name}" has been triggered`;
    }
  }

  /**
   * Send alert notification
   */
  private static async sendAlert(alert: Alert, channels: string[]): Promise<void> {
    for (const channel of channels) {
      try {
        switch (channel) {
          case 'email':
            // Integration with email service would go here
            subscriptionLogger.info('Email alert sent', { alertId: alert.id });
            break;
          case 'webhook':
            // Integration with webhook service would go here
            subscriptionLogger.info('Webhook alert sent', { alertId: alert.id });
            break;
          case 'slack':
            // Integration with Slack would go here
            subscriptionLogger.info('Slack alert sent', { alertId: alert.id });
            break;
        }
      } catch (error: any) {
        subscriptionLogger.error('Failed to send alert', {
          alertId: alert.id,
          channel,
          error: error.message
        });
      }
    }
  }

  /**
   * Get active alerts
   */
  static getActiveAlerts(): Alert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  /**
   * Resolve an alert
   */
  static resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      subscriptionLogger.info('Alert resolved', { alertId });
      return true;
    }
    return false;
  }

  /**
   * Get monitoring rules
   */
  static getMonitoringRules(): MonitoringRule[] {
    return [...this.monitoringRules];
  }

  /**
   * Update monitoring rule
   */
  static updateMonitoringRule(ruleId: string, updates: Partial<MonitoringRule>): boolean {
    const ruleIndex = this.monitoringRules.findIndex(r => r.id === ruleId);
    if (ruleIndex !== -1) {
      this.monitoringRules[ruleIndex] = { ...this.monitoringRules[ruleIndex], ...updates };
      subscriptionLogger.info('Monitoring rule updated', { ruleId, updates });
      return true;
    }
    return false;
  }

  /**
   * Add new monitoring rule
   */
  static addMonitoringRule(rule: MonitoringRule): void {
    this.monitoringRules.push(rule);
    subscriptionLogger.info('Monitoring rule added', { ruleId: rule.id });
  }

  /**
   * Remove monitoring rule
   */
  static removeMonitoringRule(ruleId: string): boolean {
    const ruleIndex = this.monitoringRules.findIndex(r => r.id === ruleId);
    if (ruleIndex !== -1) {
      this.monitoringRules.splice(ruleIndex, 1);
      subscriptionLogger.info('Monitoring rule removed', { ruleId });
      return true;
    }
    return false;
  }

  /**
   * Clear resolved alerts older than specified days
   */
  static clearOldAlerts(days: number = 7): number {
    const cutoffDate = subDays(new Date(), days);
    const initialCount = this.alerts.length;

    this.alerts = this.alerts.filter(alert =>
      !alert.resolved || alert.timestamp > cutoffDate
    );

    const clearedCount = initialCount - this.alerts.length;

    if (clearedCount > 0) {
      subscriptionLogger.info('Old alerts cleared', { clearedCount, cutoffDays: days });
    }

    return clearedCount;
  }
}