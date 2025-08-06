import { notificationService } from '../notification-service';
import { User } from '../../database/models';
import { connectToDatabase } from '../../database/mongoose-connection';
import mongoose from 'mongoose';

export interface InvoiceNotificationData {
  _id: string;
  invoiceNumber: string;
  status: string;
  grandTotal: number;
  billTo: string;
  billToEmail: string;
  orderDate: string;
  userId: string;
  createdBy: string;
  dueDate?: string;
  paidDate?: string;
}

export class InvoiceMonitor {
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private processedOverdue = new Set<string>();

  /**
   * Start monitoring for overdue invoices
   */
  startOverdueMonitoring(intervalHours: number = 24): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(async () => {
      try {
        await this.checkOverdueInvoices();
      } catch (error) {
        console.error('Invoice overdue monitoring error:', error);
      }
    }, intervalHours * 60 * 60 * 1000);

    console.log(`Invoice overdue monitoring started (checking every ${intervalHours} hours)`);
  }

  /**
   * Stop monitoring overdue invoices
   */
  stopOverdueMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    console.log('Invoice overdue monitoring stopped');
  }

  /**
   * Handle invoice status change notification
   */
  async onInvoiceStatusChanged(invoiceData: InvoiceNotificationData, oldStatus: string): Promise<void> {
    try {
      await connectToDatabase();

      // Find the invoice creator
      let creator;
      if (invoiceData.userId) {
        creator = await User.findById(invoiceData.userId);
      } else if (invoiceData.createdBy) {
        creator = await User.findOne({ email: invoiceData.createdBy });
      }

      if (!creator) {
        console.warn(`Invoice creator not found for invoice ${invoiceData.invoiceNumber}`);
        return;
      }

      await notificationService.triggerNotification({
        type: 'invoice_status_changed',
        userId: (creator._id as any).toString(),
        data: {
          invoice: {
            ...invoiceData,
            oldStatus
          }
        },
        priority: 'medium'
      });

      console.log(`Invoice status change notification sent to ${creator.email} for invoice: ${invoiceData.invoiceNumber}`);
    } catch (error) {
      console.error('Failed to send invoice status change notification:', error);
    }
  }

  /**
   * Handle payment received notification
   */
  async onPaymentReceived(invoiceData: InvoiceNotificationData): Promise<void> {
    try {
      await connectToDatabase();

      // Find the invoice creator
      let creator;
      if (invoiceData.userId) {
        creator = await User.findById(invoiceData.userId);
      } else if (invoiceData.createdBy) {
        creator = await User.findOne({ email: invoiceData.createdBy });
      }

      if (!creator) {
        console.warn(`Invoice creator not found for invoice ${invoiceData.invoiceNumber}`);
        return;
      }

      await notificationService.triggerNotification({
        type: 'payment_received',
        userId: (creator._id as any).toString(),
        data: {
          invoice: {
            ...invoiceData,
            paidDate: new Date().toISOString().split('T')[0]
          }
        },
        priority: 'medium'
      });

      console.log(`Payment received notification sent to ${creator.email} for invoice: ${invoiceData.invoiceNumber}`);
    } catch (error) {
      console.error('Failed to send payment received notification:', error);
    }
  }

  /**
   * Check for overdue invoices
   */
  async checkOverdueInvoices(): Promise<InvoiceNotificationData[]> {
    try {
      await connectToDatabase();

      // Calculate date 30 days ago
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Find invoices that are overdue (sent more than 30 days ago and not paid)
      const db = mongoose.connection.db;
      if (!db) {
        console.error('Database connection not available');
        return [];
      }
      const overdueInvoices = await db.collection('invoices').find({
        status: { $in: ['Sent', 'Draft'] },
        orderDate: { $lt: thirtyDaysAgo },
        completed: false
      }).toArray();

      const overdueNotifications: InvoiceNotificationData[] = [];

      for (const invoice of overdueInvoices) {
        const invoiceKey = `${invoice._id}-overdue`;

        // Skip if we've already sent overdue notification
        if (this.processedOverdue.has(invoiceKey)) {
          continue;
        }

        // Find the invoice creator
        let creator;
        if (invoice.userId) {
          creator = await User.findById(invoice.userId);
        } else if (invoice.createdBy) {
          creator = await User.findOne({ email: invoice.createdBy });
        }

        if (!creator) {
          console.warn(`Invoice creator not found for overdue invoice ${invoice.invoiceNumber}`);
          continue;
        }

        const invoiceData: InvoiceNotificationData = {
          _id: invoice._id.toString(),
          invoiceNumber: invoice.invoiceNumber,
          status: invoice.status,
          grandTotal: invoice.grandTotal,
          billTo: invoice.billTo,
          billToEmail: invoice.billToEmail,
          orderDate: invoice.orderDate,
          userId: invoice.userId,
          createdBy: invoice.createdBy,
          dueDate: invoice.orderDate // Using order date as due date for now
        };

        await notificationService.triggerNotification({
          type: 'invoice_overdue',
          userId: (creator._id as any).toString(),
          data: { invoice: invoiceData },
          priority: 'high'
        });

        overdueNotifications.push(invoiceData);

        // Mark as processed
        this.processedOverdue.add(invoiceKey);

        // Clean up old processed overdue (keep for 7 days)
        setTimeout(() => {
          this.processedOverdue.delete(invoiceKey);
        }, 7 * 24 * 60 * 60 * 1000);

        console.log(`Overdue invoice notification sent to ${creator.email} for invoice: ${invoice.invoiceNumber}`);
      }

      return overdueNotifications;
    } catch (error) {
      console.error('Failed to check overdue invoices:', error);
      return [];
    }
  }

  /**
   * Send new invoice creation notification
   */
  async onInvoiceCreated(invoiceData: InvoiceNotificationData): Promise<void> {
    try {
      await connectToDatabase();

      // Find the invoice creator
      let creator;
      if (invoiceData.userId) {
        creator = await User.findById(invoiceData.userId);
      } else if (invoiceData.createdBy) {
        creator = await User.findOne({ email: invoiceData.createdBy });
      }

      if (!creator) {
        console.warn(`Invoice creator not found for new invoice ${invoiceData.invoiceNumber}`);
        return;
      }

      await notificationService.triggerNotification({
        type: 'invoice_status_changed', // Reuse template
        userId: (creator._id as any).toString(),
        data: {
          invoice: {
            ...invoiceData,
            isNewInvoice: true
          }
        },
        priority: 'low'
      });

      console.log(`New invoice notification sent to ${creator.email} for invoice: ${invoiceData.invoiceNumber}`);
    } catch (error) {
      console.error('Failed to send new invoice notification:', error);
    }
  }

  /**
   * Get invoice summary for user
   */
  async getInvoiceSummary(userId: string): Promise<{
    totalInvoices: number;
    paidInvoices: number;
    pendingInvoices: number;
    overdueInvoices: number;
    totalAmount: number;
    paidAmount: number;
    pendingAmount: number;
  }> {
    try {
      await connectToDatabase();

      const db = mongoose.connection.db;
      if (!db) {
        console.error('Database connection not available');
        return { 
          totalInvoices: 0, 
          paidInvoices: 0, 
          pendingInvoices: 0, 
          overdueInvoices: 0, 
          totalAmount: 0, 
          paidAmount: 0, 
          pendingAmount: 0 
        };
      }
      const invoices = await db.collection('invoices').find({ userId }).toArray();

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const summary = {
        totalInvoices: invoices.length,
        paidInvoices: 0,
        pendingInvoices: 0,
        overdueInvoices: 0,
        totalAmount: 0,
        paidAmount: 0,
        pendingAmount: 0
      };

      invoices.forEach(invoice => {
        summary.totalAmount += invoice.grandTotal || 0;

        if (invoice.status === 'Paid' || invoice.completed) {
          summary.paidInvoices++;
          summary.paidAmount += invoice.grandTotal || 0;
        } else if (invoice.status === 'Sent' && new Date(invoice.orderDate) < thirtyDaysAgo) {
          summary.overdueInvoices++;
          summary.pendingAmount += invoice.grandTotal || 0;
        } else {
          summary.pendingInvoices++;
          summary.pendingAmount += invoice.grandTotal || 0;
        }
      });

      return summary;
    } catch (error) {
      console.error('Failed to get invoice summary:', error);
      return {
        totalInvoices: 0,
        paidInvoices: 0,
        pendingInvoices: 0,
        overdueInvoices: 0,
        totalAmount: 0,
        paidAmount: 0,
        pendingAmount: 0
      };
    }
  }

  /**
   * Test invoice notification system
   */
  async testInvoiceNotification(userId: string, type: 'status_changed' | 'payment_received' | 'overdue'): Promise<void> {
    const testInvoice: InvoiceNotificationData = {
      _id: 'test-invoice-id',
      invoiceNumber: 'INV-TEST-001',
      status: type === 'payment_received' ? 'Paid' : 'Sent',
      grandTotal: 1500,
      billTo: 'Test Client',
      billToEmail: 'client@test.com',
      orderDate: new Date().toISOString().split('T')[0],
      userId,
      createdBy: 'test@example.com'
    };

    let notificationType: 'invoice_status_changed' | 'payment_received' | 'invoice_overdue';

    switch (type) {
      case 'status_changed':
        notificationType = 'invoice_status_changed';
        break;
      case 'payment_received':
        notificationType = 'payment_received';
        break;
      case 'overdue':
        notificationType = 'invoice_overdue';
        // Set date to 35 days ago for overdue test
        const overdueDate = new Date();
        overdueDate.setDate(overdueDate.getDate() - 35);
        testInvoice.orderDate = overdueDate.toISOString().split('T')[0];
        break;
    }

    await notificationService.triggerNotification({
      type: notificationType,
      userId,
      data: { invoice: testInvoice },
      priority: type === 'overdue' ? 'high' : 'medium'
    });

    console.log(`Test ${type} notification sent to user ${userId}`);
  }

  /**
   * Get monitoring status
   */
  getMonitoringStatus(): {
    isMonitoring: boolean;
    processedOverdueCount: number;
  } {
    return {
      isMonitoring: this.monitoringInterval !== null,
      processedOverdueCount: this.processedOverdue.size
    };
  }
}

// Export singleton instance
export const invoiceMonitor = new InvoiceMonitor();
export default InvoiceMonitor;