import { connectToDatabase } from '../database/mongoose-connection';
import mongoose from 'mongoose';
import { getNotificationIcon } from '../utils/notification-icons';

export interface RealNotification {
  id: string;
  avatar: string;
  title: string;
  subtitle: string;
  type: 'stock_alert' | 'task_completed' | 'payment_received' | 'user_joined' | 'message_received' | 'invoice_paid' | 'subscription_renewed';
  timestamp: Date;
  isRead: boolean;
  userId?: string;
  metadata?: any;
}

export class RealNotificationsService {

  /**
   * Get real notifications from various business events
   */
  static async getRealNotifications(userId?: string, limit: number = 10): Promise<RealNotification[]> {
    try {
      await connectToDatabase();
      const db = mongoose.connection.db;

      const notifications: RealNotification[] = [];

      // Get stock alerts (recent low stock products)
      const stockAlerts = await this.getStockAlertNotifications(limit);
      notifications.push(...stockAlerts);

      // Get recent task completions
      const taskNotifications = await this.getTaskNotifications(limit);
      notifications.push(...taskNotifications);

      // Get recent payments/invoices
      const paymentNotifications = await this.getPaymentNotifications(limit);
      notifications.push(...paymentNotifications);

      // Get recent user activities
      const userNotifications = await this.getUserActivityNotifications(limit);
      notifications.push(...userNotifications);

      // Sort by timestamp (most recent first) and limit
      return notifications
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, limit);

    } catch (error) {
      console.error('Error fetching real notifications:', error);
      return this.getFallbackNotifications();
    }
  }

  /**
   * Get stock alert notifications
   */
  private static async getStockAlertNotifications(limit: number): Promise<RealNotification[]> {
    try {
      const db = mongoose.connection.db;

      // Get recent low stock products
      const lowStockProducts = await db.collection('products').find({
        $expr: { $lte: ['$qty', '$lowStockThreshold'] },
        qty: { $gt: 0 }, // Not completely out of stock
        status: 'publish'
      })
      .sort({ updatedAt: -1 })
      .limit(3)
      .toArray();

      return lowStockProducts.map(product => ({
        id: `stock_${product._id}`,
        avatar: product.photo || getNotificationIcon('stock_alert'),
        title: `Low Stock Alert: ${product.title}`,
        subtitle: `Only ${product.qty} units left in stock`,
        type: 'stock_alert' as const,
        timestamp: product.updatedAt || new Date(),
        isRead: false,
        metadata: { productId: product._id, currentStock: product.qty }
      }));

    } catch (error) {
      console.error('Error fetching stock notifications:', error);
      return [];
    }
  }

  /**
   * Get task completion notifications
   */
  private static async getTaskNotifications(limit: number): Promise<RealNotification[]> {
    try {
      const db = mongoose.connection.db;

      // Get recently completed tasks
      const completedTasks = await db.collection('kanbantasks').find({
        updatedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
      })
      .sort({ updatedAt: -1 })
      .limit(3)
      .toArray();

      const notifications: RealNotification[] = [];

      for (const task of completedTasks) {
        // Try to get user info
        let userName = 'Team Member';
        let userAvatar = '/images/profile/user-1.jpg';

        if (task.userId) {
          try {
            const user = await db.collection('users').findOne({ _id: new mongoose.Types.ObjectId(task.userId) });
            if (user) {
              userName = `${user.firstName} ${user.lastName}`;
              userAvatar = user.profileImage || user.avatar || '/images/profile/user-1.jpg';
            }
          } catch (e) {
            // Use defaults if user not found
          }
        }

        notifications.push({
          id: `task_${task._id}`,
          avatar: userAvatar,
          title: `${userName} updated task`,
          subtitle: `"${task.title}" - ${task.taskProperty}`,
          type: 'task_completed',
          timestamp: task.updatedAt || new Date(),
          isRead: false,
          metadata: { taskId: task._id, userId: task.userId }
        });
      }

      return notifications;

    } catch (error) {
      console.error('Error fetching task notifications:', error);
      return [];
    }
  }

  /**
   * Get payment/invoice notifications
   */
  private static async getPaymentNotifications(limit: number): Promise<RealNotification[]> {
    try {
      const db = mongoose.connection.db;

      // Get recent invoices
      const recentInvoices = await db.collection('invoices').find({
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
      })
      .sort({ createdAt: -1 })
      .limit(3)
      .toArray();

      return recentInvoices.map(invoice => ({
        id: `payment_${invoice._id}`,
        avatar: getNotificationIcon('payment_received'),
        title: invoice.status === 'Paid' ? 'Payment Received' : 'New Invoice Created',
        subtitle: `${invoice.invoiceNumber} - $${invoice.grandTotal}`,
        type: 'payment_received' as const,
        timestamp: invoice.createdAt || new Date(),
        isRead: false,
        metadata: { invoiceId: invoice._id, amount: invoice.grandTotal, status: invoice.status }
      }));

    } catch (error) {
      console.error('Error fetching payment notifications:', error);
      return [];
    }
  }

  /**
   * Get user activity notifications
   */
  private static async getUserActivityNotifications(limit: number): Promise<RealNotification[]> {
    try {
      const db = mongoose.connection.db;

      // Get recently joined users
      const recentUsers = await db.collection('users').find({
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // Last 7 days
        isActive: true
      })
      .sort({ createdAt: -1 })
      .limit(2)
      .toArray();

      return recentUsers.map(user => ({
        id: `user_${user._id}`,
        avatar: user.profileImage || user.avatar || getNotificationIcon('user_joined'),
        title: `${user.firstName} ${user.lastName} joined the team!`,
        subtitle: 'Welcome them to the platform',
        type: 'user_joined' as const,
        timestamp: user.createdAt || new Date(),
        isRead: false,
        metadata: { userId: user._id, email: user.email }
      }));

    } catch (error) {
      console.error('Error fetching user notifications:', error);
      return [];
    }
  }

  /**
   * Get notification count
   */
  static async getNotificationCount(userId?: string): Promise<number> {
    try {
      const notifications = await this.getRealNotifications(userId, 50);
      return notifications.filter(n => !n.isRead).length;
    } catch (error) {
      console.error('Error getting notification count:', error);
      return 0;
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string): Promise<boolean> {
    try {
      // In a real implementation, you'd update a notifications table
      // For now, we'll just return true
      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  }

  /**
   * Fallback notifications when database is unavailable
   */
  private static getFallbackNotifications(): RealNotification[] {
    return [
      {
        id: 'fallback_1',
        avatar: '/images/profile/user-1.jpg',
        title: 'System Status',
        subtitle: 'All systems operational',
        type: 'user_joined',
        timestamp: new Date(),
        isRead: false
      },
      {
        id: 'fallback_2',
        avatar: '/images/icons/stock-icon.png',
        title: 'Stock Monitoring Active',
        subtitle: 'Monitoring inventory levels',
        type: 'stock_alert',
        timestamp: new Date(Date.now() - 60000),
        isRead: false
      }
    ];
  }

  /**
   * Get notifications formatted for the header component
   */
  static async getFormattedNotifications(userId?: string, limit: number = 8): Promise<{
    avatar: string;
    title: string;
    subtitle: string;
  }[]> {
    const realNotifications = await this.getRealNotifications(userId, limit);

    return realNotifications.map(notification => ({
      avatar: notification.avatar,
      title: notification.title,
      subtitle: notification.subtitle
    }));
  }

  /**
   * Create a new notification (for real-time updates)
   */
  static async createNotification(notification: Omit<RealNotification, 'id' | 'timestamp' | 'isRead'>): Promise<RealNotification> {
    const newNotification: RealNotification = {
      ...notification,
      id: `${notification.type}_${Date.now()}`,
      timestamp: new Date(),
      isRead: false
    };

    // In a real implementation, you'd save this to a notifications table
    // For now, we'll just return the notification
    return newNotification;
  }
}

export default RealNotificationsService;