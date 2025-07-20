/**
 * Payment Monitor
 * Monitors and logs recurring payment processing activities
 */

import { connectDB } from '../database/mongoose-connection';
import { NotificationSystem } from './notification-system';

export interface PaymentLog {
  id: string;
  timestamp: Date;
  type: 'processing' | 'success' | 'error' | 'warning' | 'info';
  category: 'recurring-payment' | 'system' | 'scheduler' | 'notification';
  message: string;
  data?: any;
  userId?: string;
  recurringPaymentId?: string;
  createdRecordId?: string;
  error?: {
    code: string;
    message: string;
    stack?: string;
  };
}

export interface PaymentMetrics {
  totalProcessed: number;
  totalSuccessful: number;
  totalFailed: number;
  totalAmount: number;
  averageProcessingTime: number;
  lastProcessingTime: Date | null;
  errorRate: number;
  uptime: number;
}

export interface AlertConfig {
  enabled: boolean;
  errorThreshold: number; // Number of errors before alerting
  timeWindow: number; // Time window in minutes
  recipients: string[]; // User IDs to notify
}

export class PaymentMonitor {
  private static instance: PaymentMonitor;
  private logs: PaymentLog[] = [];
  private metrics: PaymentMetrics = {
    totalProcessed: 0,
    totalSuccessful: 0,
    totalFailed: 0,
    totalAmount: 0,
    averageProcessingTime: 0,
    lastProcessingTime: null,
    errorRate: 0,
    uptime: 0
  };
  private alertConfig: AlertConfig = {
    enabled: true,
    errorThreshold: 5,
    timeWindow: 60, // 1 hour
    recipients: []
  };
  private maxLogSize = 10000;
  private startTime = new Date();

  private constructor() {
    // Initialize metrics from storage if available
    this.loadMetricsFromStorage();
  }

  static getInstance(): PaymentMonitor {
    if (!PaymentMonitor.instance) {
      PaymentMonitor.instance = new PaymentMonitor();
    }
    return PaymentMonitor.instance;
  }

  /**
   * Log payment processing event
   */
  log(entry: Omit<PaymentLog, 'id' | 'timestamp'>): void {
    const logEntry: PaymentLog = {
      id: this.generateId(),
      timestamp: new Date(),
      ...entry
    };

    this.logs.push(logEntry);

    // Keep logs within size limit
    if (this.logs.length > this.maxLogSize) {
      this.logs = this.logs.slice(-this.maxLogSize);
    }

    // Update metrics
    this.updateMetrics(logEntry);

    // Check for alerts
    this.checkAlerts(logEntry);

    // Console logging based on type
    this.consoleLog(logEntry);
  }

  /**
   * Log successful payment processing
   */
  logSuccess(data: {
    message: string;
    userId?: string;
    recurringPaymentId?: string;
    createdRecordId?: string;
    amount?: number;
    processingTime?: number;
    additionalData?: any;
  }): void {
    this.log({
      type: 'success',
      category: 'recurring-payment',
      message: data.message,
      userId: data.userId,
      recurringPaymentId: data.recurringPaymentId,
      createdRecordId: data.createdRecordId,
      data: {
        amount: data.amount,
        processingTime: data.processingTime,
        ...data.additionalData
      }
    });
  }

  /**
   * Log payment processing error
   */
  logError(data: {
    message: string;
    error: Error | string;
    userId?: string;
    recurringPaymentId?: string;
    additionalData?: any;
  }): void {
    const errorInfo = typeof data.error === 'string'
      ? { code: 'UNKNOWN', message: data.error }
      : {
          code: data.error.name || 'ERROR',
          message: data.error.message,
          stack: data.error.stack
        };

    this.log({
      type: 'error',
      category: 'recurring-payment',
      message: data.message,
      userId: data.userId,
      recurringPaymentId: data.recurringPaymentId,
      error: errorInfo,
      data: data.additionalData
    });
  }

  /**
   * Log processing start
   */
  logProcessingStart(data: {
    message: string;
    userId?: string;
    batchSize?: number;
    additionalData?: any;
  }): void {
    this.log({
      type: 'processing',
      category: 'recurring-payment',
      message: data.message,
      userId: data.userId,
      data: {
        batchSize: data.batchSize,
        ...data.additionalData
      }
    });
  }

  /**
   * Log system events
   */
  logSystem(data: {
    message: string;
    type: 'info' | 'warning' | 'error';
    additionalData?: any;
  }): void {
    this.log({
      type: data.type,
      category: 'system',
      message: data.message,
      data: data.additionalData
    });
  }

  /**
   * Log scheduler events
   */
  logScheduler(data: {
    message: string;
    type: 'info' | 'warning' | 'error';
    additionalData?: any;
  }): void {
    this.log({
      type: data.type,
      category: 'scheduler',
      message: data.message,
      data: data.additionalData
    });
  }

  /**
   * Get logs with filtering
   */
  getLogs(filter?: {
    type?: PaymentLog['type'];
    category?: PaymentLog['category'];
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): PaymentLog[] {
    let filteredLogs = [...this.logs];

    if (filter) {
      if (filter.type) {
        filteredLogs = filteredLogs.filter(log => log.type === filter.type);
      }
      if (filter.category) {
        filteredLogs = filteredLogs.filter(log => log.category === filter.category);
      }
      if (filter.userId) {
        filteredLogs = filteredLogs.filter(log => log.userId === filter.userId);
      }
      if (filter.startDate) {
        filteredLogs = filteredLogs.filter(log => log.timestamp >= filter.startDate!);
      }
      if (filter.endDate) {
        filteredLogs = filteredLogs.filter(log => log.timestamp <= filter.endDate!);
      }
      if (filter.limit) {
        filteredLogs = filteredLogs.slice(-filter.limit);
      }
    }

    return filteredLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get current metrics
   */
  getMetrics(): PaymentMetrics {
    // Update uptime
    this.metrics.uptime = Date.now() - this.startTime.getTime();
    return { ...this.metrics };
  }

  /**
   * Get error logs within time window
   */
  getRecentErrors(windowMinutes: number = 60): PaymentLog[] {
    const cutoff = new Date(Date.now() - windowMinutes * 60 * 1000);
    return this.logs.filter(log =>
      log.type === 'error' &&
      log.timestamp >= cutoff
    );
  }

  /**
   * Clear logs
   */
  clearLogs(): void {
    this.logs = [];
    this.logSystem({
      type: 'info',
      message: 'Payment monitor logs cleared'
    });
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalProcessed: 0,
      totalSuccessful: 0,
      totalFailed: 0,
      totalAmount: 0,
      averageProcessingTime: 0,
      lastProcessingTime: null,
      errorRate: 0,
      uptime: 0
    };
    this.startTime = new Date();

    this.logSystem({
      type: 'info',
      message: 'Payment monitor metrics reset'
    });
  }

  /**
   * Update alert configuration
   */
  updateAlertConfig(config: Partial<AlertConfig>): void {
    this.alertConfig = { ...this.alertConfig, ...config };

    this.logSystem({
      type: 'info',
      message: 'Alert configuration updated',
      additionalData: this.alertConfig
    });
  }

  /**
   * Get alert configuration
   */
  getAlertConfig(): AlertConfig {
    return { ...this.alertConfig };
  }

  /**
   * Export logs as JSON
   */
  exportLogs(filter?: Parameters<typeof this.getLogs>[0]): string {
    const logs = this.getLogs(filter);
    return JSON.stringify({
      exportDate: new Date().toISOString(),
      totalLogs: logs.length,
      metrics: this.getMetrics(),
      logs
    }, null, 2);
  }

  /**
   * Update metrics based on log entry
   */
  private updateMetrics(entry: PaymentLog): void {
    if (entry.category === 'recurring-payment') {
      if (entry.type === 'processing') {
        this.metrics.totalProcessed++;
        this.metrics.lastProcessingTime = entry.timestamp;
      } else if (entry.type === 'success') {
        this.metrics.totalSuccessful++;

        if (entry.data?.amount) {
          this.metrics.totalAmount += entry.data.amount;
        }

        if (entry.data?.processingTime) {
          // Update average processing time
          const currentAvg = this.metrics.averageProcessingTime;
          const count = this.metrics.totalSuccessful;
          this.metrics.averageProcessingTime =
            (currentAvg * (count - 1) + entry.data.processingTime) / count;
        }
      } else if (entry.type === 'error') {
        this.metrics.totalFailed++;
      }

      // Calculate error rate
      const total = this.metrics.totalSuccessful + this.metrics.totalFailed;
      this.metrics.errorRate = total > 0 ? (this.metrics.totalFailed / total) * 100 : 0;
    }

    // Save metrics to storage
    this.saveMetricsToStorage();
  }

  /**
   * Check for alert conditions
   */
  private checkAlerts(entry: PaymentLog): void {
    if (!this.alertConfig.enabled) return;

    if (entry.type === 'error') {
      const recentErrors = this.getRecentErrors(this.alertConfig.timeWindow);

      if (recentErrors.length >= this.alertConfig.errorThreshold) {
        this.sendAlert({
          title: 'High Error Rate Alert',
          message: `${recentErrors.length} errors in the last ${this.alertConfig.timeWindow} minutes`,
          type: 'error',
          data: {
            errorCount: recentErrors.length,
            timeWindow: this.alertConfig.timeWindow,
            latestError: entry
          }
        });
      }
    }
  }

  /**
   * Send alert notification
   */
  private sendAlert(alert: {
    title: string;
    message: string;
    type: 'error' | 'warning' | 'info';
    data?: any;
  }): void {
    // Log the alert
    this.log({
      type: alert.type,
      category: 'notification',
      message: `ALERT: ${alert.title} - ${alert.message}`,
      data: alert.data
    });

    // Send notification
    switch (alert.type) {
      case 'error':
        NotificationSystem.error({
          title: alert.title,
          message: alert.message,
          persistent: true
        });
        break;
      case 'warning':
        NotificationSystem.warning({
          title: alert.title,
          message: alert.message
        });
        break;
      case 'info':
        NotificationSystem.info({
          title: alert.title,
          message: alert.message
        });
        break;
    }
  }

  /**
   * Console logging based on entry type
   */
  private consoleLog(entry: PaymentLog): void {
    const message = `[${entry.category.toUpperCase()}] ${entry.message}`;
    const data = entry.data || entry.error;

    switch (entry.type) {
      case 'error':
        console.error(message, data);
        break;
      case 'warning':
        console.warn(message, data);
        break;
      case 'processing':
      case 'info':
        console.info(message, data);
        break;
      case 'success':
        console.log(message, data);
        break;
    }
  }

  /**
   * Generate unique ID for log entries
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Save metrics to localStorage (client-side) or file system (server-side)
   */
  private saveMetricsToStorage(): void {
    try {
      if (typeof window !== 'undefined') {
        // Client-side storage
        localStorage.setItem('payment-monitor-metrics', JSON.stringify(this.metrics));
      }
      // Server-side storage could be implemented here
    } catch (error) {
      // Ignore storage errors
    }
  }

  /**
   * Load metrics from storage
   */
  private loadMetricsFromStorage(): void {
    try {
      if (typeof window !== 'undefined') {
        // Client-side storage
        const stored = localStorage.getItem('payment-monitor-metrics');
        if (stored) {
          this.metrics = { ...this.metrics, ...JSON.parse(stored) };
        }
      }
      // Server-side storage could be implemented here
    } catch (error) {
      // Ignore storage errors
    }
  }
}

// Export singleton instance
export const paymentMonitor = PaymentMonitor.getInstance();

export default PaymentMonitor;