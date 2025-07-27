import { notificationDb } from './database-operations';
import { NotificationType } from '../database/models/NotificationEvent';
import { NotificationLogStatus } from '../database/models/NotificationLog';

export interface AnalyticsTimeRange {
  startDate?: Date;
  endDate?: Date;
}

export interface DeliveryAnalytics {
  totalSent: number;
  totalFailed: number;
  totalBounced: number;
  deliveryRate: number;
  bounceRate: number;
  failureRate: number;
  byType: {
    [key in NotificationType]?: {
      sent: number;
      failed: number;
      bounced: number;
      deliveryRate: number;
    };
  };
}

export interface EngagementAnalytics {
  totalSent: number;
  totalOpened: number;
  totalClicked: number;
  openRate: number;
  clickRate: number;
  clickThroughRate: number;
  byType: {
    [key in NotificationType]?: {
      sent: number;
      opened: number;
      clicked: number;
      openRate: number;
      clickRate: number;
    };
  };
}

export interface QueueAnalytics {
  pending: number;
  processing: number;
  sent: number;
  failed: number;
  total: number;
  averageProcessingTime: number;
  throughputPerHour: number;
}

export interface UserEngagementAnalytics {
  userId: string;
  totalReceived: number;
  totalOpened: number;
  totalClicked: number;
  openRate: number;
  clickRate: number;
  lastEngagement?: Date;
  preferredTypes: NotificationType[];
}

export class NotificationAnalytics {

  /**
   * Get delivery analytics
   */
  async getDeliveryAnalytics(timeRange?: AnalyticsTimeRange): Promise<DeliveryAnalytics> {
    try {
      const stats = await notificationDb.getDeliveryStats(timeRange?.startDate, timeRange?.endDate);

      if (!stats || stats.length === 0) {
        return this.getEmptyDeliveryAnalytics();
      }

      const result = stats[0];
      const statusCounts = result.stats.reduce((acc: any, stat: any) => {
        acc[stat.status] = stat.count;
        return acc;
      }, {});

      const totalSent = statusCounts.sent ||onst totalFailed = statusCounts.failed || 0;
      const totalBounced = statusCounts.bounced || 0;
      const total = result.total || 0;

      return {
        totalSent,
        totalFailed,
        totalBounced,
        deliveryRate: total > 0 ? (totalSent / total) * 100 : 0,
        bounceRate: total > 0 ? (totalBounced / total) * 100 : 0,
        failureRate: total > 0 ? (totalFailed / total) * 100 : 0,
        byType: await this.getDeliveryByType(timeRange)
      };
    } catch (error) {
      console.error('Failed to get delivery analytics:', error);
      return this.getEmptyDeliveryAnalytics();
    }
  }

  /**
   * Get engagement analytics
   */
  async getEngagementAnalytics(timeRange?: AnalyticsTimeRange): Promise<EngagementAnalytics> {
    try {
      const stats = await notificationDb.getEngagementStats(timeRange?.startDate, timeRange?.endDate);

      if (!stats || stats.length === 0) {
        return this.getEmptyEngagementAnalytics();
      }

      const totals = stats.reduce((acc: any, stat: any) => {
        acc.totalSent += stat.totalSent;
        acc.opened += stat.opened;
        acc.clicked += stat.clicked;
        return acc;
      }, { totalSent: 0, opened: 0, clicked: 0 });

      const byType: any = {};
      stats.forEach((stat: any) => {
        byType[stat.type] = {
          sent: stat.totalSent,
          opened: stat.opened,
          clicked: stat.clicked,
          openRate: stat.openRate,
          clickRate: stat.clickRate
        };
      });

      return {
        totalSent: totals.totalSent,
        totalOpened: totals.opened,
        totalClicked: totals.clicked,
        openRate: totals.totalSent > 0 ? (totals.opened / totals.totalSent) * 100 : 0,
        clickRate: totals.totalSent > 0 ? (totals.clicked / totals.totalSent) * 100 : 0,
        clickThroughRate: totals.opened > 0 ? (totals.clicked / totals.opened) * 100 : 0,
        byType
      };
    } catch (error) {
      console.error('Failed to get engagement analytics:', error);
      return this.getEmptyEngagementAnalytics();
    }
  }

  /**
   * Get queue analytics
   */
  async getQueueAnalytics(): Promise<QueueAnalytics> {
    try {
      const queueStats = await notificationDb.getQueueStats();

      // Calculate average processing time (simplified)
      const recentNotifications = await notificationDb.getNotificationsByStatus('sent', 100);
      let totalProcessingTime = 0;
      let processedCount = 0;

      recentNotifications.forEach(notification => {
        if (notification.processedAt && notification.createdAt) {
          totalProcessingTime += notification.processedAt.getTime() - notification.createdAt.getTime();
          processedCount++;
        }
      });

      const averageProcessingTime = processedCount > 0 ? totalProcessingTime / processedCount : 0;

      // Calculate throughput (notifications sent in last hour)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentSent = recentNotifications.filter(n =>
        n.sentAt && n.sentAt >= oneHourAgo
      ).length;

      return {
        ...queueStats,
        averageProcessingTime: Math.round(averageProcessingTime / 1000), // Convert to seconds
        throughputPerHour: recentSent
      };
    } catch (error) {
      console.error('Failed to get queue analytics:', error);
      return {
        pending: 0,
        processing: 0,
        sent: 0,
        failed: 0,
        total: 0,
        averageProcessingTime: 0,
        throughputPerHour: 0
      };
    }
  }

  /**
   * Get user engagement analytics
   */
  async getUserEngagementAnalytics(userId: string, timeRange?: AnalyticsTimeRange): Promise<UserEngagementAnalytics> {
    try {
      const userLogs = await notificationDb.getNotificationLogsByUser(userId, 1000);

      let filteredLogs = userLogs;
      if (timeRange?.startDate || timeRange?.endDate) {
        filteredLogs = userLogs.filter(log => {
          const logDate = log.sentAt;
          if (timeRange.startDate && logDate < timeRange.startDate) return false;
          if (timeRange.endDate && logDate > timeRange.endDate) return false;
          return true;
        });
      }

      const totalReceived = filteredLogs.length;
      const totalOpened = filteredLogs.filter(log => log.openedAt).length;
      const totalClicked = filteredLogs.filter(log => log.clickedAt).length;

      // Find preferred notification types
      const typeCounts: { [key: string]: number } = {};
      filteredLogs.forEach(log => {
        typeCounts[log.type] = (typeCounts[log.type] || 0) + 1;
      });

      const preferredTypes = Object.entries(typeCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([type]) => type as NotificationType);

      // Find last engagement
      const lastEngagement = filteredLogs
        .filter(log => log.openedAt || log.clickedAt)
        .sort((a, b) => {
          const aDate = a.clickedAt || a.openedAt || a.sentAt;
          const bDate = b.clickedAt || b.openedAt || b.sentAt;
          return bDate.getTime() - aDate.getTime();
        })[0]?.sentAt;

      return {
        userId,
        totalReceived,
        totalOpened,
        totalClicked,
        openRate: totalReceived > 0 ? (totalOpened / totalReceived) * 100 : 0,
        clickRate: totalReceived > 0 ? (totalClicked / totalReceived) * 100 : 0,
        lastEngagement,
        preferredTypes
      };
    } catch (error) {
      console.error('Failed to get user engagement analytics:', error);
      return {
        userId,
        totalReceived: 0,
        totalOpened: 0,
        totalClicked: 0,
        openRate: 0,
        clickRate: 0,
        preferredTypes: []
      };
    }
  }

  /**
   * Get top performing notification types
   */
  async getTopPerformingTypes(timeRange?: AnalyticsTimeRange, limit: number = 5): Promise<Array<{
    type: NotificationType;
    sent: number;
    opened: number;
    clicked: number;
    openRate: number;
    clickRate: number;
    score: number;
  }>> {
    try {
      const engagementStats = await this.getEngagementAnalytics(timeRange);

      const typePerformance = Object.entries(engagementStats.byType)
        .map(([type, stats]) => ({
          type: type as NotificationType,
          sent: stats.sent,
          opened: stats.opened,
          clicked: stats.clicked,
          openRate: stats.openRate,
          clickRate: stats.clickRate,
          score: (stats.openRate * 0.6) + (stats.clickRate * 0.4) // Weighted score
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      return typePerformance;
    } catch (error) {
      console.error('Failed to get top performing types:', error);
      return [];
    }
  }

  /**
   * Get notification trends over time
   */
  async getNotificationTrends(days: number = 30): Promise<Array<{
    date: string;
    sent: number;
    opened: number;
    clicked: number;
    failed: number;
  }>> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // This would need to be implemented with proper aggregation
      // For now, return empty array
      return [];
    } catch (error) {
      console.error('Failed to get notification trends:', error);
      return [];
    }
  }

  /**
   * Generate analytics report
   */
  async generateAnalyticsReport(timeRange?: AnalyticsTimeRange): Promise<{
    summary: {
      totalNotifications: number;
      deliveryRate: number;
      openRate: number;
      clickRate: number;
    };
    delivery: DeliveryAnalytics;
    engagement: EngagementAnalytics;
    queue: QueueAnalytics;
    topTypes: Array<{
      type: NotificationType;
      sent: number;
      openRate: number;
      clickRate: number;
    }>;
  }> {
    try {
      const [delivery, engagement, queue, topTypes] = await Promise.all([
        this.getDeliveryAnalytics(timeRange),
        this.getEngagementAnalytics(timeRange),
        this.getQueueAnalytics(),
        this.getTopPerformingTypes(timeRange)
      ]);

      return {
        summary: {
          totalNotifications: delivery.totalSent,
          deliveryRate: delivery.deliveryRate,
          openRate: engagement.openRate,
          clickRate: engagement.clickRate
        },
        delivery,
        engagement,
        queue,
        topTypes: topTypes.slice(0, 5)
      };
    } catch (error) {
      console.error('Failed to generate analytics report:', error);
      throw error;
    }
  }

  /**
   * Get delivery analytics by type
   */
  private async getDeliveryByType(timeRange?: AnalyticsTimeRange): Promise<DeliveryAnalytics['byType']> {
    // This would need proper aggregation implementation
    // For now, return empty object
    return {};
  }

  /**
   * Get empty delivery analytics
   */
  private getEmptyDeliveryAnalytics(): DeliveryAnalytics {
    return {
      totalSent: 0,
      totalFailed: 0,
      totalBounced: 0,
      deliveryRate: 0,
      bounceRate: 0,
      failureRate: 0,
      byType: {}
    };
  }

  /**
   * Get empty engagement analytics
   */
  private getEmptyEngagementAnalytics(): EngagementAnalytics {
    return {
      totalSent: 0,
      totalOpened: 0,
      totalClicked: 0,
      openRate: 0,
      clickRate: 0,
      clickThroughRate: 0,
      byType: {}
    };
  }
}

// Export singleton instance
export const notificationAnalytics = new NotificationAnalytics();
export default NotificationAnalytics;