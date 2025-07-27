/**
 * Main notification system orchestrator
 * Exports all notification system components and provides initialization
 */

// Core services
export { notificationService } from './notification-service';
export { templateEngine } from './template-engine';
export { resendService } from './resend-service';
export { preferenceManager } from './preference-manager';
export { notificationAnalytics } from './analytics';

// Database operations
export { notificationDb } from './database-operations';

// Monitors
export { stockAlertMonitor } from './monitors/stock-alert-monitor';
export { taskMonitor } from './monitors/task-monitor';
export { invoiceMonitor } from './monitors/invoice-monitor';
export { subscriptionMonitor } from './monitors/subscription-monitor';

// Configuration and templates
export { NOTIFICATION_CONFIGS, EMAIL_CONFIG, PRIORITY_WEIGHTS } from './config';
export { initializeDefaultTemplates, updateDefaultTemplates } from './default-templates';

// Types
export type { NotificationEventData, NotificationResult } from './notification-service';
export type { TemplateVariables, RenderedTemplate } from './template-engine';
export type { EmailData, BulkEmailData, EmailResult, BulkEmailResult } from './resend-service';
export type { PreferenceUpdate } from './preference-manager';
export type {
  DeliveryAnalytics,
  EngagementAnalytics,
  QueueAnalytics,
  UserEngagementAnalytics
} from './analytics';

import { notificationService } from './notification-service';
import { stockAlertMonitor } from './monitors/stock-alert-monitor';
import { taskMonitor } from './monitors/task-monitor';
import { invoiceMonitor } from './monitors/invoice-monitor';
import { subscriptionMonitor } from './monitors/subscription-monitor';
import { initializeDefaultTemplates } from './default-templates';
import { preferenceManager } from './preference-manager';

/**
 * Initialize the notification system
 */
export async function initializeNotificationSystem(): Promise<void> {
  try {
    console.log('Initializing notification system...');

    // Initialize default email templates
    await initializeDefaultTemplates();

    // Migrate existing users to have email preferences
    await preferenceManager.migrateExistingUsers();

    // Start monitoring services
    stockAlertMonitor.startMonitoring(60); // Check every hour
    taskMonitor.startDeadlineMonitoring(60); // Check every hour
    invoiceMonitor.startOverdueMonitoring(24); // Check daily
    subscriptionMonitor.startRenewalMonitoring(12); // Check twice daily

    console.log('Notification system initialized successfully');
  } catch (error) {
    console.error('Failed to initialize notification system:', error);
    throw error;
  }
}

/**
 * Shutdown the notification system gracefully
 */
export function shutdownNotificationSystem(): void {
  try {
    console.log('Shutting down notification system...');

    // Stop all monitoring services
    stockAlertMonitor.stopMonitoring();
    taskMonitor.stopDeadlineMonitoring();
    invoiceMonitor.stopOverdueMonitoring();
    subscriptionMonitor.stopRenewalMonitoring();

    // Stop queue processor
    notificationService.stopQueueProcessor();

    console.log('Notification system shut down successfully');
  } catch (error) {
    console.error('Error during notification system shutdown:', error);
  }
}

/**
 * Get notification system status
 */
export function getNotificationSystemStatus(): {
  stockMonitoring: boolean;
  taskMonitoring: boolean;
  invoiceMonitoring: boolean;
  subscriptionMonitoring: boolean;
  queueProcessor: boolean;
} {
  return {
    stockMonitoring: stockAlertMonitor.getMonitoringStatus().isMonitoring,
    taskMonitoring: taskMonitor.getMonitoringStatus().isMonitoring,
    invoiceMonitoring: invoiceMonitor.getMonitoringStatus().isMonitoring,
    subscriptionMonitoring: subscriptionMonitor.getMonitoringStatus().isMonitoring,
    queueProcessor: true // notificationService doesn't expose this status yet
  };
}

/**
 * Test the entire notification system
 */
export async function testNotificationSystem(userId: string): Promise<{
  success: boolean;
  results: Array<{
    type: string;
    success: boolean;
    error?: string;
  }>;
}> {
  const results: Array<{ type: string; success: boolean; error?: string }> = [];

  // Test each notification type
  const tests = [
    { type: 'stock_alert', monitor: stockAlertMonitor.testStockAlert(userId) },
    { type: 'task_assigned', monitor: taskMonitor.testTaskNotification(userId, 'assigned') },
    { type: 'invoice_status', monitor: invoiceMonitor.testInvoiceNotification(userId, 'status_changed') },
    { type: 'subscription_renewal', monitor: subscriptionMonitor.testSubscriptionNotification(userId, 'renewal') }
  ];

  for (const test of tests) {
    try {
      await test.monitor;
      results.push({ type: test.type, success: true });
    } catch (error) {
      results.push({
        type: test.type,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  const allSuccessful = results.every(r => r.success);

  return {
    success: allSuccessful,
    results
  };
}