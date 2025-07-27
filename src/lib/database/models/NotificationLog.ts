import mongoose, { Document, Schema, Model } from 'mongoose';
import { NotificationType } from './NotificationEvent';

export type NotificationLogStatus = 'sent' | 'failed' | 'bounced' | 'opened' | 'clicked';

export interface INotificationLog {
  userId: string;
  notificationId: string;
  type: NotificationType;
  status: NotificationLogStatus;
  email: string;
  subject: string;
  sentAt: Date;
  openedAt?: Date;
  clickedAt?: Date;
  errorMessage?: string;
  resendId?: string;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface INotificationLogDocument extends INotificationLog, Document {}

export interface INotificationLogModel extends Model<INotificationLogDocument> {
  findByUser(userId: string): Promise<INotificationLogDocument[]>;
  findByType(type: NotificationType): Promise<INotificationLogDocument[]>;
  findByStatus(status: NotificationLogStatus): Promise<INotificationLogDocument[]>;
  getDeliveryStats(startDate?: Date, endDate?: Date): Promise<any>;
  getEngagementStats(startDate?: Date, endDate?: Date): Promise<any>;
}

const notificationLogSchema = new Schema<INotificationLogDocument, INotificationLogModel>({
  userId: {
    type: String,
    required: true,
    index: true
  },
  notificationId: {
    type: String,
    required: true,
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: [
      'stock_alert',
      'task_assigned',
      'task_deadline',
      'task_completed',
      'invoice_status_changed',
      'invoice_overdue',
      'payment_received',
      'subscription_renewal',
      'subscription_payment_failed',
      'subscription_cancelled',
      'financial_alert',
      'system_maintenance',
      'security_alert',
      'feature_announcement'
    ],
    index: true
  },
  status: {
    type: String,
    enum: ['sent', 'failed', 'bounced', 'opened', 'clicked'],
    required: true,
    index: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  subject: {
    type: String,
    required: true
  },
  sentAt: {
    type: Date,
    required: true,
    index: true
  },
  openedAt: {
    type: Date,
    default: null
  },
  clickedAt: {
    type: Date,
    default: null
  },
  errorMessage: {
    type: String,
    default: null
  },
  resendId: {
    type: String,
    default: null
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for performance and analytics
notificationLogSchema.index({ userId: 1, sentAt: -1 });
notificationLogSchema.index({ type: 1, sentAt: -1 });
notificationLogSchema.index({ status: 1, sentAt: -1 });
notificationLogSchema.index({ sentAt: -1 });

// Static methods
notificationLogSchema.statics.findByUser = function(userId: string) {
  return this.find({ userId }).sort({ sentAt: -1 });
};

notificationLogSchema.statics.findByType = function(type: NotificationType) {
  return this.find({ type }).sort({ sentAt: -1 });
};

notificationLogSchema.statics.findByStatus = function(status: NotificationLogStatus) {
  return this.find({ status }).sort({ sentAt: -1 });
};

notificationLogSchema.statics.getDeliveryStats = function(startDate?: Date, endDate?: Date) {
  const matchStage: any = {};
  if (startDate || endDate) {
    matchStage.sentAt = {};
    if (startDate) matchStage.sentAt.$gte = startDate;
    if (endDate) matchStage.sentAt.$lte = endDate;
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$count' },
        stats: {
          $push: {
            status: '$_id',
            count: '$count'
          }
        }
      }
    }
  ]);
};

notificationLogSchema.statics.getEngagementStats = function(startDate?: Date, endDate?: Date) {
  const matchStage: any = {};
  if (startDate || endDate) {
    matchStage.sentAt = {};
    if (startDate) matchStage.sentAt.$gte = startDate;
    if (endDate) matchStage.sentAt.$lte = endDate;
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$type',
        totalSent: { $sum: 1 },
        opened: {
          $sum: {
            $cond: [{ $ne: ['$openedAt', null] }, 1, 0]
          }
        },
        clicked: {
          $sum: {
            $cond: [{ $ne: ['$clickedAt', null] }, 1, 0]
          }
        }
      }
    },
    {
      $project: {
        type: '$_id',
        totalSent: 1,
        opened: 1,
        clicked: 1,
        openRate: {
          $cond: [
            { $gt: ['$totalSent', 0] },
            { $multiply: [{ $divide: ['$opened', '$totalSent'] }, 100] },
            0
          ]
        },
        clickRate: {
          $cond: [
            { $gt: ['$totalSent', 0] },
            { $multiply: [{ $divide: ['$clicked', '$totalSent'] }, 100] },
            0
          ]
        }
      }
    }
  ]);
};

const NotificationLog = (mongoose.models.NotificationLog ||
  mongoose.model<INotificationLogDocument, INotificationLogModel>('NotificationLog', notificationLogSchema)) as INotificationLogModel;

export default NotificationLog;