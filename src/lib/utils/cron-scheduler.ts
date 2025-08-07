/**
 * Cron Scheduler Utility
 * Handles scheduled tasks for recurring payment processing
 */

import { RecurringPaymentProcessor } from '../services/RecurringPaymentProcessor';
import { NotificationSystem } from './notification-system';
import { ErrorHandler } from './error-handler';

export interface CronJobConfig {
  name: string;
  schedule: string; // Cron expression
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  runCount: number;
  errorCount: number;
}

export interface CronJobResult {
  success: boolean;
  startTime: Date;
  endTime: Date;
  duration: number;
  data?: any;
  error?: string;
}

export class CronScheduler {
  private static instance: CronScheduler;
  private jobs: Map<string, CronJobConfig> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private isRunning = false;

  private constructor() {
    // Initialize default jobs
    this.registerJob('recurring-payments', {
      name: 'Process Recurring Payments',
      schedule: '0 0 * * *', // Daily at midnight
      enabled: true,
      runCount: 0,
      errorCount: 0
    });
  }

  static getInstance(): CronScheduler {
    if (!CronScheduler.instance) {
      CronScheduler.instance = new CronScheduler();
    }
    return CronScheduler.instance;
  }

  /**
   * Register a new cron job
   */
  registerJob(id: string, config: Omit<CronJobConfig, 'lastRun' | 'nextRun'>): void {
    const jobConfig: CronJobConfig = {
      ...config,
      nextRun: this.calculateNextRun(config.schedule)
    };

    this.jobs.set(id, jobConfig);

    if (config.enabled && this.isRunning) {
      this.scheduleJob(id);
    }

    console.log(`Cron job registered: ${id}`, jobConfig);
  }

  /**
   * Start the cron scheduler
   */
  start(): void {
    if (this.isRunning) {
      console.warn('Cron scheduler is already running');
      return;
    }

    this.isRunning = true;
    console.log('Starting cron scheduler...');

    // Schedule all enabled jobs
    for (const [id, config] of Array.from(this.jobs.entries())) {
      if (config.enabled) {
        this.scheduleJob(id);
      }
    }

    console.log(`Cron scheduler started with ${this.intervals.size} active jobs`);
  }

  /**
   * Stop the cron scheduler
   */
  stop(): void {
    if (!this.isRunning) {
      console.warn('Cron scheduler is not running');
      return;
    }

    this.isRunning = false;

    // Clear all intervals
    for (const [id, interval] of Array.from(this.intervals.entries())) {
      clearTimeout(interval);
      console.log(`Stopped cron job: ${id}`);
    }

    this.intervals.clear();
    console.log('Cron scheduler stopped');
  }

  /**
   * Schedule a specific job
   */
  private scheduleJob(id: string): void {
    const config = this.jobs.get(id);
    if (!config || !config.enabled) return;

    const now = new Date();
    const nextRun = config.nextRun || this.calculateNextRun(config.schedule);
    const delay = Math.max(0, nextRun.getTime() - now.getTime());

    // Clear existing interval if any
    const existingInterval = this.intervals.get(id);
    if (existingInterval) {
      clearTimeout(existingInterval);
    }

    // Schedule the job
    const timeout = setTimeout(async () => {
      await this.executeJob(id);

      // Reschedule for next run
      if (this.isRunning && config.enabled) {
        this.scheduleJob(id);
      }
    }, delay);

    this.intervals.set(id, timeout);

    // Update next run time
    config.nextRun = nextRun;
    this.jobs.set(id, config);

    console.log(`Scheduled job ${id} to run at ${nextRun.toISOString()}`);
  }

  /**
   * Execute a cron job
   */
  private async executeJob(id: string): Promise<CronJobResult> {
    const config = this.jobs.get(id);
    if (!config) {
      throw new Error(`Job ${id} not found`);
    }

    const startTime = new Date();
    console.log(`Executing cron job: ${id} at ${startTime.toISOString()}`);

    try {
      let result;

      // Execute job based on ID
      switch (id) {
        case 'recurring-payments':
          result = await this.processRecurringPayments();
          break;
        default:
          throw new Error(`Unknown job type: ${id}`);
      }

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      // Update job statistics
      config.lastRun = startTime;
      config.runCount++;
      config.nextRun = this.calculateNextRun(config.schedule);
      this.jobs.set(id, config);

      const jobResult: CronJobResult = {
        success: true,
        startTime,
        endTime,
        duration,
        data: result
      };

      console.log(`Cron job ${id} completed successfully in ${duration}ms`, result);
      return jobResult;

    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      // Update error statistics
      config.errorCount++;
      config.lastRun = startTime;
      config.nextRun = this.calculateNextRun(config.schedule);
      this.jobs.set(id, config);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      console.error(`Cron job ${id} failed after ${duration}ms:`, errorMessage);

      // Handle error
      ErrorHandler.handleError(error, {
        component: 'CronScheduler',
        action: `executeJob:${id}`
      });

      const jobResult: CronJobResult = {
        success: false,
        startTime,
        endTime,
        duration,
        error: errorMessage
      };

      return jobResult;
    }
  }

  /**
   * Process recurring payments job
   */
  private async processRecurringPayments(): Promise<any> {
    const result = await RecurringPaymentProcessor.processAllDueRecurringPayments();

    // Send notifications if payments were processed
    if (result.processedCount > 0) {
      const totalAmount = result.createdRecords.reduce((sum, record) => sum + record.amount, 0);

      NotificationSystem.info({
        title: 'Recurring Payments Processed',
        message: `${result.processedCount} payments processed, total amount: $${totalAmount.toFixed(2)}`
      });
    }

    // Send error notifications if there were failures
    if (result.errors.length > 0) {
      NotificationSystem.error({
        title: 'Recurring Payment Errors',
        message: `${result.errors.length} payments failed to process. Check logs for details.`
      });
    }

    return {
      processedCount: result.processedCount,
      createdRecords: result.createdRecords.length,
      errorCount: result.errors.length,
      deactivatedCount: result.deactivatedCount
    };
  }

  /**
   * Calculate next run time based on cron expression
   * Simplified implementation - in production, use a proper cron parser
   */
  private calculateNextRun(schedule: string): Date {
    const now = new Date();

    // Simple cron patterns
    switch (schedule) {
      case '0 0 * * *': // Daily at midnight
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        return tomorrow;

      case '0 */6 * * *': // Every 6 hours
        const next6Hours = new Date(now);
        next6Hours.setHours(next6Hours.getHours() + 6, 0, 0, 0);
        return next6Hours;

      case '0 * * * *': // Every hour
        const nextHour = new Date(now);
        nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
        return nextHour;

      case '*/15 * * * *': // Every 15 minutes
        const next15Min = new Date(now);
        next15Min.setMinutes(next15Min.getMinutes() + 15, 0, 0);
        return next15Min;

      default:
        // Default to 1 hour from now
        const defaultNext = new Date(now);
        defaultNext.setHours(defaultNext.getHours() + 1);
        return defaultNext;
    }
  }

  /**
   * Get job status
   */
  getJobStatus(id: string): CronJobConfig | null {
    return this.jobs.get(id) || null;
  }

  /**
   * Get all jobs status
   */
  getAllJobsStatus(): CronJobConfig[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Enable/disable a job
   */
  setJobEnabled(id: string, enabled: boolean): void {
    const config = this.jobs.get(id);
    if (!config) {
      throw new Error(`Job ${id} not found`);
    }

    config.enabled = enabled;
    this.jobs.set(id, config);

    if (this.isRunning) {
      if (enabled) {
        this.scheduleJob(id);
      } else {
        const interval = this.intervals.get(id);
        if (interval) {
          clearTimeout(interval);
          this.intervals.delete(id);
        }
      }
    }

    console.log(`Job ${id} ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Update job schedule
   */
  updateJobSchedule(id: string, schedule: string): void {
    const config = this.jobs.get(id);
    if (!config) {
      throw new Error(`Job ${id} not found`);
    }

    config.schedule = schedule;
    config.nextRun = this.calculateNextRun(schedule);
    this.jobs.set(id, config);

    // Reschedule if running and enabled
    if (this.isRunning && config.enabled) {
      this.scheduleJob(id);
    }

    console.log(`Job ${id} schedule updated to: ${schedule}`);
  }

  /**
   * Force run a job immediately
   */
  async forceRun(id: string): Promise<CronJobResult> {
    const config = this.jobs.get(id);
    if (!config) {
      throw new Error(`Job ${id} not found`);
    }

    console.log(`Force running job: ${id}`);
    return await this.executeJob(id);
  }

  /**
   * Check if scheduler is running
   */
  isSchedulerRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Get scheduler statistics
   */
  getStats(): {
    isRunning: boolean;
    totalJobs: number;
    enabledJobs: number;
    activeJobs: number;
    totalRuns: number;
    totalErrors: number;
  } {
    const jobs = Array.from(this.jobs.values());

    return {
      isRunning: this.isRunning,
      totalJobs: jobs.length,
      enabledJobs: jobs.filter(j => j.enabled).length,
      activeJobs: this.intervals.size,
      totalRuns: jobs.reduce((sum, j) => sum + j.runCount, 0),
      totalErrors: jobs.reduce((sum, j) => sum + j.errorCount, 0)
    };
  }
}

// Export singleton instance
export const cronScheduler = CronScheduler.getInstance();

export default CronScheduler;