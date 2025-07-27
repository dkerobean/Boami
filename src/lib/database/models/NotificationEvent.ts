import mongoose, { Document, Schema, Model } from 'mongoose';

export type NotificationType =
  | 'stock_alert'
  | 'task_assigned'
  | 'task_deadline'
  | 'task_completed'
  | 'invoice_status_changed'
  | 'invoice_overdue'
  | 'payment_received'
  | 'subscription_renewal'
  | 'subscription_payment_failed'
  | 'subscription_cancelled'
  | 'financial_alert'
  | 'system_maintenance'
  | 'security_alert'
  | 'feature_announcement';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical';

export interface INotificationEvent {
  type: NotificationType;
  userId: string;
  data: any;
  priority: NotificationPriority;
  scheduledFor?: Date;
  processed: boolean;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface INotificationEventDocument extends INotificationEvent, Document {}

export interface INotificationEventModel extends Model<INotificationEventDocument> {
  findPendingEvents(): Promise<INotificationEventDocument[]>;
  findByType(type: NotificationType): Promise<INotificationEventDocument[]>;
  findByUser(userId: string): Promise<INotificationEventDocument[]>;
}

const notificationEventSchema = new Schema<INotificationEventDocument, INotificationEventModel>({
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
    ]
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  data: {
    type: Schema.Types.Mixed,
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  scheduledFor: {
    type: Date,
    default: Date.now
  },
  processed: {
    type: Boolean,
    default: false,
    index: true
  },
  processedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for performance
notificationEventSchema.index({ type: 1, processed: 1 });
notificationEventSchema.index({ userId: 1, processed: 1 });
notificationEventSchema.index({ scheduledFor: 1, processed: 1 });
notificationEventSchema.index({ priority: 1, processed: 1 });

// Static methods
notificationEventSchema.statics.findPendingEvents = function() {
  return this.find({
    processed: false,
    scheduledFor: { $lte: new Date() }
  }).sort({ priority: -1, createdAt: 1 });
};

notificationEventSchema.statics.findByType = function(type: NotificationType) {
  return this.find({ type }).sort({ createdAt: -1 });
};

notificationEventSchema.statics.findByUser = function(userId: string) {
  return this.find({ userId }).sort({ createdAt: -1 });
};

const NotificationEvent = (mongoose.models.NotificationEvent ||
  mongoose.model<INotificationEventDocument, INotificationEventModel>('NotificationEvent', notificationEventSchema)) as INotificationEventModel;

export default NotificationEvent;