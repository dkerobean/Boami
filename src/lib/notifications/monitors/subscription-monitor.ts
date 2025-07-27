import { notificationService } from '../notification-service';
import { User, Subscription, Plan } from '../../database/models';
import { connectToDatabase } from '../../database/mongoose-connection';

export interface SubscriptionNotificationData {
  _id: string;
  userId: string;
  planId: string;
  planName: string;
  status: string;
  amount: number;
  expiryDate: string;
  renewalDate?: string;
  cancelledAt?: string;
  isActive: boolean;
}

export class SubscriptionMonitor {
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private processedRenewals = new Set<string>();

  /**
   * Start monitoring subscription renewals
   */
  startRenewalMonitoring(intervalHours: number = 12): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(async () => {
      try {
        await this.checkSubscriptionRenewals();
      } catch (error) {
        console.error('Subscription renewal monitoring error:', error);
      }
    }, intervalHours * 60 * 60 * 1000);

    console.log(`Subscription renewal monitoring started (checking every ${intervalHours} hours)`);
  }

  /**
   * Stop monitoring subscription renewals
   */
  stopRenewalMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    console.log('Subscription renewal monitoring stopped');
  }

  /**
   * Check for subscriptions needing renewal reminders
   */
  async checkSubscriptionRenewals(): Promise<SubscriptionNotificationData[]> {
    try {
      await connectToDatabase();

      // Get subscriptions expiring in 7 days
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

      const expiringSubscriptions = await Subscription.find({
        isActive: true,
        expiresAt: {
          $lte: sevenDaysFromNow,
          $gte: new Date()
        }
      }).populate('planId');

      const renewalNotifications: SubscriptionNotificationData[] = [];

      for (const subscription of expiringSubscriptions) {
        const renewalKey = `${subscription._id}-renewal`;

        // Skip if we've already sent renewal reminder
        if (this.processedRenewals.has(renewalKey)) {
          continue;
        }

        const user = await User.findById(subscription.userId);
        if (!user) {
          console.warn(`User not found for subscription ${subscription._id}`);
          continue;
        }

        const plan = subscription.planId as any;
        const daysUntilExpiry = Math.ceil(
          (new Date(subscription.expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );

        const subscriptionData: SubscriptionNotificationData = {
          _id: subscription._id.toString(),
          userId: subscription.userId,
          planId: subscription.planId.toString(),
          planName: plan?.name || 'Unknown Plan',
          status: subscription.status,
          amount: subscription.amount,
          expiryDate: subscription.expiresAt.toISOString().split('T')[0],
          isActive: subscription.isActive
        };

        await notificationService.triggerNotification({
          type: 'subscription_renewal',
          userId: user._id.toString(),
          data: {
            subscription: subscriptionData,
            daysUntilExpiry
          },
          priority: 'high'
        });

        renewalNotifications.push(subscriptionData);

        // Mark as processed
        this.processedRenewals.add(renewalKey);

        // Clean up old processed renewals (keep for 30 days)
        setTimeout(() => {
          this.processedRenewals.delete(renewalKey);
        }, 30 * 24 * 60 * 60 * 1000);

        console.log(`Subscription renewal reminder sent to ${user.email} for plan: ${plan?.name}`);
      }

      return renewalNotifications;
    } catch (error) {
      console.error('Failed to check subscription renewals:', error);
      return [];
    }
  }

  /**
   * Handle subscription payment failure
   */
  async onSubscriptionPaymentFailed(subscriptionData: SubscriptionNotificationData): Promise<void> {
    try {
      await connectToDatabase();

      const user = await User.findById(subscriptionData.userId);
      if (!user) {
        console.warn(`User not found for failed payment: ${subscriptionData.userId}`);
        return;
      }

      await notificationService.triggerNotification({
        type: 'subscription_payment_failed',
        userId: user._id.toString(),
        data: { subscription: subscriptionData },
        priority: 'critical'
      });

      console.log(`Payment failure notification sent to ${user.email} for subscription: ${subscriptionData._id}`);
    } catch (error) {
      console.error('Failed to send payment failure notification:', error);
    }
  }

  /**
   * Handle subscription renewal confirmation
   */
  async onSubscriptionRenewed(subscriptionData: SubscriptionNotificationData): Promise<void> {
    try {
      await connectToDatabase();

      const user = await User.findById(subscriptionData.userId);
      if (!user) {
        console.warn(`User not found for renewal: ${subscriptionData.userId}`);
        return;
      }

      await notificationService.triggerNotification({
        type: 'subscription_renewal',
        userId: user._id.toString(),
        data: {
          subscription: {
            ...subscriptionData,
            isRenewalConfirmation: true
          }
        },
        priority: 'medium'
      });

      console.log(`Subscription renewal confirmation sent to ${user.email} for plan: ${subscriptionData.planName}`);
    } catch (error) {
      console.error('Failed to send renewal confirmation:', error);
    }
  }

  /**
   * Handle subscription cancellation
   */
  async onSubscriptionCancelled(subscriptionData: SubscriptionNotificationData): Promise<void> {
    try {
      await connectToDatabase();

      const user = await User.findById(subscriptionData.userId);
      if (!user) {
        console.warn(`User not found for cancellation: ${subscriptionData.userId}`);
        return;
      }

      await notificationService.triggerNotification({
        type: 'subscription_cancelled',
        userId: user._id.toString(),
        data: {
          subscription: {
            ...subscriptionData,
            cancelledAt: new Date().toISOString().split('T')[0]
          }
        },
        priority: 'medium'
      });

      console.log(`Subscription cancellation confirmation sent to ${user.email} for plan: ${subscriptionData.planName}`);
    } catch (error) {
      console.error('Failed to send cancellation confirmation:', error);
    }
  }

  /**
   * Get subscription summary for user
   */
  async getSubscriptionSummary(userId: string): Promise<{
    hasActiveSubscription: boolean;
    currentPlan?: string;
    expiryDate?: string;
    daysUntilExpiry?: number;
    status: string;
  }> {
    try {
      await connectToDatabase();

      const subscription = await Subscription.findOne({
        userId,
        isActive: true
      }).populate('planId');

      if (!subscription) {
        return {
          hasActiveSubscription: false,
          status: 'none'
        };
      }

      const plan = subscription.planId as any;
      const daysUntilExpiry = Math.ceil(
        (new Date(subscription.expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        hasActiveSubscription: true,
        currentPlan: plan?.name || 'Unknown Plan',
        expiryDate: subscription.expiresAt.toISOString().split('T')[0],
        daysUntilExpiry,
        status: subscription.status
      };
    } catch (error) {
      console.error('Failed to get subscription summary:', error);
      return {
        hasActiveSubscription: false,
        status: 'error'
      };
    }
  }

  /**
   * Test subscription notification system
   */
  async testSubscriptionNotification(
    userId: string,
    type: 'renewal' | 'payment_failed' | 'cancelled'
  ): Promise<void> {
    const testSubscription: SubscriptionNotificationData = {
      _id: 'test-subscription-id',
      userId,
      planId: 'test-plan-id',
      planName: 'Pro Plan',
      status: 'active',
      amount: 29.99,
      expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      isActive: true
    };

    let notificationType: 'subscription_renewal' | 'subscription_payment_failed' | 'subscription_cancelled';
    let priority: 'high' | 'critical' | 'medium' = 'medium';

    switch (type) {
      case 'renewal':
        notificationType = 'subscription_renewal';
        priority = 'high';
        break;
      case 'payment_failed':
        notificationType = 'subscription_payment_failed';
        priority = 'critical';
        break;
      case 'cancelled':
        notificationType = 'subscription_cancelled';
        testSubscription.cancelledAt = new Date().toISOString().split('T')[0];
        break;
    }

    await notificationService.triggerNotification({
      type: notificationType,
      userId,
      data: {
        subscription: testSubscription,
        daysUntilExpiry: type === 'renewal' ? 7 : undefined
      },
      priority
    });

    console.log(`Test ${type} notification sent to user ${userId}`);
  }

  /**
   * Get monitoring status
   */
  getMonitoringStatus(): {
    isMonitoring: boolean;
    processedRenewalsCount: number;
  } {
    return {
      isMonitoring: this.monitoringInterval !== null,
      processedRenewalsCount: this.processedRenewals.size
    };
  }
}

// Export singleton instance
export const subscriptionMonitor = new SubscriptionMonitor();
export default SubscriptionMonitor;