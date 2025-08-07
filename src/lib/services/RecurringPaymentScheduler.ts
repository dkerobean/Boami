/**
 * Recurring Payment Scheduler
 * Handles automated scheduling and processing of recurring payments
 */

import { RecurringPaymentProcessor, ProcessingResult } from './RecurringPaymentProcessor';
import { NotificationSystem } from '../utils/notification-system';
import { ErrorHandler } from '../utils/error-handler';

export interface SchedulerConfig {
  enabled: boolean;
  intervalMinutes: number;
  maxRetries: number;
  retryDelayMinutes: number;
  batchSize: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export interface SchedulerStats {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  totalPaymentsProcessed: number;
  totalPaymentsCreated: number;
  totalErrors: number;
  lastRunTime: Date | null;
  nextRunTime: Date | null;
  isRunning: boolean;
}

export interface SchedulerLog {
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: any;
}

export class RecurringPaymentScheduler {
  private static instance: RecurringPaymentScheduler;
  private config: SchedulerConfig;
  private stats: SchedulerStats;
  private logs: SchedulerLog[] = [];
  private intervalId: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private maxLogSize = 1000;

  private constructor() {
    this.config = {
      enabled: false,
      intervalMinutes: 60, // Run every hour by default
      maxRetries: 3,
      retryDelayMinutes: 5,
      batchSize: 50,
      logLevel: 'info'
    };

    this.stats = {
      totalRuns: 0,
      successfulRuns: 0,
      failedRuns: 0,
      totalPaymentsProcessed: 0,
      totalPaymentsCreated: 0,
      totalErrors: 0,
      lastRunTime: null,
      nextRunTime: null,
      isRunning: false
    };
  }

  /**
   * Get singleton instance
   */
  static getInstance(): RecurringPaymentScheduler {
    if (!RecurringPaymentScheduler.instance) {
      RecurringPaymentScheduler.instance = new RecurringPaymentScheduler();
    }
    return RecurringPaymentScheduler.instance;
  }

  /**
   * Start the scheduler
   */
  start(config?: Partial<SchedulerConfig>): void {
    if (config) {
      this.updateConfig(config);
    }

    if (this.intervalId) {
      this.log('warn', 'Scheduler is already running');
      return;
    }

    if (!this.config.enabled) {
      this.log('warn', 'Scheduler is disabled');
      return;
    }

    this.log('info', 'Starting recurring payment scheduler', {
      intervalMinutes: this.config.intervalMinutes,
      batchSize: this.config.batchSize
    });

    // Run immediately on start
    this.processPayments();

    // Set up recurring execution
    this.intervalId = setInterval(() => {
      this.processPayments();
    }, this.config.intervalMinutes * 60 * 1000);

    this.updateNextRunTime();

    NotificationSystem.info({
      title: 'Recurring Payment Scheduler Started',
      message: `Processing payments every ${this.config.intervalMinutes} minutes`
    });
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;

      this.log('info', 'Recurring payment scheduler stopped');

      NotificationSystem.info({
        title: 'Recurring Payment Scheduler Stopped',
        message: 'Automatic payment processing has been disabled'
      });
    }
  }

  /**
   * Process due payments
   */
  private async processPayments(): Promise<void> {
    if (this.isProcessing) {
      this.log('warn', 'Payment processing already in progress, skipping this run');
      return;
    }

    this.isProcessing = true;
    this.stats.isRunning = true;
    this.stats.totalRuns++;
    this.stats.lastRunTime = new Date();

    this.log('info', 'Starting payment processing run');

    try {
      const result = await RecurringPaymentProcessor.processAllDueRecurringPayments();

      if (result.success) {
        this.stats.successfulRuns++;
        this.stats.totalPaymentsProcessed += result.processedCount;
        this.stats.totalPaymentsCreated += result.createdRecords.length;
        this.stats.totalErrors += result.errors.length;

        this.log('info', 'Payment processing completed successfully', {
          processed: result.processedCount,
          created: result.createdRecords.length,
          errors: result.errors.length
        });

        // Send notifications for processed payments
        if (result.createdRecords.length > 0) {
          const totalAmount = this.calculateTotalAmount(result.createdRecords);
          NotificationSystem.financial.recurringPaymentProcessed(result.createdRecords.length, totalAmount);
        }

        // Log individual payment results
        result.createdRecords.forEach(record => {
          this.log('debug', `Payment processed: ${record.recordId}`, record);
        });
        
        result.errors.forEach(error => {
          this.log('error', `Payment failed: ${error.recurringPaymentId} - ${error.error}`, error);
        });

      } else {
        this.stats.failedRuns++;
        this.log('error', 'Payment processing failed', result);

        NotificationSystem.error({
          title: 'Recurring Payment Processing Failed',
          message: 'Some recurring payments could not be processed. Please check the logs.'
        });
      }

    } catch (error) {
      this.stats.failedRuns++;
      this.stats.totalErrors++;

      this.log('error', 'Unexpected error during payment processing', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });

      ErrorHandler.handleError(error, {
        component: 'RecurringPaymentScheduler',
        action: 'processPayments'
      });

    } finally {
      this.isProcessing = false;
      this.stats.isRunning = false;
      this.updateNextRunTime();
    }
  }

  /**
   * Calculate total amount from processing results
   */
  private calculateTotalAmount(results: any[]): number {
    return results
      .filter(result => result.status === 'processed')
      .reduce((total, result) => {
        // This would need to be implemented based on your data structure
        // For now, return a placeholder
        return total + 100; // Placeholder amount
      }, 0);
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<SchedulerConfig>): void {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };

    this.log('info', 'Scheduler configuration updated', {
      oldConfig,
      newConfig: this.config
    });

    // Restart scheduler if interval changed and it's currently running
    if (this.intervalId && oldConfig.intervalMinutes !== this.config.intervalMinutes) {
      this.stop();
      this.start();
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): SchedulerConfig {
    return { ...this.config };
  }

  /**
   * Get scheduler statistics
   */
  getStats(): SchedulerStats {
    return { ...this.stats };
  }

  /**
   * Get scheduler logs
   */
  getLogs(level?: 'debug' | 'info' | 'warn' | 'error', limit?: number): SchedulerLog[] {
    let filteredLogs = this.logs;

    if (level) {
      const levelPriority = { debug: 0, info: 1, warn: 2, error: 3 };
      const minPriority = levelPriority[level];
      filteredLogs = this.logs.filter(log => levelPriority[log.level] >= minPriority);
    }

    if (limit) {
      filteredLogs = filteredLogs.slice(-limit);
    }

    return filteredLogs;
  }

  /**
   * Clear logs
   */
  clearLogs(): void {
    this.logs = [];
    this.log('info', 'Scheduler logs cleared');
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalRuns: 0,
      successfulRuns: 0,
      failedRuns: 0,
      totalPaymentsProcessed: 0,
      totalPaymentsCreated: 0,
      totalErrors: 0,
      lastRunTime: null,
      nextRunTime: this.stats.nextRunTime,
      isRunning: this.stats.isRunning
    };

    this.log('info', 'Scheduler statistics reset');
  }

  /**
   * Check if scheduler is running
   */
  isRunning(): boolean {
    return this.intervalId !== null;
  }

  /**
   * Get time until next run
   */
  getTimeUntilNextRun(): number | null {
    if (!this.stats.nextRunTime) return null;
    return Math.max(0, this.stats.nextRunTime.getTime() - Date.now());
  }

  /**
   * Force immediate payment processing
   */
  async forceRun(): Promise<ProcessingResult> {
    this.log('info', 'Forcing immediate payment processing run');

    try {
      const result = await RecurringPaymentProcessor.processAllDueRecurringPayments();

      this.log('info', 'Forced payment processing completed', {
        processed: result.processedCount,
        created: result.createdRecords.length,
        errors: result.errors.length
      });

      return result;
    } catch (error) {
      this.log('error', 'Forced payment processing failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Update next run time
   */
  private updateNextRunTime(): void {
    if (this.intervalId) {
      this.stats.nextRunTime = new Date(Date.now() + this.config.intervalMinutes * 60 * 1000);
    } else {
      this.stats.nextRunTime = null;
    }
  }

  /**
   * Log message with level
   */
  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any): void {
    const logEntry: SchedulerLog = {
      timestamp: new Date(),
      level,
      message,
      data
    };

    this.logs.push(logEntry);

    // Keep logs within size limit
    if (this.logs.length > this.maxLogSize) {
      this.logs = this.logs.slice(-this.maxLogSize);
    }

    // Log to console based on configured level
    const levelPriority = { debug: 0, info: 1, warn: 2, error: 3 };
    if (levelPriority[level] >= levelPriority[this.config.logLevel]) {
      const logMethod = level === 'error' ? console.error :
                      level === 'warn' ? console.warn :
                      level === 'info' ? console.info : console.debug;

      logMethod(`[RecurringPaymentScheduler] ${message}`, data || '');
    }
  }
}

// Export singleton instance
export const recurringPaymentScheduler = RecurringPaymentScheduler.getInstance();

export default RecurringPaymentScheduler;