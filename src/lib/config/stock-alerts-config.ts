/**
 * Stock Alerts Configuration
 * Control stock alert generation and notifications
 */

export const STOCK_ALERTS_CONFIG = {
  // Global toggle for stock alert generation
  ENABLED: process.env.STOCK_ALERTS_ENABLED !== 'false', // Default: true, set to 'false' in env to disable

  // Notification channels configuration
  NOTIFICATIONS: {
    IN_APP: process.env.STOCK_ALERTS_IN_APP !== 'false', // Default: true
    EMAIL: process.env.STOCK_ALERTS_EMAIL === 'true', // Default: false, set to 'true' to enable
    SMS: process.env.STOCK_ALERTS_SMS === 'true', // Default: false
    PUSH: process.env.STOCK_ALERTS_PUSH === 'true', // Default: false
  },

  // Alert generation settings
  GENERATION: {
    AUTO_GENERATE: process.env.STOCK_ALERTS_AUTO_GENERATE !== 'false', // Default: true
    CHECK_INTERVAL_MINUTES: parseInt(process.env.STOCK_ALERTS_CHECK_INTERVAL || '60'), // Default: 60 minutes
    BATCH_SIZE: parseInt(process.env.STOCK_ALERTS_BATCH_SIZE || '100'), // Default: 100 products per batch
  },

  // Alert thresholds
  THRESHOLDS: {
    CRITICAL_PERCENTAGE: 0.1, // 10% of threshold = critical
    HIGH_PERCENTAGE: 0.25, // 25% of threshold = high priority
    MEDIUM_PERCENTAGE: 0.5, // 50% of threshold = medium priority
  },

  // Auto-resolution settings
  AUTO_RESOLVE: {
    ENABLED: process.env.STOCK_ALERTS_AUTO_RESOLVE !== 'false', // Default: true
    THRESHOLD_MULTIPLIER: 1.2, // Resolve when stock is 20% above threshold
  },

  // Cleanup settings
  CLEANUP: {
    RESOLVED_ALERTS_DAYS: parseInt(process.env.STOCK_ALERTS_CLEANUP_DAYS || '30'), // Keep resolved alerts for 30 days
    AUTO_CLEANUP: process.env.STOCK_ALERTS_AUTO_CLEANUP !== 'false', // Default: true
  }
};

/**
 * Check if stock alerts are enabled
 */
export function isStockAlertsEnabled(): boolean {
  return STOCK_ALERTS_CONFIG.ENABLED;
}

/**
 * Check if specific notification channel is enabled
 */
export function isNotificationChannelEnabled(channel: 'IN_APP' | 'EMAIL' | 'SMS' | 'PUSH'): boolean {
  return STOCK_ALERTS_CONFIG.NOTIFICATIONS[channel];
}

/**
 * Get alert priority based on stock level
 */
export function getAlertPriority(currentStock: number, threshold: number): 'critical' | 'high' | 'medium' | 'low' {
  if (currentStock === 0) return 'critical';

  const percentage = currentStock / threshold;

  if (percentage <= STOCK_ALERTS_CONFIG.THRESHOLDS.CRITICAL_PERCENTAGE) return 'critical';
  if (percentage <= STOCK_ALERTS_CONFIG.THRESHOLDS.HIGH_PERCENTAGE) return 'high';
  if (percentage <= STOCK_ALERTS_CONFIG.THRESHOLDS.MEDIUM_PERCENTAGE) return 'medium';
  return 'low';
}