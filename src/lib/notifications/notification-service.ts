import { notificationDb } from './database-operations';
import { templateEngine } from './template-engine';
import { resendService } from './resend-service';
import { NOTIFICATION_CONFIGS, PRIORITY_WEIGHTS, EMAIL_CONFIG } from './config';
import { NotificationType, NotificationPriority, INotificationEventDocument } from '../database/models/NotificationEvent';
import { IQueuedNotificationDocument } from '../database/models/QueuedNotification';
import { User } from '../database/models';

export interface NotificationEventData {
  type: NotificationType;
  userId: string;
  data: any;
  priority?: NotificationPriority;
  scheduledFor?: Date;
}

export interface NotificationResult {
  success: boolean;
  eventId?: string;
  queuedId?: string;
  error?: string;
  skipped?: boolean;
  reason?: string;
}

export class NotificationService {
  private isProcessing: boolean = false;
  private processingInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startQueueProcessor();
  }

  /**
   * Trigger a notification event
   */
  async triggerNotification(eventData: NotificationEventData): Promise<NotificationResult> {
    try {
      // Create notification event
      const event = await notificationDb.createNotificationEvent(eventData);

      // Check if user preferences allow this notification
      const canSend = await this.checkUserPreferences(eventData.userId, eventData.type);
      if (!canSend) {
        return {
          success: true,
          eventId: (event._id as any).toString(),
          skipped: true,
          reason: 'User preferences disabled this notification type'
        };
      }

      // Get user data
      const user = await User.findById(eventData.userId);
      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      // Queue the notification for processing
      const queuedNotification = await this.queueNotification(event, user);

      return {
        success: true,
        eventId: (event._id as any).toString(),
                queuedId: (queuedNotification._id as any).toString()
      };
    } catch (error) {
      console.error('Failed to trigger notification:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Queue a notification for processing
   */
  private async queueNotification(
    event: INotificationEventDocument,
    user: any
  ): Promise<IQueuedNotificationDocument> {
    const config = NOTIFICATION_CONFIGS[event.type];

    // Render email template
    const templateVariables = {
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        name: user.getFullName()
      },
      ...event.data
    };

    const renderedTemplate = await templateEngine.renderTemplateByType(event.type, templateVariables);

    // Create queued notification
    return await notificationDb.createQueuedNotification({
      eventId: (event._id as any).toString(),
      userId: event.userId,
      email: user.email,
      subject: renderedTemplate.subject,
      htmlContent: renderedTemplate.html,
      textContent: renderedTemplate.text,
      templateId: config.templateId,
      priority: PRIORITY_WEIGHTS[event.priority],
      scheduledFor: event.scheduledFor,
      maxAttempts: config.maxRetries
    });
  }

  /**
   * Check user preferences for notification type
   */
  private async checkUserPreferences(userId: string, type: NotificationType): Promise<boolean> {
    const config = NOTIFICATION_CONFIGS[type];

    if (!config.requiresUserPreference) {
      return true; // Always send if no preference check required
    }

    const preferences = await notificationDb.getEmailPreferences(userId);
    if (!preferences) {
      return true; // Default to sending if no preferences set
    }

    return preferences[config.preferenceKey] === true;
  }

  /**
   * Process notification queue
   */
  async processQueue(): Promise<{
    processed: number;
    sent: number;
    failed: number;
    skipped: number;
  }> {
    if (this.isProcessing) {
      return { processed: 0, sent: 0, failed: 0, skipped: 0 };
    }

    this.isProcessing = true;
    let processed = 0;
    let sent = 0;
    let failed = 0;
    let skipped = 0;

    try {
      // Get pending notifications
      const pendingNotifications = await notificationDb.getPendingNotifications(EMAIL_CONFIG.BATCH_SIZE);

      if (pendingNotifications.length === 0) {
        return { processed, sent, failed, skipped };
      }

      // Group notifications for batching
      const batchableNotifications = this.groupNotificationsForBatching(pendingNotifications);

      // Process each group
      for (const group of batchableNotifications) {
        if (group.length === 1) {
          // Single notification
          const result = await this.processSingleNotification(group[0]);
          processed++;
          if (result.success) sent++;
          else failed++;
        } else {
          // Batch notifications
          const results = await this.processBatchNotifications(group);
          processed += results.length;
          sent += results.filter(r => r.success).length;
          failed += results.filter(r => !r.success).length;
        }
      }

      // Mark processed events as complete
      const eventIds = pendingNotifications.map(n => n.eventId);
      for (const eventId of eventIds) {
        await notificationDb.markEventAsProcessed(eventId);
      }

    } catch (error) {
      console.error('Queue processing error:', error);
    } finally {
      this.isProcessing = false;
    }

    return { processed, sent, failed, skipped };
  }

  /**
   * Group notifications for batching
   */
  private groupNotificationsForBatching(notifications: IQueuedNotificationDocument[]): IQueuedNotificationDocument[][] {
    const groups: IQueuedNotificationDocument[][] = [];
    const batchableByType: { [key: string]: IQueuedNotificationDocument[] } = {};

    for (const notification of notifications) {
      const config = NOTIFICATION_CONFIGS[notification.templateId as NotificationType];

      if (config?.batchable) {
        if (!batchableByType[notification.templateId]) {
          batchableByType[notification.templateId] = [];
        }
        batchableByType[notification.templateId].push(notification);
      } else {
        groups.push([notification]);
      }
    }

    // Add batched groups
    Object.values(batchableByType).forEach(batch => {
      if (batch.length > 0) {
        groups.push(batch);
      }
    });

    return groups;
  }

  /**
   * Process a single notification
   */
  private async processSingleNotification(notification: IQueuedNotificationDocument): Promise<{ success: boolean; error?: string }> {
    try {
      // Update status to processing
      await notificationDb.updateNotificationStatus((notification._id as any).toString(), 'processing');

      // Send email
      const result = await resendService.sendEmail({
        to: notification.email,
        subject: notification.subject,
        html: notification.htmlContent,
        text: notification.textContent
      });

      if (result.success) {
        // Update status to sent
        await notificationDb.updateNotificationStatus((notification._id as any).toString(), 'sent');

        // Log successful delivery
        await notificationDb.createNotificationLog({
          userId: notification.userId,
          notificationId: (notification._id as any).toString(),
          type: notification.templateId as NotificationType,
          status: 'sent',
          email: notification.email,
          subject: notification.subject,
          sentAt: new Date(),
          resendId: result.messageId
        });

        return { success: true };
      } else {
        // Handle failure
        await this.handleNotificationFailure(notification, result.error || 'Unknown error');
        return { success: false, error: result.error };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.handleNotificationFailure(notification, errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Process batch notifications
   */
  private async processBatchNotifications(notifications: IQueuedNotificationDocument[]): Promise<Array<{ success: boolean; error?: string }>> {
    try {
      // Update all to processing
      await Promise.all(
        notifications.map(n =>
          notificationDb.updateNotificationStatus((n._id as any).toString(), 'processing')
        )
      );

      // Prepare bulk email data
      const bulkEmails = notifications.map(notification => ({
        id: (notification._id as any).toString(),
        to: notification.email,
        subject: notification.subject,
        html: notification.htmlContent,
        text: notification.textContent
      }));

      // Send bulk emails
      const bulkResult = await resendService.sendBulkEmails(bulkEmails);

      // Process results
      const results: Array<{ success: boolean; error?: string }> = [];

      for (const result of bulkResult.results) {
        const notification = notifications.find(n => n._id.toString() === result.id);
        if (!notification) continue;

        if (result.success) {
          // Update status to sent
          await notificationDb.updateNotificationStatus(notification._id.toString(), 'sent');

          // Log successful delivery
          await notificationDb.createNotificationLog({
            userId: notification.userId,
            notificationId: notification._id.toString(),
            type: notification.templateId as NotificationType,
            status: 'sent',
            email: notification.email,
            subject: notification.subject,
            sentAt: new Date(),
            resendId: result.messageId
          });

          results.push({ success: true });
        } else {
          // Handle failure
          await this.handleNotificationFailure(notification, result.error || 'Unknown error');
          results.push({ success: false, error: result.error });
        }
      }

      return results;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Mark all as failed
      await Promise.all(
        notifications.map(n => this.handleNotificationFailure(n, errorMessage))
      );

      return notifications.map(() => ({ success: false, error: errorMessage }));
    }
  }

  /**
   * Handle notification failure with retry logic
   */
  private async handleNotificationFailure(notification: IQueuedNotificationDocument, error: string): Promise<void> {
    // Increment attempts
    const updated = await notificationDb.incrementNotificationAttempts(notification._id.toString());
    if (!updated) return;

    const config = NOTIFICATION_CONFIGS[notification.templateId as NotificationType];

    if (updated.attempts >= updated.maxAttempts) {
      // Max attempts reached, mark as failed
      await notificationDb.updateNotificationStatus(
        notification._id.toString(),
        'failed',
        error
      );

      // Log failure
      await notificationDb.createNotificationLog({
        userId: notification.userId,
        notificationId: notification._id.toString(),
        type: notification.templateId as NotificationType,
        status: 'failed',
        email: notification.email,
        subject: notification.subject,
        sentAt: new Date(),
        errorMessage: error
      });
    } else {
      // Schedule retry
      const retryDelay = config.retryDelay * Math.pow(2, updated.attempts - 1); // Exponential backoff
      const retryTime = new Date(Date.now() + retryDelay);

      await notificationDb.updateQueuedNotification(notification._id.toString(), {
        status: 'pending',
        scheduledFor: retryTime,
        errorMessage: error
      });
    }
  }

  /**
   * Start automatic queue processing
   */
  private startQueueProcessor(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }

    this.processingInterval = setInterval(async () => {
      try {
        await this.processQueue();
      } catch (error) {
        console.error('Queue processor error:', error);
      }
    }, EMAIL_CONFIG.QUEUE_PROCESSING_INTERVAL);
  }

  /**
   * Stop automatic queue processing
   */
  stopQueueProcessor(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }

  /**
   * Get notification history for a user
   */
  async getNotificationHistory(userId: string, limit: number = 50): Promise<any[]> {
    return await notificationDb.getNotificationLogsByUser(userId, limit);
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(userId: string, preferences: any): Promise<any> {
    return await notificationDb.updateEmailPreferences(userId, preferences);
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<any> {
    return await notificationDb.getQueueStats();
  }

  /**
   * Get delivery statistics
   */
  async getDeliveryStats(startDate?: Date, endDate?: Date): Promise<any> {
    return await notificationDb.getDeliveryStats(startDate, endDate);
  }

  /**
   * Get engagement statistics
   */
  async getEngagementStats(startDate?: Date, endDate?: Date): Promise<any> {
    return await notificationDb.getEngagementStats(startDate, endDate);
  }

  /**
   * Cleanup old data
   */
  async cleanupOldData(): Promise<any> {
    return await notificationDb.cleanupOldData();
  }

  /**
   * Test notification system
   */
  async testNotification(userId: string, type: NotificationType, testData?: any): Promise<NotificationResult> {
    const defaultTestData = {
      product: {
        title: 'Test Product',
        sku: 'TEST-001',
        qty: 5,
        lowStockThreshold: 10,
        _id: 'test-product-id'
      },
      task: {
        title: 'Test Task',
        description: 'This is a test task',
        date: new Date().toISOString().split('T')[0],
        taskProperty: 'High Priority'
      },
      invoice: {
        invoiceNumber: 'INV-TEST-001',
        status: 'Sent',
        grandTotal: 1000,
        billTo: 'Test Client',
        orderDate: new Date().toISOString().split('T')[0],
        _id: 'test-invoice-id'
      }
    };

    return await this.triggerNotification({
      type,
      userId,
      data: { ...defaultTestData, ...testData },
      priority: 'medium'
    });
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
export default NotificationService;