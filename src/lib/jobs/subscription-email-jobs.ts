/**
 * Scheduled jobs for sending subscription-related emails
 */

import { subscriptionEmailService, sendSubscriptionEmail } from '../email/subscription-email-service';
import { subscriptionLogger, LogCategory } from '../utils/subscription-logger';
import { connectToDatabase } from '../database/mongoose-connection';
import { Subscription, User, Plan } from '../database/models';
import { formatCurrency } from '../utils/payment-utils';

export interface EmailJobConfig {
  enabled: boolean;
  schedule: string; // Cron expression
  batchSize: number;
  retryAttempts: number;
  retryDelay: number; // milliseconds
}

export interface RenewalReminderJob {
  daysBeforeRenewal: number;
  config: EmailJobConfig;
}

class SubscriptionEmailJobs {
  private renewalReminderJobs: RenewalReminderJob[] = [
    {
      daysBeforeRenewal: 7,
      config: {
        enabled: true,
        schedule: '0 9 * * *', // Daily at 9 AM
        batchSize: 50,
        retryAttempts: 3,
        retryDelay: 5000
      }
    },
    {
      daysBeforeRenewal: 3,
      config: {
        enabled: true,
        schedule: '0 9 * * *', // Daily at 9 AM
        batchSize: 50,
        retryAttempts: 3,
        retryDelay: 5000
      }
    },
    {
      daysBeforeRenewal: 1,
      config: {
        enabled: true,
        schedule: '0 9 * * *', // Daily at 9 AM
        batchSize: 50,
        retryAttempts: 3,
        retryDelay: 5000
      }
    }
  ];

  private jobIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.initializeJobs();
  }

  private initializeJobs(): void {
    // Initialize renewal reminder jobs
    this.renewalReminderJobs.forEach((job, index) => {
      if (job.config.enabled) {
        this.scheduleRenewalReminderJob(job, `renewal_reminder_${job.daysBeforeRenewal}d`);
      }
    });

    // Initialize other periodic jobs
    this.scheduleExpiredSubscriptionJob();
    this.scheduleFailedPaymentRetryJob();

    subscriptionLogger.info('Subscription email jobs initialized', LogCategory.SUBSCRIPTION, {
      metadata: {
        renewalJobs: this.renewalReminderJobs.length,
        enabledJobs: this.renewalReminderJobs.filter(j => j.config.enabled).length
      }
    });
  }

  private scheduleRenewalReminderJob(job: RenewalReminderJob, jobId: string): void {
    // For simplicity, we'll run the job every hour and check if reminders need to be sent
    // In a production environment, you'd use a proper cron scheduler like node-cron
    const interval = setInterval(async () => {
      await this.processRenewalReminders(job.daysBeforeRenewal, job.config);
    }, 60 * 60 * 1000); // Every hour

    this.jobIntervals.set(jobId, interval);

    subscriptionLogger.info(`Scheduled renewal reminder job: ${jobId}`, LogCategory.SUBSCRIPTION, {
      metadata: { daysBeforeRenewal: job.daysBeforeRenewal, schedule: job.config.schedule }
    });
  }

  private scheduleExpiredSubscriptionJob(): void {
    // Check for expired subscriptions daily
    const interval = setInterval(async () => {
      await this.processExpiredSubscriptions();
    }, 24 * 60 * 60 * 1000); // Daily

    this.jobIntervals.set('expired_subscriptions', interval);
  }

  private scheduleFailedPaymentRetryJob(): void {
    // Check for failed payments to retry every 6 hours
    const interval = setInterval(async () => {
      await this.processFailedPaymentRetries();
    }, 6 * 60 * 60 * 1000); // Every 6 hours

    this.jobIntervals.set('failed_payment_retry', interval);
  }

  public async processRenewalReminders(daysBeforeRenewal: number, config: EmailJobConfig): Promise<void> {
    try {
      subscriptionLogger.info(`Processing renewal reminders: ${daysBeforeRenewal} days`, LogCategory.SUBSCRIPTION);

      await connectToDatabase();

      // Calculate the target date
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + daysBeforeRenewal);
      targetDate.setHours(0, 0, 0, 0);

      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);

      // Find subscriptions that need renewal reminders
      const subscriptions = await Subscription.aggregate([
        {
          $match: {
            isActive: true,
            status: 'active',
            currentPeriodEnd: {
              $gte: targetDate,
              $lt: nextDay
            },
            cancelAtPeriodEnd: false
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user'
          }
        },
        {
          $lookup: {
            from: 'plans',
            localField: 'planId',
            foreignField: '_id',
            as: 'plan'
          }
        },
        {
          $unwind: '$user'
        },
        {
          $unwind: '$plan'
        },
        {
          $limit: config.batchSize
        }
      ]);

      if (subscriptions.length === 0) {
        subscriptionLogger.info(`No renewal reminders to send for ${daysBeforeRenewal} days`, LogCategory.SUBSCRIPTION);
        return;
      }

      // Process subscriptions in batches
      const emailPromises = subscriptions.map(async (subscription) => {
        try {
          const renewalAmount = subscription.billingPeriod === 'monthly'
            ? subscription.plan.price.monthly
            : subscription.plan.price.annual;

          const emailData = {
            userName: `${subscription.user.firstName} ${subscription.user.lastName}`.trim(),
            userEmail: subscription.user.email,
            planName: subscription.plan.name,
            planPrice: formatCurrency(renewalAmount, subscription.plan.price.currency),
            currency: subscription.plan.price.currency,
            billingPeriod: subscription.billingPeriod,
            nextBillingDate: new Date(subscription.currentPeriodEnd).toLocaleDateString(),
            subscriptionId: subscription._id.toString(),
            supportUrl: process.env.SUPPORT_URL || '/contact',
            manageSubscriptionUrl: process.env.MANAGE_SUBSCRIPTION_URL || '/subscription/manage',
            companyName: process.env.COMPANY_NAME || 'Your Company',
            companyLogo: process.env.COMPANY_LOGO_URL,
            daysUntilRenewal: daysBeforeRenewal,
            renewalAmount: formatCurrency(renewalAmount, subscription.plan.price.currency),
            updatePaymentUrl: process.env.UPDATE_PAYMENT_URL || '/subscription/payment-methods'
          };

          return await sendSubscriptionEmail.renewalReminder(
            subscription.user.email,
            emailData,
            subscription.user._id.toString()
          );
        } catch (error: any) {
          subscriptionLogger.error('Failed to send renewal reminder', error, LogCategory.SUBSCRIPTION, {
            userId: subscription.user._id.toString(),
            subscriptionId: subscription._id.toString(),
            metadata: { daysBeforeRenewal }
          });
          return { success: false, error: error.message };
        }
      });

      const results = await Promise.all(emailPromises);
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      subscriptionLogger.info(`Renewal reminders processed: ${daysBeforeRenewal} days`, LogCategory.SUBSCRIPTION, {
        metadata: {
          total: subscriptions.length,
          successful,
          failed,
          daysBeforeRenewal
        }
      });

    } catch (error: any) {
      subscriptionLogger.error(`Failed to process renewal reminders: ${daysBeforeRenewal} days`, error, LogCategory.SUBSCRIPTION, {
        metadata: { daysBeforeRenewal }
      });
    }
  }

  public async processExpiredSubscriptions(): Promise<void> {
    try {
      subscriptionLogger.info('Processing expired subscriptions', LogCategory.SUBSCRIPTION);

      await connectToDatabase();

      const now = new Date();

      // Find subscriptions that expired today
      const expiredSubscriptions = await Subscription.aggregate([
        {
          $match: {
            isActive: true,
            currentPeriodEnd: { $lt: now },
            status: { $ne: 'expired' }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user'
          }
        },
        {
          $lookup: {
            from: 'plans',
            localField: 'planId',
            foreignField: '_id',
            as: 'plan'
          }
        },
        {
          $unwind: '$user'
        },
        {
          $unwind: '$plan'
        }
      ]);

      for (const subscription of expiredSubscriptions) {
        try {
          // Update subscription status
          await Subscription.findByIdAndUpdate(subscription._id, {
            status: 'expired',
            isActive: false,
            updatedAt: new Date()
          });

          // Send expiration email
          const emailData = {
            userName: `${subscription.user.firstName} ${subscription.user.lastName}`.trim(),
            userEmail: subscription.user.email,
            planName: subscription.plan.name,
            planPrice: formatCurrency(subscription.plan.price.monthly, subscription.plan.price.currency),
            currency: subscription.plan.price.currency,
            billingPeriod: subscription.billingPeriod,
            subscriptionId: subscription._id.toString(),
            supportUrl: process.env.SUPPORT_URL || '/contact',
            manageSubscriptionUrl: process.env.MANAGE_SUBSCRIPTION_URL || '/subscription/manage',
            companyName: process.env.COMPANY_NAME || 'Your Company',
            companyLogo: process.env.COMPANY_LOGO_URL
          };

          await sendSubscriptionEmail.expired(
            subscription.user.email,
            emailData,
            subscription.user._id.toString()
          );

          subscriptionLogger.info('Expired subscription processed', LogCategory.SUBSCRIPTION, {
            userId: subscription.user._id.toString(),
            subscriptionId: subscription._id.toString(),
            metadata: { planName: subscription.plan.name }
          });

        } catch (error: any) {
          subscriptionLogger.error('Failed to process expired subscription', error, LogCategory.SUBSCRIPTION, {
            userId: subscription.user._id.toString(),
            subscriptionId: subscription._id.toString()
          });
        }
      }

      subscriptionLogger.info('Expired subscriptions processing completed', LogCategory.SUBSCRIPTION, {
        metadata: { processedCount: expiredSubscriptions.length }
      });

    } catch (error: any) {
      subscriptionLogger.error('Failed to process expired subscriptions', error, LogCategory.SUBSCRIPTION);
    }
  }

  public async processFailedPaymentRetries(): Promise<void> {
    try {
      subscriptionLogger.info('Processing failed payment retries', LogCategory.SUBSCRIPTION);

      // In a real implementation, you would:
      // 1. Find subscriptions with failed payments
      // 2. Retry payment processing
      // 3. Send appropriate notifications based on retry results
      // 4. Update subscription status if all retries fail

      subscriptionLogger.info('Failed payment retries processing completed', LogCategory.SUBSCRIPTION);

    } catch (error: any) {
      subscriptionLogger.error('Failed to process payment retries', error, LogCategory.SUBSCRIPTION);
    }
  }

  // Manual job triggers for testing
  public async triggerRenewalReminders(daysBeforeRenewal: number): Promise<void> {
    const job = this.renewalReminderJobs.find(j => j.daysBeforeRenewal === daysBeforeRenewal);
    if (job) {
      await this.processRenewalReminders(daysBeforeRenewal, job.config);
    } else {
      throw new Error(`No renewal reminder job configured for ${daysBeforeRenewal} days`);
    }
  }

  public async triggerExpiredSubscriptionCheck(): Promise<void> {
    await this.processExpiredSubscriptions();
  }

  // Job management
  public stopJob(jobId: string): void {
    const interval = this.jobIntervals.get(jobId);
    if (interval) {
      clearInterval(interval);
      this.jobIntervals.delete(jobId);
      subscriptionLogger.info(`Stopped job: ${jobId}`, LogCategory.SUBSCRIPTION);
    }
  }

  public stopAllJobs(): void {
    for (const [jobId, interval] of this.jobIntervals.entries()) {
      clearInterval(interval);
    }
    this.jobIntervals.clear();
    subscriptionLogger.info('All subscription email jobs stopped', LogCategory.SUBSCRIPTION);
  }

  public getJobStatus(): Record<string, boolean> {
    const status: Record<string, boolean> = {};
    for (const [jobId] of this.jobIntervals.entries()) {
      status[jobId] = true;
    }
    return status;
  }
}

// Create singleton instance
export const subscriptionEmailJobs = new SubscriptionEmailJobs();

// Helper function to send test emails
export const sendTestEmails = {
  renewalReminder: async (userEmail: string, daysBeforeRenewal: number = 7) => {
    const testData = {
      userName: 'Test User',
      userEmail,
      planName: 'Professional Plan',
      planPrice: '$29.99',
      currency: 'USD',
      billingPeriod: 'monthly' as const,
      nextBillingDate: new Date(Date.now() + daysBeforeRenewal * 24 * 60 * 60 * 1000).toLocaleDateString(),
      subscriptionId: 'test_sub_123',
      supportUrl: '/contact',
      manageSubscriptionUrl: '/subscription/manage',
      companyName: 'Test Company',
      daysUntilRenewal: daysBeforeRenewal,
      renewalAmount: '$29.99',
      updatePaymentUrl: '/subscription/payment-methods'
    };

    return await sendSubscriptionEmail.renewalReminder(userEmail, testData);
  },

  subscriptionConfirmation: async (userEmail: string) => {
    const testData = {
      userName: 'Test User',
      userEmail,
      planName: 'Professional Plan',
      planPrice: '$29.99',
      currency: 'USD',
      billingPeriod: 'monthly' as const,
      nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      subscriptionId: 'test_sub_123',
      supportUrl: '/contact',
      manageSubscriptionUrl: '/subscription/manage',
      companyName: 'Test Company'
    };

    return await sendSubscriptionEmail.confirmation(userEmail, testData);
  }
};