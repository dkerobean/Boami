/**
 * Notification System
 * Handles user notifications for successful operations and system events
 */

import { toast, ToastOptions } from 'react-hot-toast';

export interface NotificationConfig {
  title: string;
  message?: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'loading';
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  persistent?: boolean;
}

export class NotificationSystem {
  private static defaultDuration = 4000;

  /**
   * Show success notification
   */
  static success(config: Omit<NotificationConfig, 'type'>): string {
    const options: ToastOptions = {
      duration: config.duration || this.defaultDuration,
      position: 'top-right',
      style: {
        background: '#10B981',
        color: '#fff',
      },
    };

    if (config.persistent) {
      options.duration = Infinity;
    }

    return toast.success(
      this.formatMessage(config.title, config.message),
      options
    );
  }

  /**
   * Show error notification
   */
  static error(config: Omit<NotificationConfig, 'type'>): string {
    const options: ToastOptions = {
      duration: config.duration || this.defaultDuration * 2, // Errors stay longer
      position: 'top-right',
      style: {
        background: '#EF4444',
        color: '#fff',
      },
    };

    if (config.persistent) {
      options.duration = Infinity;
    }

    return toast.error(
      this.formatMessage(config.title, config.message),
      options
    );
  }

  /**
   * Show warning notification
   */
  static warning(config: Omit<NotificationConfig, 'type'>): string {
    const options: ToastOptions = {
      duration: config.duration || this.defaultDuration,
      position: 'top-right',
      style: {
        background: '#F59E0B',
        color: '#fff',
      },
    };

    return toast(
      this.formatMessage(config.title, config.message),
      options
    );
  }

  /**
   * Show info notification
   */
  static info(config: Omit<NotificationConfig, 'type'>): string {
    const options: ToastOptions = {
      duration: config.duration || this.defaultDuration,
      position: 'top-right',
      style: {
        background: '#3B82F6',
        color: '#fff',
      },
    };

    return toast(
      this.formatMessage(config.title, config.message),
      options
    );
  }

  /**
   * Show loading notification
   */
  static loading(config: Omit<NotificationConfig, 'type'>): string {
    return toast.loading(
      this.formatMessage(config.title, config.message),
      {
        position: 'top-right',
      }
    );
  }

  /**
   * Update existing notification
   */
  static update(id: string, config: NotificationConfig): void {
    const options: ToastOptions = {
      duration: config.duration || this.defaultDuration,
      position: 'top-right',
    };

    switch (config.type) {
      case 'success':
        options.style = { background: '#10B981', color: '#fff' };
        toast.success(this.formatMessage(config.title, config.message), { id, ...options });
        break;
      case 'error':
        options.style = { background: '#EF4444', color: '#fff' };
        toast.error(this.formatMessage(config.title, config.message), { id, ...options });
        break;
      case 'warning':
        options.style = { background: '#F59E0B', color: '#fff' };
        toast(this.formatMessage(config.title, config.message), { id, ...options });
        break;
      case 'info':
        options.style = { background: '#3B82F6', color: '#fff' };
        toast(this.formatMessage(config.title, config.message), { id, ...options });
        break;
      case 'loading':
        toast.loading(this.formatMessage(config.title, config.message), { id });
        break;
    }
  }

  /**
   * Dismiss notification
   */
  static dismiss(id: string): void {
    toast.dismiss(id);
  }

  /**
   * Dismiss all notifications
   */
  static dismissAll(): void {
    toast.dismiss();
  }

  /**
   * Format message with title and optional description
   */
  private static formatMessage(title: string, message?: string): string {
    return message ? `${title}\n${message}` : title;
  }

  /**
   * Financial operation specific notifications
   */
  static financial = {
    incomeCreated: (amount: number) => this.success({
      title: 'Income Added',
      message: `Successfully recorded income of $${amount.toFixed(2)}`
    }),

    incomeUpdated: (amount: number) => this.success({
      title: 'Income Updated',
      message: `Income record updated to $${amount.toFixed(2)}`
    }),

    incomeDeleted: () => this.success({
      title: 'Income Deleted',
      message: 'Income record has been removed'
    }),

    expenseCreated: (amount: number) => this.success({
      title: 'Expense Added',
      message: `Successfully recorded expense of $${amount.toFixed(2)}`
    }),

    expenseUpdated: (amount: number) => this.success({
      title: 'Expense Updated',
      message: `Expense record updated to $${amount.toFixed(2)}`
    }),

    expenseDeleted: () => this.success({
      title: 'Expense Deleted',
      message: 'Expense record has been removed'
    }),

    saleCreated: (amount: number, quantity: number) => this.success({
      title: 'Sale Recorded',
      message: `Sale of ${quantity} items for $${amount.toFixed(2)} recorded successfully`
    }),

    saleUpdated: (amount: number) => this.success({
      title: 'Sale Updated',
      message: `Sale record updated to $${amount.toFixed(2)}`
    }),

    saleDeleted: () => this.success({
      title: 'Sale Deleted',
      message: 'Sale record has been removed and inventory restored'
    }),

    categoryCreated: (name: string, type: 'income' | 'expense') => this.success({
      title: 'Category Created',
      message: `${type} category "${name}" has been created`
    }),

    categoryUpdated: (name: string) => this.success({
      title: 'Category Updated',
      message: `Category "${name}" has been updated`
    }),

    categoryDeleted: (name: string) => this.success({
      title: 'Category Deleted',
      message: `Category "${name}" has been removed`
    }),

    vendorCreated: (name: string) => this.success({
      title: 'Vendor Added',
      message: `Vendor "${name}" has been added to your directory`
    }),

    vendorUpdated: (name: string) => this.success({
      title: 'Vendor Updated',
      message: `Vendor "${name}" information has been updated`
    }),

    vendorDeleted: (name: string) => this.success({
      title: 'Vendor Deleted',
      message: `Vendor "${name}" has been removed`
    }),

    recurringPaymentCreated: (description: string) => this.success({
      title: 'Recurring Payment Created',
      message: `"${description}" has been set up for automatic processing`
    }),

    recurringPaymentUpdated: (description: string) => this.success({
      title: 'Recurring Payment Updated',
      message: `"${description}" has been updated`
    }),

    recurringPaymentDeleted: (description: string) => this.success({
      title: 'Recurring Payment Deleted',
      message: `"${description}" has been removed`
    }),

    recurringPaymentProcessed: (count: number, amount: number) => this.success({
      title: 'Recurring Payments Processed',
      message: `${count} payments totaling $${amount.toFixed(2)} have been processed`
    }),

    inventoryUpdated: (productName: string, newQuantity: number) => this.info({
      title: 'Inventory Updated',
      message: `${productName} inventory updated to ${newQuantity} units`
    }),

    lowStockWarning: (productName: string, quantity: number) => this.warning({
      title: 'Low Stock Alert',
      message: `${productName} is running low (${quantity} remaining)`,
      persistent: true
    }),

    stockOutWarning: (productName: string) => this.error({
      title: 'Out of Stock',
      message: `${productName} is out of stock`,
      persistent: true
    }),

    dataExported: (type: string, count: number) => this.success({
      title: 'Data Exported',
      message: `${count} ${type} records exported successfully`
    }),

    dataImported: (type: string, count: number) => this.success({
      title: 'Data Imported',
      message: `${count} ${type} records imported successfully`
    }),

    syncError: (operation: string) => this.error({
      title: 'Sync Error',
      message: `Failed to sync ${operation}. Please try again.`
    }),

    connectionLost: () => this.warning({
      title: 'Connection Lost',
      message: 'Reconnecting to server...',
      persistent: true
    }),

    connectionRestored: () => this.success({
      title: 'Connection Restored',
      message: 'Successfully reconnected to server'
    })
  };
}

export default NotificationSystem;