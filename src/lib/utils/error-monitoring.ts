/**
 * Error monitoring and alerting system for subscription operations
 */

import { SubscriptionError, PaymentError, WebhookError, ERROR_CODES } from '../errors/SubscriptionErrors';
import { subscriptionLogger, LogCategory } from './subscription-logger';

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  condition: AlertCondition;
  actions: AlertAction[];
  enabled: boolean;
  cooldownMinutes: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface AlertCondition {
  type: 'error_rate' | 'error_count' | 'specific_error' | 'payment_failure_rate' | 'webhook_failure_rate';
  threshold: number;
  timeWindowMinutes: number;
  errorCodes?: string[];
  categories?: LogCategory[];
}

export interface AlertAction {
  type: 'email' | 'slack' | 'webhook' | 'sms';
  target: string;
  template?: string;
  enabled: boolean;
}

export interface AlertEvent {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: string;
  message: string;
  details: Record<string, any>;
  triggeredAt: Date;
  resolvedAt?: Date;
  status: 'active' | 'resolved' | 'suppressed';
}

class ErrorMonitoringService {
  private alertRules: AlertRule[] = [];
  private activeAlerts: Map<string, AlertEvent> = new Map();
  private errorCounts: Map<string, { count: number; timestamp: Date }[]> = new Map();
  private lastAlertTimes: Map<string, Date> = new Map();

  constructor() {
    this.initializeDefaultRules();
    this.startMonitoring();
  }

  private initializeDefaultRules(): void {
    this.alertRules = [
      {
        id: 'payment_failure_rate',
        name: 'High Payment Failure Rate',
        description: 'Alert when payment failure rate exceeds threshold',
        condition: {
          type: 'payment_failure_rate',
          threshold: 0.1, // 10% failure rate
          timeWindowMinutes: 15,
          errorCodes: [ERROR_CODES.PAYMENT_FAILED, ERROR_CODES.PAYMENT_VERIFICATION_FAILED]
        },
        actions: [
          {
            type: 'email',
            target: process.env.ALERT_EMAIL || 'admin@example.com',
            enabled: true
          },
          {
            type: 'slack',
            target: process.env.SLACK_WEBHOOK_URL || '',
            enabled: !!process.env.SLACK_WEBHOOK_URL
          }
        ],
        enabled: true,
        cooldownMinutes: 30,
        severity: 'high'
      },
      {
        id: 'webhook_failure_spike',
        name: 'Webhook Failure Spike',
        description: 'Alert when webhook failures spike',
        condition: {
          type: 'error_count',
          threshold: 10,
          timeWindowMinutes: 5,
          categories: [LogCategory.SUBSCRIPTION]
        },
        actions: [
          {
            type: 'email',
            target: process.env.ALERT_EMAIL || 'admin@example.com',
            enabled: true
          }
        ],
        enabled: true,
        cooldownMinutes: 15,
        severity: 'medium'
      },
      {
        id: 'critical_subscription_errors',
        name: 'Critical Subscription Errors',
        description: 'Alert on any critical subscription system errors',
        condition: {
          type: 'specific_error',
          threshold: 1,
          timeWindowMinutes: 1,
          errorCodes: [
            ERROR_CODES.DATABASE_ERROR,
            ERROR_CODES.EXTERNAL_SERVICE_ERROR,
            ERROR_CODES.INTERNAL_SERVER_ERROR
          ]
        },
        actions: [
          {
            type: 'email',
            target: process.env.ALERT_EMAIL || 'admin@example.com',
            enabled: true
          },
          {
            type: 'sms',
            target: process.env.ALERT_PHONE || '',
            enabled: !!process.env.ALERT_PHONE
          }
        ],
        enabled: true,
        cooldownMinutes: 5,
        severity: 'critical'
      },
      {
        id: 'subscription_creation_failures',
        name: 'Subscription Creation Failures',
        description: 'Alert when subscription creation fails repeatedly',
        condition: {
          type: 'error_count',
          threshold: 5,
          timeWindowMinutes: 10,
          errorCodes: [ERROR_CODES.SUBSCRIPTION_CREATION_FAILED]
        },
        actions: [
          {
            type: 'email',
            target: process.env.ALERT_EMAIL || 'admin@example.com',
            enabled: true
          }
        ],
        enabled: true,
        cooldownMinutes: 20,
        severity: 'medium'
      }
    ];
  }

  private startMonitoring(): void {
    // Check for alerts every minute
    setInterval(() => {
      this.checkAlertConditions();
    }, 60000);

    // Clean up old error counts every 5 minutes
    setInterval(() => {
      this.cleanupOldErrorCounts();
    }, 300000);
  }

  public recordError(error: Error, context?: Record<string, any>): void {
    const errorKey = this.getErrorKey(error);
    const now = new Date();

    // Record error count
    if (!this.errorCounts.has(errorKey)) {
      this.errorCounts.set(errorKey, []);
    }
    this.errorCounts.get(errorKey)!.push({ count: 1, timestamp: now });

    // Log the error
    subscriptionLogger.error('Error recorded for monitoring', {
      error: error.message,
      category: LogCategory.SUBSCRIPTION,
      metadata: { errorKey, ...context }
    });
  }

  private getErrorKey(error: Error): string {
    if (error instanceof SubscriptionError) {
      return `${error.constructor.name}:${error.code}`;
    }
    return `${error.constructor.name}:${error.message}`;
  }

  private checkAlertConditions(): void {
    for (const rule of this.alertRules) {
      if (!rule.enabled) continue;

      // Check cooldown
      const lastAlertTime = this.lastAlertTimes.get(rule.id);
      if (lastAlertTime) {
        const cooldownMs = rule.cooldownMinutes * 60 * 1000;
        if (Date.now() - lastAlertTime.getTime() < cooldownMs) {
          continue;
        }
      }

      const shouldAlert = this.evaluateCondition(rule.condition);
      if (shouldAlert) {
        this.triggerAlert(rule);
      }
    }
  }

  private evaluateCondition(condition: AlertCondition): boolean {
    const now = new Date();
    const windowStart = new Date(now.getTime() - condition.timeWindowMinutes * 60 * 1000);

    switch (condition.type) {
      case 'error_count':
        return this.checkErrorCount(condition, windowStart, now);
      case 'error_rate':
        return this.checkErrorRate(condition, windowStart, now);
      case 'specific_error':
        return this.checkSpecificErrors(condition, windowStart, now);
      case 'payment_failure_rate':
        return this.checkPaymentFailureRate(condition, windowStart, now);
      case 'webhook_failure_rate':
        return this.checkWebhookFailureRate(condition, windowStart, now);
      default:
        return false;
    }
  }

  private checkErrorCount(condition: AlertCondition, windowStart: Date, windowEnd: Date): boolean {
    let totalCount = 0;

    for (const [errorKey, counts] of Array.from(this.errorCounts.entries())) {
      // Filter by error codes if specified
      if (condition.errorCodes && condition.errorCodes.length > 0) {
        const matchesErrorCode = condition.errorCodes.some(code => errorKey.includes(code));
        if (!matchesErrorCode) continue;
      }

      // Count errors in time window
      const windowCounts = counts.filter(c => c.timestamp >= windowStart && c.timestamp <= windowEnd);
      totalCount += windowCounts.reduce((sum, c) => sum + c.count, 0);
    }

    return totalCount >= condition.threshold;
  }

  private checkErrorRate(condition: AlertCondition, windowStart: Date, windowEnd: Date): boolean {
    // This would require tracking total requests as well as errors
    // For now, we'll use error count as a proxy
    return this.checkErrorCount(condition, windowStart, windowEnd);
  }

  private checkSpecificErrors(condition: AlertCondition, windowStart: Date, windowEnd: Date): boolean {
    if (!condition.errorCodes || condition.errorCodes.length === 0) return false;

    for (const errorCode of condition.errorCodes) {
      for (const [errorKey, counts] of Array.from(this.errorCounts.entries())) {
        if (errorKey.includes(errorCode)) {
          const windowCounts = counts.filter(c => c.timestamp >= windowStart && c.timestamp <= windowEnd);
          const totalCount = windowCounts.reduce((sum, c) => sum + c.count, 0);
          if (totalCount >= condition.threshold) {
            return true;
          }
        }
      }
    }

    return false;
  }

  private checkPaymentFailureRate(condition: AlertCondition, windowStart: Date, windowEnd: Date): boolean {
    // This would require tracking successful payments as well
    // For now, we'll check if payment failures exceed a threshold
    return this.checkSpecificErrors(condition, windowStart, windowEnd);
  }

  private checkWebhookFailureRate(condition: AlertCondition, windowStart: Date, windowEnd: Date): boolean {
    // Similar to payment failure rate
    return this.checkErrorCount(condition, windowStart, windowEnd);
  }

  private async triggerAlert(rule: AlertRule): Promise<void> {
    const alertId = `alert_${rule.id}_${Date.now()}`;
    const alertEvent: AlertEvent = {
      id: alertId,
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      message: `Alert triggered: ${rule.name}`,
      details: {
        description: rule.description,
        condition: rule.condition,
        triggeredAt: new Date()
      },
      triggeredAt: new Date(),
      status: 'active'
    };

    this.activeAlerts.set(alertId, alertEvent);
    this.lastAlertTimes.set(rule.id, new Date());

    // Log the alert
    subscriptionLogger.error(`Alert triggered: ${rule.name}`, {
      category: LogCategory.SUBSCRIPTION,
      metadata: { alertId, ruleId: rule.id, severity: rule.severity }
    });

    // Execute alert actions
    for (const action of rule.actions) {
      if (action.enabled) {
        await this.executeAlertAction(action, alertEvent);
      }
    }
  }

  private async executeAlertAction(action: AlertAction, alert: AlertEvent): Promise<void> {
    try {
      switch (action.type) {
        case 'email':
          await this.sendEmailAlert(action.target, alert);
          break;
        case 'slack':
          await this.sendSlackAlert(action.target, alert);
          break;
        case 'webhook':
          await this.sendWebhookAlert(action.target, alert);
          break;
        case 'sms':
          await this.sendSmsAlert(action.target, alert);
          break;
      }

      subscriptionLogger.info(`Alert action executed: ${action.type}`, {
        alertId: alert.id, actionType: action.type, target: action.target
      });
    } catch (error) {
      subscriptionLogger.error(`Failed to execute alert action: ${action.type}`, {
        error: error instanceof Error ? error.message : String(error),
        alertId: alert.id,
        actionType: action.type
      });
    }
  }

  private async sendEmailAlert(email: string, alert: AlertEvent): Promise<void> {
    // In a real implementation, you would integrate with an email service
    console.log(`Email alert sent to ${email}:`, alert.message);
  }

  private async sendSlackAlert(webhookUrl: string, alert: AlertEvent): Promise<void> {
    if (!webhookUrl) return;

    const payload = {
      text: `🚨 ${alert.severity.toUpperCase()} Alert: ${alert.ruleName}`,
      attachments: [
        {
          color: this.getSeverityColor(alert.severity),
          fields: [
            {
              title: 'Message',
              value: alert.message,
              short: false
            },
            {
              title: 'Severity',
              value: alert.severity.toUpperCase(),
              short: true
            },
            {
              title: 'Triggered At',
              value: alert.triggeredAt.toISOString(),
              short: true
            }
          ]
        }
      ]
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Slack webhook failed: ${response.status}`);
    }
  }

  private async sendWebhookAlert(webhookUrl: string, alert: AlertEvent): Promise<void> {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(alert)
    });

    if (!response.ok) {
      throw new Error(`Webhook alert failed: ${response.status}`);
    }
  }

  private async sendSmsAlert(phoneNumber: string, alert: AlertEvent): Promise<void> {
    // In a real implementation, you would integrate with an SMS service
    console.log(`SMS alert sent to ${phoneNumber}:`, alert.message);
  }

  private getSeverityColor(severity: string): string {
    const colors = {
      low: '#36a64f',
      medium: '#ff9500',
      high: '#ff0000',
      critical: '#8b0000'
    };
    return colors[severity as keyof typeof colors] || '#cccccc';
  }

  private cleanupOldErrorCounts(): void {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

    for (const [errorKey, counts] of Array.from(this.errorCounts.entries())) {
      const recentCounts = counts.filter(c => c.timestamp > cutoffTime);
      if (recentCounts.length === 0) {
        this.errorCounts.delete(errorKey);
      } else {
        this.errorCounts.set(errorKey, recentCounts);
      }
    }
  }

  // Public methods for managing alerts
  public addAlertRule(rule: AlertRule): void {
    this.alertRules.push(rule);
  }

  public removeAlertRule(ruleId: string): void {
    this.alertRules = this.alertRules.filter(rule => rule.id !== ruleId);
  }

  public getActiveAlerts(): AlertEvent[] {
    return Array.from(this.activeAlerts.values());
  }

  public resolveAlert(alertId: string): void {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.status = 'resolved';
      alert.resolvedAt = new Date();
      subscriptionLogger.info(`Alert resolved: ${alert.ruleName}`, {
        alertId, resolvedAt: alert.resolvedAt
      });
    }
  }

  public getErrorStatistics(timeWindowMinutes: number = 60): Record<string, any> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - timeWindowMinutes * 60 * 1000);

    const stats: Record<string, any> = {
      totalErrors: 0,
      errorsByType: {},
      errorsByCode: {},
      timeWindow: `${timeWindowMinutes} minutes`
    };

    for (const [errorKey, counts] of Array.from(this.errorCounts.entries())) {
      const windowCounts = counts.filter(c => c.timestamp >= windowStart && c.timestamp <= now);
      const totalCount = windowCounts.reduce((sum, c) => sum + c.count, 0);

      if (totalCount > 0) {
        stats.totalErrors += totalCount;

        const [errorType, errorCode] = errorKey.split(':');
        stats.errorsByType[errorType] = (stats.errorsByType[errorType] || 0) + totalCount;
        stats.errorsByCode[errorCode] = (stats.errorsByCode[errorCode] || 0) + totalCount;
      }
    }

    return stats;
  }
}

// Create singleton instance
export const errorMonitoringService = new ErrorMonitoringService();

// Helper function to record errors for monitoring
export const recordError = (error: Error, context?: Record<string, any>) => {
  errorMonitoringService.recordError(error, context);
};