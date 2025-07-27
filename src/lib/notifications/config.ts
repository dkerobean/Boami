import { NotificationType, NotificationPriority } from '../database/models/NotificationEvent';

export interface NotificationConfig {
  type: NotificationType;
  priority: NotificationPriority;
  templateId: string;
  batchable: boolean;
  maxRetries: number;
  retryDelay: number; // in milliseconds
  requiresUserPreference: boolean;
  preferenceKey: keyof import('../database/models/EmailPreferences').IEmailPreferences;
}

export const NOTIFICATION_CONFIGS: Record<NotificationType, NotificationConfig> = {
  stock_alert: {
    type: 'stock_alert',
    priority: 'high',
    templateId: 'stock-alert',
    batchable: true,
    maxRetries: 3,
    retryDelay: 5 * 60 * 1000, // 5 minutes
    requiresUserPreference: true,
    preferenceKey: 'stockAlerts'
  },
  task_assigned: {
    type: 'task_assigned',
    priority: 'medium',
    templateId: 'task-assigned',
    batchable: false,
    maxRetries: 3,
    retryDelay: 2 * 60 * 1000, // 2 minutes
    requiresUserPreference: true,
    preferenceKey: 'taskNotifications'
  },
  task_deadline: {
    type: 'task_deadline',
    priority: 'high',
    templateId: 'task-deadline',
    batchable: false,
    maxRetries: 3,
    retryDelay: 5 * 60 * 1000, // 5 minutes
    requiresUserPreference: true,
    preferenceKey: 'taskNotifications'
  },
  task_completed: {
    type: 'task_completed',
    priority: 'low',
    templateId: 'task-completed',
    batchable: true,
    maxRetries: 2,
    retryDelay: 10 * 60 * 1000, // 10 minutes
    requiresUserPreference: true,
    preferenceKey: 'taskNotifications'
  },
  invoice_status_changed: {
    type: 'invoice_status_changed',
    priority: 'medium',
    templateId: 'invoice-status-changed',
    batchable: false,
    maxRetries: 3,
    retryDelay: 3 * 60 * 1000, // 3 minutes
    requiresUserPreference: true,
    preferenceKey: 'invoiceUpdates'
  },
  invoice_overdue: {
    type: 'invoice_overdue',
    priority: 'high',
    templateId: 'invoice-overdue',
    batchable: false,
    maxRetries: 5,
    retryDelay: 2 * 60 * 1000, // 2 minutes
    requiresUserPreference: true,
    preferenceKey: 'invoiceUpdates'
  },
  payment_received: {
    type: 'payment_received',
    priority: 'medium',
    templateId: 'payment-received',
    batchable: false,
    maxRetries: 3,
    retryDelay: 2 * 60 * 1000, // 2 minutes
    requiresUserPreference: true,
    preferenceKey: 'invoiceUpdates'
  },
  subscription_renewal: {
    type: 'subscription_renewal',
    priority: 'high',
    templateId: 'subscription-renewal',
    batchable: false,
    maxRetries: 5,
    retryDelay: 1 * 60 * 1000, // 1 minute
    requiresUserPreference: true,
    preferenceKey: 'subscriptionNotifications'
  },
  subscription_payment_failed: {
    type: 'subscription_payment_failed',
    priority: 'critical',
    templateId: 'subscription-payment-failed',
    batchable: false,
    maxRetries: 5,
    retryDelay: 30 * 1000, // 30 seconds
    requiresUserPreference: true,
    preferenceKey: 'subscriptionNotifications'
  },
  subscription_cancelled: {
    type: 'subscription_cancelled',
    priority: 'medium',
    templateId: 'subscription-cancelled',
    batchable: false,
    maxRetries: 3,
    retryDelay: 2 * 60 * 1000, // 2 minutes
    requiresUserPreference: true,
    preferenceKey: 'subscriptionNotifications'
  },
  financial_alert: {
    type: 'financial_alert',
    priority: 'high',
    templateId: 'financial-alert',
    batchable: false,
    maxRetries: 3,
    retryDelay: 1 * 60 * 1000, // 1 minute
    requiresUserPreference: true,
    preferenceKey: 'financialAlerts'
  },
  system_maintenance: {
    type: 'system_maintenance',
    priority: 'medium',
    templateId: 'system-maintenance',
    batchable: true,
    maxRetries: 3,
    retryDelay: 5 * 60 * 1000, // 5 minutes
    requiresUserPreference: true,
    preferenceKey: 'systemNotifications'
  },
  security_alert: {
    type: 'security_alert',
    priority: 'critical',
    templateId: 'security-alert',
    batchable: false,
    maxRetries: 5,
    retryDelay: 30 * 1000, // 30 seconds
    requiresUserPreference: true,
    preferenceKey: 'securityAlerts'
  },
  feature_announcement: {
    type: 'feature_announcement',
    priority: 'low',
    templateId: 'feature-announcement',
    batchable: true,
    maxRetries: 2,
    retryDelay: 30 * 60 * 1000, // 30 minutes
    requiresUserPreference: true,
    preferenceKey: 'marketingEmails'
  }
};

export const EMAIL_CONFIG = {
  FROM_EMAIL: process.env.FROM_EMAIL || 'noreply@boami.com',
  FROM_NAME: process.env.FROM_NAME || 'Boami',
  REPLY_TO: process.env.REPLY_TO_EMAIL || 'support@boami.com',
  BATCH_SIZE: parseInt(process.env.EMAIL_BATCH_SIZE || '50'),
  RATE_LIMIT: parseInt(process.env.EMAIL_RATE_LIMIT || '100'), // emails per minute
  QUEUE_PROCESSING_INTERVAL: parseInt(process.env.QUEUE_PROCESSING_INTERVAL || '30000'), // 30 seconds
  MAX_QUEUE_SIZE: parseInt(process.env.MAX_QUEUE_SIZE || '10000'),
  ENABLE_TRACKING: process.env.ENABLE_EMAIL_TRACKING === 'true',
  BASE_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
};

export const PRIORITY_WEIGHTS: Record<NotificationPriority, number> = {
  critical: 10,
  high: 7,
  medium: 5,
  low: 2
};