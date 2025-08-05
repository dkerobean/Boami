import mongoose, { Document, Schema, Model } from 'mongoose';
import { NotificationType } from './NotificationEvent';

export interface IEmailTemplate {
  name: string;
  type: NotificationType;
  subject: string;
  htmlTemplate: string;
  textTemplate: string;
  variables: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IEmailTemplateDocument extends IEmailTemplate, Document {}

export interface IEmailTemplateModel extends Model<IEmailTemplateDocument> {
  findByType(type: NotificationType): Promise<IEmailTemplateDocument | null>;
  findActiveTemplates(): Promise<IEmailTemplateDocument[]>;
  findByName(name: string): Promise<IEmailTemplateDocument | null>;
}

const emailTemplateSchema = new Schema<IEmailTemplateDocument, IEmailTemplateModel>({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
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
    ]
  },
  subject: {
    type: String,
    required: true
  },
  htmlTemplate: {
    type: String,
    required: true
  },
  textTemplate: {
    type: String,
    required: true
  },
  variables: [{
    type: String
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for performance
emailTemplateSchema.index({ type: 1, isActive: 1 });
emailTemplateSchema.index({ name: 1 });

// Static methods
emailTemplateSchema.statics.findByType = function(type: NotificationType) {
  return this.findOne({ type, isActive: true });
};

emailTemplateSchema.statics.findActiveTemplates = function() {
  return this.find({ isActive: true }).sort({ name: 1 });
};

emailTemplateSchema.statics.findByName = function(name: string) {
  return this.findOne({ name, isActive: true });
};

const EmailTemplate = (mongoose.models.EmailTemplate ||
  mongoose.model<IEmailTemplateDocument, IEmailTemplateModel>('EmailTemplate', emailTemplateSchema)) as IEmailTemplateModel;

export default EmailTemplate;