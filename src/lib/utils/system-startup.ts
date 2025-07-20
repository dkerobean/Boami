/**
 * System Startup Utility
 * Initializes system-wide services and scheduled tasks
 */

import { cronScheduler } from './cron-scheduler';
import { connectDB } from '../database/mongoose-connection';

export interface StartupConfig {
  enableCronJobs: boolean;
  cronJobSchedule?: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export class SystemStartup {
  private static initialized = false;
  private static config: StartupConfig = {
    enableCronJobs: true,
    cronJobSchedule: '0 0 * * *', // Daily at midnight
    logLevel: 'info'
  };

  /**
   * Initialize system services
   */
  static async initialize(config?: Partial<StartupConfig>): Promise<void> {
    if (this.initialized) {
      console.warn('System already initialized');
      return;
    }

    // Update configuration
    if (config) {
      this.config = { ...this.config, ...config };
    }

    console.log('Initializing system services...', this.config);

    try {
      // Initialize database connection
      await this.initializeDatabase();

      // Initialize cron scheduler
      if (this.config.enableCronJobs) {
        await this.initializeCronScheduler();
      }

      // Initialize other services
      await this.initializeOtherServices();

      this.initialized = true;
      console.log('System services initialized successfully');

    } catch (error) {
      console.error('Failed to initialize system services:', error);
      throw error;
    }
  }

  /**
   * Initialize database connection
   */
  private static async initializeDatabase(): Promise<void> {
    try {
      await connectDB();
      console.log('Database connection initialized');
    } catch (error) {
      console.error('Database initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize cron scheduler
   */
  private static async initializeCronScheduler(): Promise<void> {
    try {
      // Configure recurring payment job
      if (this.config.cronJobSchedule) {
        cronScheduler.updateJobSchedule('recurring-payments', this.config.cronJobSchedule);
      }

      // Start the scheduler
      cronScheduler.start();

      console.log('Cron scheduler initialized');
    } catch (error) {
      console.error('Cron scheduler initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize other services
   */
  private static async initializeOtherServices(): Promise<void> {
    // Add other service initializations here
    // For example: notification system, cache, etc.
    console.log('Other services initialized');
  }

  /**
   * Shutdown system services
   */
  static async shutdown(): Promise<void> {
    if (!this.initialized) {
      console.warn('System not initialized');
      return;
    }

    console.log('Shutting down system services...');

    try {
      // Stop cron scheduler
      cronScheduler.stop();

      // Close database connections
      // Note: Mongoose connections are typically handled by the framework

      this.initialized = false;
      console.log('System services shut down successfully');

    } catch (error) {
      console.error('Error during system shutdown:', error);
      throw error;
    }
  }

  /**
   * Get system status
   */
  static getStatus(): {
    initialized: boolean;
    config: StartupConfig;
    cronScheduler: any;
  } {
    return {
      initialized: this.initialized,
      config: this.config,
      cronScheduler: cronScheduler.getStats()
    };
  }

  /**
   * Check if system is initialized
   */
  static isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Update configuration
   */
  static updateConfig(newConfig: Partial<StartupConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Apply configuration changes
    if (this.initialized) {
      if (newConfig.cronJobSchedule) {
        cronScheduler.updateJobSchedule('recurring-payments', newConfig.cronJobSchedule);
      }

      if (newConfig.enableCronJobs !== undefined) {
        cronScheduler.setJobEnabled('recurring-payments', newConfig.enableCronJobs);
      }
    }

    console.log('System configuration updated:', this.config);
  }
}

// Auto-initialize in production
if (process.env.NODE_ENV === 'production' && !process.env.DISABLE_AUTO_INIT) {
  SystemStartup.initialize({
    enableCronJobs: process.env.ENABLE_CRON_JOBS !== 'false',
    cronJobSchedule: process.env.RECURRING_PAYMENT_CRON_SCHEDULE || '0 0 * * *',
    logLevel: (process.env.LOG_LEVEL as any) || 'info'
  }).catch(error => {
    console.error('Auto-initialization failed:', error);
  });
}

export default SystemStartup;