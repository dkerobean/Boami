/**
 * Notification Icons Utility
 * Provides default avatars/icons for different notification types
 */

export const NOTIFICATION_ICONS = {
  stock_alert: '/images/icons/stock-alert.png',
  task_completed: '/images/icons/task-completed.png',
  payment_received: '/images/icons/payment.png',
  user_joined: '/images/profile/user-1.jpg',
  message_received: '/images/icons/message.png',
  invoice_paid: '/images/icons/invoice.png',
  subscription_renewed: '/images/icons/subscription.png',
  default: '/images/profile/user-1.jpg'
};

export function getNotificationIcon(type: string, fallback?: string): string {
  return NOTIFICATION_ICONS[type as keyof typeof NOTIFICATION_ICONS] || fallback || NOTIFICATION_ICONS.default;
}

export function getNotificationColor(type: string): string {
  const colors = {
    stock_alert: '#ff9800', // Orange
    task_completed: '#4caf50', // Green
    payment_received: '#2196f3', // Blue
    user_joined: '#9c27b0', // Purple
    message_received: '#00bcd4', // Cyan
    invoice_paid: '#4caf50', // Green
    subscription_renewed: '#ff5722', // Deep Orange
    default: '#757575' // Grey
  };

  return colors[type as keyof typeof colors] || colors.default;
}