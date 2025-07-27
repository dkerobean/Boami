import mongoose, { Document, Schema, Model } from 'mongoose';

export type DigestFrequency = 'immediate' | 'daily' | 'weekly' | 'never';

export interface IEmailPreferences {
  userId: string;
  stockAlerts: boolean;
  taskNotifications: boolean;
  invoiceUpdates: boolean;
  subscriptionNotifications: boolean;
  financialAlerts: boolean;
  systemNotifications: boolean;
  marketingEmails: boolean;
  securityAlerts: boolean;
  digestFrequency: DigestFrequency;
  unsubscribeToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IEmailPreferencesDocument extends IEmailPreferences, Document {}

export interface IEmailPreferencesModel extends Model<IEmailPreferencesDocument> {
  findByUser(userId: string): Promise<IEmailPreferencesDocument | null>;
  getDefaultPreferences(): Partial<IEmailPreferences>;
  createDefaultForUser(userId: string): Promise<IEmailPreferencesDocument>;
}

const emailPreferencesSchema = new Schema<IEmailPreferencesDocument, IEmailPreferencesModel>({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  stockAlerts: {
    type: Boolean,
    default: true
  },
  taskNotifications: {
    type: Boolean,
    default: true
  },
  invoiceUpdates: {
    type: Boolean,
    default: true
  },
  subscriptionNotifications: {
    type: Boolean,
    default: true
  },
  financialAlerts: {
    type: Boolean,
    default: true
  },
  systemNotifications: {
    type: Boolean,
    default: true
  },
  marketingEmails: {
    type: Boolean,
    default: false
  },
  securityAlerts: {
    type: Boolean,
    default: true // Always default to true for security
  },
  digestFrequency: {
    type: String,
    enum: ['immediate', 'daily', 'weekly', 'never'],
    default: 'immediate'
  },
  unsubscribeToken: {
    type: String,
    unique: true,
    sparse: true
  }
}, {
  timestamps: true
});

// Static methods
emailPreferencesSchema.statics.findByUser = function(userId: string) {
  return this.findOne({ userId });
};

emailPreferencesSchema.statics.getDefaultPreferences = function() {
  return {
    stockAlerts: true,
    taskNotifications: true,
    invoiceUpdates: true,
    subscriptionNotifications: true,
    financialAlerts: true,
    systemNotifications: true,
    marketingEmails: false,
    securityAlerts: true,
    digestFrequency: 'immediate' as DigestFrequency
  };
};

emailPreferencesSchema.statics.createDefaultForUser = function(userId: string) {
  const defaultPrefs = this.getDefaultPreferences();
  return this.create({
    userId,
    ...defaultPrefs,
    unsubscribeToken: require('crypto').randomBytes(32).toString('hex')
  });
};

const EmailPreferences = (mongoose.models.EmailPreferences ||
  mongoose.model<IEmailPreferencesDocument, IEmailPreferencesModel>('EmailPreferences', emailPreferencesSchema)) as IEmailPreferencesModel;

export default EmailPreferences;