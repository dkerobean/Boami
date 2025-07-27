import { User, Subscription, Plan } from '../database/models';
import { SubscriptionEmailService } from '../email/subscription-email-service';
import { generateUnsubscribeUrl } from '../../app/api/email/unsubscribe/route';

/**
 * Service for integrating subscription events with email notifications
 */
export class SubscriptionEmailIntegration {

  /**
   * Send welcome email when subscription is created
   */
  static async sendWelcomeEmail(subscriptionId: string) {
    try {
      const subscription = await Subscription.findById(subscriptionId)
        .populate('userId')
        .populate('planId');

      if (!subscription || !subscription.userId || !subscription.planId) {
        console.error('Subscription, user, or plan not found for welcome email');
        return;
      }

      const user = subscription.userId as any;
      const plan = subscription.planId as any;

      // Check if user wants to receive subscription emails
      if (!this.shouldSendEmail(user, 'subscriptionConfirmation')) {
        console.log(`Skipping welcome email for ${user.email} - user opted out`);
        return;
      }

      const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

      await SubscriptionEmailService.sendSubscriptionWelcome(user.email, {
        firstName: user.firstName,
        planName: plan.name,
        planPrice: subscription.billingPeriod === 'annual' ? plan.price.annual : plan.price.monthly,
        currency: plan.price.currency,
        billingPeriod: subscription.billingPeriod,
        features: plan.features || [],
        appUrl
      });

      console.log(`Welcome email sent to ${user.email} for subscription ${subscriptionId}`);

    } catch (error) {
      console.error('Error sending welcome email:', error);
    }
  }

  /**
   * Send renewal reminder email
   */
  static async sendRenewalReminder(subscriptionId: string) {
    try {
      const subscription = await Subscription.findById(subscriptionId)
        .populate('userId')
        .populate('planId');

      if (!subscription || !subscription.userId || !subscription.planId) {
        console.error('Subscription, user, or plan not found for renewal reminder');
        return;
      }

      const user = subscription.userId as any;
      const plan = subscription.planId as any;

      // Check if user wants to receive renewal reminders
      if (!this.shouldSendEmail(user, 'renewalReminders')) {
        console.log(`Skipping renewal reminder for ${user.email} - user opted out`);
        return;
      }

      const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

      await SubscriptionEmailService.sendRenewalReminder(user.email, {
        firstName: user.firstName,
        planName: plan.name,
        planPrice: subscription.billingPeriod === 'annual' ? plan.price.annual : plan.price.monthly,
        currency: plan.price.currency,
        billingPiod: subscription.billingPeriod,
        renewalDate: subscription.currentPeriodEnd.toLocaleDateString(),
        appUrl
      });

      console.log(`Renewal reminder sent to ${user.email} for subscription ${subscriptionId}`);

    } catch (error) {
      console.error('Error sending renewal reminder:', error);
    }
  }

  /**
   * Send cancellation confirmation email
   */
  static async sendCancellationEmail(subscriptionId: string, reason?: string) {
    try {
      const subscription = await Subscription.findById(subscriptionId)
        .populate('userId')
        .populate('planId');

      if (!subscription || !subscription.userId || !subscription.planId) {
        console.error('Subscription, user, or plan not found for cancellation email');
        return;
      }

      const user = subscription.userId as any;
      const plan = subscription.planId as any;

      // Check if user wants to receive cancellation notifications
      if (!this.shouldSendEmail(user, 'cancellationNotifications')) {
        console.log(`Skipping cancellation email for ${user.email} - user opted out`);
        return;
      }

      const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

      await SubscriptionEmailService.sendSubscriptionCancelled(user.email, {
        firstName: user.firstName,
        planName: plan.name,
        cancellationDate: subscription.cancelledAt?.toLocaleDateString() || new Date().toLocaleDateString(),
        accessEndDate: subscription.currentPeriodEnd.toLocaleDateString(),
        reason,
        appUrl
      });

      console.log(`Cancellation email sent to ${user.email} for subscription ${subscriptionId}`);

    } catch (error) {
      console.error('Error sending cancellation email:', error);
    }
  }

  /**
   * Send payment failed email
   */
  static async sendPaymentFailedEmail(subscriptionId: string, failureReason: string) {
    try {
      const subscription = await Subscription.findById(subscriptionId)
        .populate('userId')
        .populate('planId');

      if (!subscription || !subscription.userId || !subscription.planId) {
        console.error('Subscription, user, or plan not found for payment failed email');
        return;
      }

      const user = subscription.userId as any;
      const plan = subscription.planId as any;

      // Check if user wants to receive payment notifications
      if (!this.shouldSendEmail(user, 'paymentNotifications')) {
        console.log(`Skipping payment failed email for ${user.email} - user opted out`);
        return;
      }

      const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

      // Calculate retry date and grace period end
      const retryDate = new Date();
      retryDate.setDate(retryDate.getDate() + 1); // Retry in 1 day

      const gracePeriodEnd = new Date();
      gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 3); // 3-day grace period

      await SubscriptionEmailService.sendPaymentFailed(user.email, {
        firstName: user.firstName,
        planName: plan.name,
        amount: subscription.billingPeriod === 'annual' ? plan.price.annual : plan.price.monthly,
        currency: plan.price.currency,
        failureReason,
        retryDate: retryDate.toLocaleDateString(),
        gracePeriodEnd: gracePeriodEnd.toLocaleDateString(),
        appUrl
      });

      console.log(`Payment failed email sent to ${user.email} for subscription ${subscriptionId}`);

    } catch (error) {
      console.error('Error sending payment failed email:', error);
    }
  }

  /**
   * Send subscription expired email
   */
  static async sendExpiredEmail(subscriptionId: string) {
    try {
      const subscription = await Subscription.findById(subscriptionId)
        .populate('userId')
        .populate('planId');

      if (!subscription || !subscription.userId || !subscription.planId) {
        console.error('Subscription, user, or plan not found for expired email');
        return;
      }

      const user = subscription.userId as any;
      const plan = subscription.planId as any;

      // Check if user wants to receive subscription notifications
      if (!this.shouldSendEmail(user, 'subscriptionConfirmation')) {
        console.log(`Skipping expired email for ${user.email} - user opted out`);
        return;
      }

      const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

      await SubscriptionEmailService.sendSubscriptionExpired(user.email, {
        firstName: user.firstName,
        planName: plan.name,
        expiredDate: subscription.expiredAt?.toLocaleDateString() || new Date().toLocaleDateString(),
        appUrl
      });

      console.log(`Expired email sent to ${user.email} for subscription ${subscriptionId}`);

    } catch (error) {
      console.error('Error sending expired email:', error);
    }
  }

  /**
   * Send subscription renewed email
   */
  static async sendRenewedEmail(subscriptionId: string, transactionAmount: number, currency: string) {
    try {
      const subscription = await Subscription.findById(subscriptionId)
        .populate('userId')
        .populate('planId');

      if (!subscription || !subscription.userId || !subscription.planId) {
        console.error('Subscription, user, or plan not found for renewed email');
        return;
      }

      const user = subscription.userId as any;
      const plan = subscription.planId as any;

      // Check if user wants to receive payment notifications
      if (!this.shouldSendEmail(user, 'paymentNotifications')) {
        console.log(`Skipping renewed email for ${user.email} - user opted out`);
        return;
      }

      const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

      await SubscriptionEmailService.sendSubscriptionRenewed(
        user.email,
        user.firstName,
        plan.name,
        transactionAmount,
        currency,
        subscription.currentPeriodEnd.toLocaleDateString(),
        appUrl
      );

      console.log(`Renewed email sent to ${user.email} for subscription ${subscriptionId}`);

    } catch (error) {
      console.error('Error sending renewed email:', error);
    }
  }

  /**
   * Send batch renewal reminders for subscriptions expiring soon
   */
  static async sendBatchRenewalReminders() {
    try {
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

      const subscriptionsToRemind = await Subscription.find({
        isActive: true,
        currentPeriodEnd: {
          $gte: new Date(),
          $lte: threeDaysFromNow
        },
        'metadata.renewalReminderSent': { $ne: true }
      }).populate('userId').populate('planId');

      console.log(`Found ${subscriptionsToRemind.length} subscriptions for renewal reminders`);

      const emailPromises = subscriptionsToRemind.map(async (subscription) => {
        try {
          await this.sendRenewalReminder(subscription._id);

          // Mark reminder as sent
          subscription.metadata = subscription.metadata || {};
          subscription.metadata.renewalReminderSent = true;
          await subscription.save();

          return { subscriptionId: subscription._id, success: true };
        } catch (error) {
          console.error(`Error sending renewal reminder for subscription ${subscription._id}:`, error);
          return { subscriptionId: subscription._id, success: false, error: error.message };
        }
      });

      const results = await Promise.all(emailPromises);

      return {
        total: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        details: results
      };

    } catch (error) {
      console.error('Error sending batch renewal reminders:', error);
      throw error;
    }
  }

  /**
   * Check if user should receive a specific type of email
   */
  private static shouldSendEmail(user: any, emailType: string): boolean {
    if (!user.emailPreferences) {
      return true; // Default to sending emails if preferences not set
    }

    return user.emailPreferences[emailType] !== false;
  }

  /**
   * Generate unsubscribe URL for subscription emails
   */
  static generateUnsubscribeUrl(userId: string, emailType: string): string {
    return generateUnsubscribeUrl(userId, emailType);
  }

  /**
   * Test subscription email functionality
   */
  static async testSubscriptionEmails(testEmail: string) {
    try {
      const result = await SubscriptionEmailService.sendTestSubscriptionEmail(testEmail);

      if (result.success) {
        console.log(`Test subscription email sent successfully to ${testEmail}`);
      } else {
        console.error(`Failed to send test subscription email: ${result.error}`);
      }

      return result;

    } catch (error) {
      console.error('Error testing subscription emails:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}