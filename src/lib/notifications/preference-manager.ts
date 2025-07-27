import { notificationDb } from './database-operations';
import { IEmailPreferencesDocument, DigestFrequency } from '../database/models/EmailPreferences';
import { User } from '../database/models';

export interface PreferenceUpdate {
  stockAlerts?: boolean;
  taskNotifications?: boolean;
  invoiceUpdates?: boolean;
  subscriptionNotifications?: boolean;
  financialAlerts?: boolean;
  systemNotifications?: boolean;
  marketingEmails?: boolean;
  securityAlerts?: boolean;
  digestFrequency?: DigestFrequency;
}

export interface PreferenceMigrationResult {
  migrated: number;
  errors: number;
  details: Array<{
    userId: string;
    success: boolean;
    error?: string;
  }>;
}

export class PreferenceManager {

  /**
   * Get user email preferences
   */
  async getUserPreferences(userId: string): Promise<IEmailPreferencesDocument | null> {
    return await notificationDb.getEmailPreferences(userId);
  }

  /**
   * Update user email preferences
   */
  async updateUserPreferences(userId: string, updates: PreferenceUpdate): Promise<IEmailPreferencesDocument | null> {
    // Validate updates
    const validatedUpdates = this.validatePreferenceUpdates(updates);

    return await notificationDb.updateEmailPreferences(userId, validatedUpdates);
  }

  /**
   * Create default preferences for a new user
   */
  async createDefaultPreferences(userId: string): Promise<IEmailPreferencesDocument> {
    return await notificationDb.createEmailPreferences(userId);
  }

  /**
   * Validate preference updates
   */
  private validatePreferenceUpdates(updates: PreferenceUpdate): PreferenceUpdate {
    const validated: PreferenceUpdate = {};

    // Boolean preferences
    const booleanFields: (keyof PreferenceUpdate)[] = [
      'stockAlerts',
      'taskNotifications',
      'invoiceUpdates',
      'subscriptionNotifications',
      'financialAlerts',
      'systemNotifications',
      'marketingEmails',
      'securityAlerts'
    ];

    booleanFields.forEach(field => {
      if (updates[field] !== undefined) {
        validated[field] = Boolean(updates[field]);
      }
    });

    // Digesty validation
    if (updates.digestFrequency !== undefined) {
      const validFrequencies: DigestFrequency[] = ['immediate', 'daily', 'weekly', 'never'];
      if (validFrequencies.includes(updates.digestFrequency)) {
        validated.digestFrequency = updates.digestFrequency;
      }
    }

    // Security alerts should always remain true for safety
    if (updates.securityAlerts === false) {
      console.warn('Attempt to disable security alerts blocked for safety');
      validated.securityAlerts = true;
    }

    return validated;
  }

  /**
   * Bulk update preferences for multiple users
   */
  async bulkUpdatePreferences(updates: Array<{
    userId: string;
    preferences: PreferenceUpdate;
  }>): Promise<{
    successful: number;
    failed: number;
    details: Array<{
      userId: string;
      success: boolean;
      error?: string;
    }>;
  }> {
    const results = {
      successful: 0,
      failed: 0,
      details: [] as Array<{
        userId: string;
        success: boolean;
        error?: string;
      }>
    };

    for (const update of updates) {
      try {
        await this.updateUserPreferences(update.userId, update.preferences);
        results.successful++;
        results.details.push({
          userId: update.userId,
          success: true
        });
      } catch (error) {
        results.failed++;
        results.details.push({
          userId: update.userId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }

  /**
   * Get preferences summary for admin dashboard
   */
  async getPreferencesSummary(): Promise<{
    totalUsers: number;
    preferenceCounts: {
      stockAlerts: number;
      taskNotifications: number;
      invoiceUpdates: number;
      subscriptionNotifications: number;
      financialAlerts: number;
      systemNotifications: number;
      marketingEmails: number;
      securityAlerts: number;
    };
    digestFrequencyDistribution: {
      immediate: number;
      daily: number;
      weekly: number;
      never: number;
    };
  }> {
    const allPreferences = await notificationDb.getAllEmailPreferences();

    const summary = {
      totalUsers: allPreferences.length,
      preferenceCounts: {
        stockAlerts: 0,
        taskNotifications: 0,
        invoiceUpdates: 0,
        subscriptionNotifications: 0,
        financialAlerts: 0,
        systemNotifications: 0,
        marketingEmails: 0,
        securityAlerts: 0
      },
      digestFrequencyDistribution: {
        immediate: 0,
        daily: 0,
        weekly: 0,
        never: 0
      }
    };

    allPreferences.forEach(pref => {
      // Count enabled preferences
      Object.keys(summary.preferenceCounts).forEach(key => {
        if (pref[key as keyof typeof pref] === true) {
          summary.preferenceCounts[key as keyof typeof summary.preferenceCounts]++;
        }
      });

      // Count digest frequency distribution
      summary.digestFrequencyDistribution[pref.digestFrequency]++;
    });

    return summary;
  }

  /**
   * Migrate existing users to have email preferences
   */
  async migrateExistingUsers(): Promise<PreferenceMigrationResult> {
    const result: PreferenceMigrationResult = {
      migrated: 0,
      errors: 0,
      details: []
    };

    try {
      // Get all users
      const users = await User.find({}, '_id');

      for (const user of users) {
        try {
          // Check if preferences already exist
          const existingPrefs = await notificationDb.getEmailPreferences(user._id.toString());

          if (!existingPrefs) {
            // Create default preferences
            await this.createDefaultPreferences(user._id.toString());
            result.migrated++;
            result.details.push({
              userId: user._id.toString(),
              success: true
            });
          }
        } catch (error) {
          result.errors++;
          result.details.push({
            userId: user._id.toString(),
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }

    return result;
  }

  /**
   * Handle unsubscribe request
   */
  async handleUnsubscribe(token: string, notificationType?: string): Promise<{
    success: boolean;
    message: string;
    preferences?: IEmailPreferencesDocument;
  }> {
    try {
      // Decode email from token (simple base64 encoding)
      const email = Buffer.from(token, 'base64').toString();

      // Find user by email
      const user = await User.findOne({ email });
      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      // Get current preferences
      let preferences = await this.getUserPreferences(user._id.toString());
      if (!preferences) {
        preferences = await this.createDefaultPreferences(user._id.toString());
      }

      // Update preferences based on unsubscribe type
      const updates: PreferenceUpdate = {};

      if (notificationType) {
        // Unsubscribe from specific type
        switch (notificationType) {
          case 'stock':
            updates.stockAlerts = false;
            break;
          case 'tasks':
            updates.taskNotifications = false;
            break;
          case 'invoices':
            updates.invoiceUpdates = false;
            break;
          case 'subscriptions':
            updates.subscriptionNotifications = false;
            break;
          case 'financial':
            updates.financialAlerts = false;
            break;
          case 'system':
            updates.systemNotifications = false;
            break;
          case 'marketing':
            updates.marketingEmails = false;
            break;
          default:
            return {
              success: false,
              message: 'Invalid notification type'
            };
        }
      } else {
        // Unsubscribe from all non-critical notifications
        updates.stockAlerts = false;
        updates.taskNotifications = false;
        updates.invoiceUpdates = false;
        updates.subscriptionNotifications = false;
        updates.financialAlerts = false;
        updates.systemNotifications = false;
        updates.marketingEmails = false;
        // Keep security alerts enabled for safety
      }

      const updatedPreferences = await this.updateUserPreferences(user._id.toString(), updates);

      return {
        success: true,
        message: notificationType
          ? `Successfully unsubscribed from ${notificationType} notifications`
          : 'Successfully unsubscribed from all non-critical notifications',
        preferences: updatedPreferences || undefined
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get users who should receive a specific notification type
   */
  async getUsersForNotificationType(notificationType: keyof PreferenceUpdate): Promise<string[]> {
    const allPreferences = await notificationDb.getAllEmailPreferences();

    return allPreferences
      .filter(pref => pref[notificationType] === true)
      .map(pref => pref.userId);
  }

  /**
   * Check if user should receive notification based on digest frequency
   */
  async shouldSendBasedOnDigestFrequency(userId: string, notificationType: string): Promise<boolean> {
    const preferences = await this.getUserPreferences(userId);
    if (!preferences) return true; // Default to sending

    switch (preferences.digestFrequency) {
      case 'immediate':
        return true;
      case 'daily':
        // Check if we've already sent a digest today
        return await this.checkDailyDigestLimit(userId);
      case 'weekly':
        // Check if we've already sent a digest this week
        return await this.checkWeeklyDigestLimit(userId);
      case 'never':
        return false;
      default:
        return true;
    }
  }

  /**
   * Check daily digest limit
   */
  private async checkDailyDigestLimit(userId: string): Promise<boolean> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todaysLogs = await notificationDb.getNotificationLogsByUser(userId, 100);
    const todaysCount = todaysLogs.filter(log =>
      log.sentAt >= today && log.sentAt < tomorrow
    ).length;

    // Allow maximum 1 digest per day
    return todaysCount === 0;
  }

  /**
   * Check weekly digest limit
   */
  private async checkWeeklyDigestLimit(userId: string): Promise<boolean> {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    const weeklyLogs = await notificationDb.getNotificationLogsByUser(userId, 100);
    const weeklyCount = weeklyLogs.filter(log =>
      log.sentAt >= startOfWeek && log.sentAt < endOfWeek
    ).length;

    // Allow maximum 1 digest per week
    return weeklyCount === 0;
  }

  /**
   * Export user preferences for backup
   */
  async exportPreferences(): Promise<IEmailPreferencesDocument[]> {
    return await notificationDb.getAllEmailPreferences();
  }

  /**
   * Import user preferences from backup
   */
  async importPreferences(preferences: Partial<IEmailPreferencesDocument>[]): Promise<{
    imported: number;
    errors: number;
    details: Array<{
      userId: string;
      success: boolean;
      error?: string;
    }>;
  }> {
    const result = {
      imported: 0,
      errors: 0,
      details: [] as Array<{
        userId: string;
        success: boolean;
        error?: string;
      }>
    };

    for (const pref of preferences) {
      if (!pref.userId) {
        result.errors++;
        result.details.push({
          userId: 'unknown',
          success: false,
          error: 'Missing userId'
        });
        continue;
      }

      try {
        await notificationDb.updateEmailPreferences(pref.userId, pref);
        result.imported++;
        result.details.push({
          userId: pref.userId,
          success: true
        });
      } catch (error) {
        result.errors++;
        result.details.push({
          userId: pref.userId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return result;
  }
}

// Export singleton instance
export const preferenceManager = new PreferenceManager();
export default PreferenceManager;