import {
  NotificationEvent,
  QueuedNotification,
  EmailTemplate,
  NotificationLog,
  EmailPreferences
} from '../database/models';
import type { INotificationEventDocument } from '../database/models/NotificationEvent';
import type { IQueuedNotificationDocument } from '../database/models/QueuedNotification';
import type { IEmailTemplateDocument } from '../database/models/EmailTemplate';
import type { INotificationLogDocument } from '../database/models/NotificationLog';
import type { IEmailPreferencesDocument } from '../database/models/EmailPreferences';
import type { NotificationType, NotificationPriority } from '../database/models/NotificationEvent';
import type { NotificationStatus } from '../database/models/QueuedNotification';
import type { NotificationLogStatus } from '../database/models/NotificationLog';
import type { DigestFrequency } from '../database/models/EmailPreferences';

export class NotificationDatabaseOperations {

  // ============ NOTIFICATION EVENT OPERATIONS ============

  async createNotificationEvent(data: {
    type: NotificationType;
    userId: string;
    data: any;
    priority?: NotificationPriority;
    scheduledFor?: Date;
  }): Promise<INotificationEventDocument> {
    return await NotificationEvent.create({
      type: data.type,
      userId: data.userId,
      data: data.data,
      priority: data.priority || 'medium',
      scheduledFor: data.scheduledFor || new Date(),
      processed: false
    });
  }

  async getNotificationEvent(id: string): Promise<INotificationEventDocument | null> {
    return await NotificationEvent.findById(id);
  }

  async updateNotificationEvent(id: string, updates: Partial<INotificationEventDocument>): Promise<INotificationEventDocument | null> {
    return await NotificationEvent.findByIdAndUpdate(id, updates, { new: true });
  }

  async markEventAsProcessed(id: string): Promise<INotificationEventDocument | null> {
    return await NotificationEvent.findByIdAndUpdate(id, {
      processed: true,
      processedAt: new Date()
    }, { new: true });
  }

  async getPendingEvents(limit: number = 100): Promise<INotificationEventDocument[]> {
    return await NotificationEvent.find({ processed: false }).limit(limit);
  }

  async getEventsByUser(userId: string, limit: number = 50): Promise<INotificationEventDocument[]> {
    return await NotificationEvent.find({ userId }).limit(limit);
  }

  async getEventsByType(type: NotificationType, limit: number = 50): Promise<INotificationEventDocument[]> {
    return await NotificationEvent.find({ type }).limit(limit);
  }

  async deleteOldEvents(olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await NotificationEvent.deleteMany({
      processed: true,
      createdAt: { $lt: cutoffDate }
    });

    return result.deletedCount || 0;
  }

  // ============ QUEUED NOTIFICATION OPERATIONS ============

  async createQueuedNotification(data: {
    eventId: string;
    userId: string;
    email: string;
    subject: string;
    htmlContent: string;
    textContent: string;
    templateId: string;
    priority?: number;
    scheduledFor?: Date;
    maxAttempts?: number;
  }): Promise<IQueuedNotificationDocument> {
    return await QueuedNotification.create({
      eventId: data.eventId,
      userId: data.userId,
      email: data.email,
      subject: data.subject,
      htmlContent: data.htmlContent,
      textContent: data.textContent,
      templateId: data.templateId,
      priority: data.priority || 5,
      scheduledFor: data.scheduledFor || new Date(),
      maxAttempts: data.maxAttempts || 3,
      attempts: 0,
      status: 'pending'
    });
  }

  async getQueuedNotification(id: string): Promise<IQueuedNotificationDocument | null> {
    return await QueuedNotification.findById(id);
  }

  async updateQueuedNotification(id: string, updates: Partial<IQueuedNotificationDocument>): Promise<IQueuedNotificationDocument | null> {
    return await QueuedNotification.findByIdAndUpdate(id, updates, { new: true });
  }

  async updateNotificationStatus(id: string, status: NotificationStatus, errorMessage?: string): Promise<IQueuedNotificationDocument | null> {
    const updates: any = { status };

    if (status === 'processing') {
      updates.processedAt = new Date();
    } else if (status === 'sent') {
      updates.sentAt = new Date();
    } else if (status === 'failed' && errorMessage) {
      updates.errorMessage = errorMessage;
    }

    return await QueuedNotification.findByIdAndUpdate(id, updates, { new: true });
  }

  async incrementNotificationAttempts(id: string): Promise<IQueuedNotificationDocument | null> {
    return await QueuedNotification.findByIdAndUpdate(id, {
      $inc: { attempts: 1 }
    }, { new: true });
  }

  async getPendingNotifications(limit: number = 100): Promise<IQueuedNotificationDocument[]> {
    return await QueuedNotification.find({ status: 'pending' }).limit(limit);
  }

  async getNotificationsByStatus(status: NotificationStatus, limit: number = 50): Promise<IQueuedNotificationDocument[]> {
    return await QueuedNotification.find({ status }).limit(limit);
  }

  async getFailedNotifications(limit: number = 50): Promise<IQueuedNotificationDocument[]> {
    return await QueuedNotification.find({ status: 'failed' }).limit(limit);
  }

  async getNotificationsByUser(userId: string, limit: number = 50): Promise<IQueuedNotificationDocument[]> {
    return await QueuedNotification.find({ userId }).limit(limit);
  }

  async deleteOldQueuedNotifications(olderThanDays: number = 7): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await QueuedNotification.deleteMany({
      status: { $in: ['sent', 'failed', 'cancelled'] },
      createdAt: { $lt: cutoffDate }
    });

    return result.deletedCount || 0;
  }

  // ============ EMAIL TEMPLATE OPERATIONS ============

  async createEmailTemplate(data: {
    name: string;
    type: NotificationType;
    subject: string;
    htmlTemplate: string;
    textTemplate: string;
    variables: string[];
  }): Promise<IEmailTemplateDocument> {
    return await EmailTemplate.create({
      name: data.name,
      type: data.type,
      subject: data.subject,
      htmlTemplate: data.htmlTemplate,
      textTemplate: data.textTemplate,
      variables: data.variables,
      isActive: true
    });
  }

  async getEmailTemplate(id: string): Promise<IEmailTemplateDocument | null> {
    return await EmailTemplate.findById(id);
  }

  async getEmailTemplateByType(type: NotificationType): Promise<IEmailTemplateDocument | null> {
    return await EmailTemplate.findByType(type);
  }

  async getEmailTemplateByName(name: string): Promise<IEmailTemplateDocument | null> {
    return await EmailTemplate.findByName(name);
  }

  async updateEmailTemplate(id: string, updates: Partial<IEmailTemplateDocument>): Promise<IEmailTemplateDocument | null> {
    return await EmailTemplate.findByIdAndUpdate(id, updates, { new: true });
  }

  async deactivateEmailTemplate(id: string): Promise<IEmailTemplateDocument | null> {
    return await EmailTemplate.findByIdAndUpdate(id, { isActive: false }, { new: true });
  }

  async getActiveEmailTemplates(): Promise<IEmailTemplateDocument[]> {
    return await EmailTemplate.findActiveTemplates();
  }

  async getAllEmailTemplates(): Promise<IEmailTemplateDocument[]> {
    return await EmailTemplate.find().sort({ name: 1 });
  }

  // ============ NOTIFICATION LOG OPERATIONS ============

  async createNotificationLog(data: {
    userId: string;
    notificationId: string;
    type: NotificationType;
    status: NotificationLogStatus;
    email: string;
    subject: string;
    sentAt: Date;
    resendId?: string;
    metadata?: any;
  }): Promise<INotificationLogDocument> {
    return await NotificationLog.create({
      userId: data.userId,
      notificationId: data.notificationId,
      type: data.type,
      status: data.status,
      email: data.email,
      subject: data.subject,
      sentAt: data.sentAt,
      resendId: data.resendId,
      metadata: data.metadata
    });
  }

  async updateNotificationLog(id: string, updates: Partial<INotificationLogDocument>): Promise<INotificationLogDocument | null> {
    return await NotificationLog.findByIdAndUpdate(id, updates, { new: true });
  }

  async markEmailAsOpened(notificationId: string): Promise<INotificationLogDocument | null> {
    return await NotificationLog.findOneAndUpdate(
      { notificationId },
      {
        status: 'opened',
        openedAt: new Date()
      },
      { new: true }
    );
  }

  async markEmailAsClicked(notificationId: string): Promise<INotificationLogDocument | null> {
    return await NotificationLog.findOneAndUpdate(
      { notificationId },
      {
        status: 'clicked',
        clickedAt: new Date()
      },
      { new: true }
    );
  }

  async getNotificationLogsByUser(userId: string, limit: number = 50): Promise<INotificationLogDocument[]> {
    return await NotificationLog.find({ userId }).limit(limit);
  }

  async getNotificationLogsByType(type: NotificationType, limit: number = 50): Promise<INotificationLogDocument[]> {
    return await NotificationLog.find({ type }).limit(limit);
  }

  async getNotificationLogsByStatus(status: NotificationLogStatus, limit: number = 50): Promise<INotificationLogDocument[]> {
    return await NotificationLog.find({ status }).limit(limit);
  }

  async getDeliveryStats(startDate?: Date, endDate?: Date): Promise<any> {
    return await NotificationLog.getDeliveryStats(startDate, endDate);
  }

  async getEngagementStats(startDate?: Date, endDate?: Date): Promise<any> {
    return await NotificationLog.getEngagementStats(startDate, endDate);
  }

  async deleteOldNotificationLogs(olderThanDays: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await NotificationLog.deleteMany({
      sentAt: { $lt: cutoffDate }
    });

    return result.deletedCount || 0;
  }

  // ============ EMAIL PREFERENCES OPERATIONS ============

  async createEmailPreferences(userId: string, preferences?: Partial<IEmailPreferencesDocument>): Promise<IEmailPreferencesDocument> {
    const defaultPrefs = EmailPreferences.getDefaultPreferences();
    return await EmailPreferences.create({
      userId,
      ...defaultPrefs,
      ...preferences,
      unsubscribeToken: require('crypto').randomBytes(32).toString('hex')
    });
  }

  async getEmailPreferences(userId: string): Promise<IEmailPreferencesDocument | null> {
    let preferences = await EmailPreferences.findByUser(userId);

    // Create default preferences if they don't exist
    if (!preferences) {
      preferences = await this.createEmailPreferences(userId);
    }

    return preferences;
  }

  async updateEmailPreferences(userId: string, updates: Partial<IEmailPreferencesDocument>): Promise<IEmailPreferencesDocument | null> {
    return await EmailPreferences.findOneAndUpdate(
      { userId },
      updates,
      { new: true, upsert: true }
    );
  }

  async unsubscribeUser(token: string, notificationType?: keyof IEmailPreferencesDocument): Promise<IEmailPreferencesDocument | null> {
    const preferences = await EmailPreferences.findOne({ unsubscribeToken: token });
    if (!preferences) return null;

    if (notificationType && typeof preferences[notificationType] === 'boolean') {
      (preferences as any)[notificationType] = false;
    } else {
      // Unsubscribe from all non-critical notifications
      preferences.stockAlerts = false;
      preferences.taskNotifications = false;
      preferences.invoiceUpdates = false;
      preferences.subscriptionNotifications = false;
      preferences.financialAlerts = false;
      preferences.systemNotifications = false;
      preferences.marketingEmails = false;
      // Keep security alerts enabled for safety
    }

    return await preferences.save();
  }

  async getAllEmailPreferences(): Promise<IEmailPreferencesDocument[]> {
    return await EmailPreferences.find().sort({ userId: 1 });
  }

  // ============ UTILITY OPERATIONS ============

  async getQueueStats(): Promise<{
    pending: number;
    processing: number;
    sent: number;
    failed: number;
    total: number;
  }> {
    const stats = await QueuedNotification.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const result = {
      pending: 0,
      processing: 0,
      sent: 0,
      failed: 0,
      total: 0
    };

    stats.forEach(stat => {
      if (stat._id in result) {
        result[stat._id as keyof typeof result] = stat.count;
      }
      result.total += stat.count;
    });

    return result;
  }

  async cleanupOldData(options: {
    eventsDays?: number;
    queuedDays?: number;
    logsDays?: number;
  } = {}): Promise<{
    eventsDeleted: number;
    queuedDeleted: number;
    logsDeleted: number;
  }> {
    const [eventsDeleted, queuedDeleted, logsDeleted] = await Promise.all([
      this.deleteOldEvents(options.eventsDays || 30),
      this.deleteOldQueuedNotifications(options.queuedDays || 7),
      this.deleteOldNotificationLogs(options.logsDays || 90)
    ]);

    return {
      eventsDeleted,
      queuedDeleted,
      logsDeleted
    };
  }
}

// Export singleton instance
export const notificationDb = new NotificationDatabaseOperations();
export default NotificationDatabaseOperations;