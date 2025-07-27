import mongoose, { Document, Schema, Model } from 'mongoose';
import { NotificationType } from './NotificationEvent';

export type NotificationStatus = 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled';

export interface IQueuedNotification {
  eventId: string;
  userId: string;
  email: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  templateId: string;
  priority: number;
  attempts: number;
  maxAttempts: number;
  scheduledFor: Date;
  status: NotificationStatus;
  processedAt?: Date;
  sentAt?: Date;
  errorMessage?: string;
  resendId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IQueuedNotificationDocument extends IQueuedNotification, Document {}

export interface IQueuedNotificationModel extends Model<IQueuedNotificationDocument> {
  findPendingNotifications(): Promise<IQueuedNotificationDocument[]>;
  findByStatus(status: NotificationStatus): Promise<IQueuedNotificationDocument[]>;
  findFailedNotifications(): Promise<IQueuedNotificationDocument[]>;
  findByUser(userId: string): Promise<IQueuedNotificationDocument[]>;
}

const queuedNotificationSchema = new Schema<IQueuedNotificationDocument, IQueuedNotificationModel>({
  eventId: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: String,
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
  htmlContent: {
    type: String,
    required: true
  },
  textContent: {
    type: String,
    required: true
  },
  templateId: {
    type: String,
    required: true
  },
  priority: {
    type: Number,
    default: 5,
    min: 1,
    max: 10
  },
  attempts: {
    type: Number,
    default: 0
  },
  maxAttempts: {
    type: Number,
    default: 3
  },
  scheduledFor: {
    type: Date,
    default: Date.now,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'sent', 'failed', 'cancelled'],
    default: 'pending',
    index: true
  },
  processedAt: {
    type: Date,
    default: null
  },
  sentAt: {
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
  }
}, {
  timestamps: true
});

// Indexes for performance
queuedNotificationSchema.index({ status: 1, scheduledFor: 1 });
queuedNotificationSchema.index({ priority: -1, createdAt: 1 });
queuedNotificationSchema.index({ userId: 1, status: 1 });
queuedNotificationSchema.index({ attempts: 1, maxAttempts: 1 });

// Static methods
queuedNotificationSchema.statics.findPendingNotifications = function() {
  return this.find({
    status: 'pending',
    scheduledFor: { $lte: new Date() },
    attempts: { $lt: this.maxAttempts }
  }).sort({ priority: -1, createdAt: 1 });
};

queuedNotificationSchema.statics.findByStatus = function(status: NotificationStatus) {
  return this.find({ status }).sort({ createdAt: -1 });
};

queuedNotificationSchema.statics.findFailedNotifications = function() {
  return this.find({
    status: 'failed',
    attempts: { $gte: this.maxAttempts }
  }).sort({ createdAt: -1 });
};

queuedNotificationSchema.statics.findByUser = function(userId: string) {
  return this.find({ userId }).sort({ createdAt: -1 });
};

const QueuedNotification = (mongoose.models.QueuedNotification ||
  mongoose.model<IQueuedNotificationDocument, IQueuedNotificationModel>('QueuedNotification', queuedNotificationSchema)) as IQueuedNotificationModel;

export default QueuedNotification;