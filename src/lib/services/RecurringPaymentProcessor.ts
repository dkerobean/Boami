import { connectDB } from '@/lib/database/mongoose-connection';
import RecurringPayment from '@/lib/database/models/RecurringPayment';
import Income from '@/lib/database/models/Income';
import Expense from '@/lib/database/models/Expense';
import { paymentMonitor } from '@/lib/utils/payment-monitor';

/**
 * Recurring Payment Processor
 * Handles automated processing of recurring income and expense payments
 */

export interface ProcessingResult {
  success: boolean;
  processedCount: number;
  createdRecords: Array<{
    type: 'income' | 'expense';
    recordId: string;
    amount: number;
    description: string;
  }>;
  errors: Array<{
    recurringPaymentId: string;
    error: string;
  }>;
  deactivatedCount: number;
}

export interface ScheduleInfo {
  recurringPaymentId: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  nextDueDate: Date;
  frequency: string;
  isOverdue: boolean;
  daysPastDue: number;
}

export class RecurringPaymentProcessor {
  /**
   * Processes all due recurring payments for a specific user
   */
  static async processUserRecurringPayments(userId: string): Promise<ProcessingResult> {
    const startTime = Date.now();

    paymentMonitor.logProcessingStart({
      message: `Starting user recurring payment processing for user: ${userId}`,
      userId: userId
    });

    try {
      await connectDB();

      // Find all due recurring payments for the user
      const duePayments = await RecurringPayment.find({
        userId: userId,
        isActive: true,
        nextDueDate: { $lte: new Date() }
      });

      paymentMonitor.logSystem({
        type: 'info',
        message: `Found ${duePayments.length} due payments for user: ${userId}`,
        additionalData: { userId, duePaymentsCount: duePayments.length }
      });

      const result = await this.processRecurringPayments(duePayments, userId);

      const processingTime = Date.now() - startTime;
      paymentMonitor.logSuccess({
        message: `User recurring payment processing completed for user: ${userId}`,
        userId: userId,
        amount: result.createdRecords.reduce((sum, record) => sum + record.amount, 0),
        processingTime,
        additionalData: {
          processedCount: result.processedCount,
          errorCount: result.errors.length,
          deactivatedCount: result.deactivatedCount
        }
      });

      return result;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      paymentMonitor.logError({
        message: `User recurring payment processing failed for user: ${userId}`,
        error: error instanceof Error ? error : new Error(String(error)),
        userId: userId,
        additionalData: { processingTime }
      });

      return {
        success: false,
        processedCount: 0,
        createdRecords: [],
        errors: [{
          recurringPaymentId: 'system',
          error: error instanceof Error ? error.message : 'Unknown error'
        }],
        deactivatedCount: 0
      };
    }
  }

  /**
   * Processes all due recurring payments system-wide
   */
  static async processAllDueRecurringPayments(): Promise<ProcessingResult> {
    const startTime = Date.now();

    paymentMonitor.logProcessingStart({
      message: 'Starting system-wide recurring payment processing'
    });

    try {
      await connectDB();

      // Find all due recurring payments across all users
      const duePayments = await RecurringPayment.find({
        isActive: true,
        nextDueDate: { $lte: new Date() }
      });

      paymentMonitor.logSystem({
        type: 'info',
        message: `Found ${duePayments.length} due payments system-wide`,
        additionalData: { duePaymentsCount: duePayments.length }
      });

      const result = await this.processRecurringPayments(duePayments);

      const processingTime = Date.now() - startTime;
      paymentMonitor.logSuccess({
        message: 'System-wide recurring payment processing completed',
        amount: result.createdRecords.reduce((sum, record) => sum + record.amount, 0),
        processingTime,
        additionalData: {
          processedCount: result.processedCount,
          errorCount: result.errors.length,
          deactivatedCount: result.deactivatedCount
        }
      });

      return result;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      paymentMonitor.logError({
        message: 'System-wide recurring payment processing failed',
        error: error instanceof Error ? error : new Error(String(error)),
        additionalData: { processingTime }
      });

      return {
        success: false,
        processedCount: 0,
        createdRecords: [],
        errors: [{
          recurringPaymentId: 'system',
          error: error instanceof Error ? error.message : 'Unknown error'
        }],
        deactivatedCount: 0
      };
    }
  }

  /**
   * Processes a specific recurring payment by ID
   */
  static async processSpecificRecurringPayment(
    recurringPaymentId: string,
    userId?: string
  ): Promise<ProcessingResult> {
    try {
      await connectDB();

      const query: any = { _id: recurringPaymentId };
      if (userId) {
        query.userId = userId;
      }

      const recurringPayment = await RecurringPayment.findOne(query);

      if (!recurringPayment) {
        return {
          success: false,
          processedCount: 0,
          createdRecords: [],
          errors: [{
            recurringPaymentId,
            error: 'Recurring payment not found'
          }],
          deactivatedCount: 0
        };
      }

      return await this.processRecurringPayments([recurringPayment]);

    } catch (error) {
      console.error('Specific recurring payment processing error:', error);
      return {
        success: false,
        processedCount: 0,
        createdRecords: [],
        errors: [{
          recurringPaymentId,
          error: error instanceof Error ? error.message : 'Unknown error'
        }],
        deactivatedCount: 0
      };
    }
  }

  /**
   * Core processing logic for recurring payments
   */
  private static async processRecurringPayments(payments: any[], contextUserId?: string): Promise<ProcessingResult> {
    const createdRecords = [];
    const errors = [];
    let deactivatedCount = 0;

    paymentMonitor.logSystem({
      type: 'info',
      message: `Processing ${payments.length} recurring payments`,
      additionalData: {
        paymentCount: payments.length,
        contextUserId
      }
    });

    for (const payment of payments) {
      const paymentStartTime = Date.now();

      try {
        // Check if payment is expired
        if (payment.endDate && payment.endDate < new Date()) {
          payment.isActive = false;
          await payment.save();
          deactivatedCount++;

          paymentMonitor.logSystem({
            type: 'info',
            message: `Deactivated expired recurring payment: ${payment._id}`,
            additionalData: {
              recurringPaymentId: payment._id.toString(),
              userId: payment.userId,
              endDate: payment.endDate
            }
          });
          continue;
        }

        // Create the appropriate record (income or expense)
        let createdRecord = null;

        if (payment.type === 'income') {
          const incomeData = {
            amount: payment.amount,
            description: `${payment.description} (Recurring)`,
            date: new Date(),
            categoryId: payment.categoryId,
            isRecurring: true,
            recurringPaymentId: payment._id.toString(),
            userId: payment.userId
          };

          const income = new Income(incomeData);
          createdRecord = await income.save();

          createdRecords.push({
            type: 'income' as const,
            recordId: createdRecord._id.toString(),
            amount: createdRecord.amount,
            description: createdRecord.description
          });

        } else if (payment.type === 'expense') {
          const expenseData = {
            amount: payment.amount,
            description: `${payment.description} (Recurring)`,
            date: new Date(),
            categoryId: payment.categoryId,
            vendorId: payment.vendorId,
            isRecurring: true,
            recurringPaymentId: payment._id.toString(),
            userId: payment.userId
          };

          const expense = new Expense(expenseData);
          createdRecord = await expense.save();

          createdRecords.push({
            type: 'expense' as const,
            recordId: createdRecord._id.toString(),
            amount: createdRecord.amount,
            description: createdRecord.description
          });
        }

        // Update the next due date
        await payment.updateNextDueDate();

        const paymentProcessingTime = Date.now() - paymentStartTime;

        // Log successful payment processing
        paymentMonitor.logSuccess({
          message: `Successfully processed recurring payment: ${payment.description}`,
          userId: payment.userId,
          recurringPaymentId: payment._id.toString(),
          createdRecordId: createdRecord?._id.toString(),
          amount: payment.amount,
          processingTime: paymentProcessingTime,
          additionalData: {
            type: payment.type,
            frequency: payment.frequency,
            nextDueDate: payment.nextDueDate
          }
        });

      } catch (error) {
        const paymentProcessingTime = Date.now() - paymentStartTime;

        paymentMonitor.logError({
          message: `Failed to process recurring payment: ${payment._id}`,
          error: error instanceof Error ? error : new Error(String(error)),
          userId: payment.userId,
          recurringPaymentId: payment._id.toString(),
          additionalData: {
            processingTime: paymentProcessingTime,
            paymentType: payment.type,
            paymentAmount: payment.amount
          }
        });

        errors.push({
          recurringPaymentId: payment._id.toString(),
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const result = {
      success: errors.length === 0,
      processedCount: createdRecords.length,
      createdRecords,
      errors,
      deactivatedCount
    };

    paymentMonitor.logSystem({
      type: result.success ? 'info' : 'warning',
      message: `Recurring payment processing batch completed`,
      additionalData: {
        ...result,
        contextUserId
      }
    });

    return result;
  }

  /**
   * Gets upcoming recurring payments schedule for a user
   */
  static async getUpcomingSchedule(
    userId: string,
    daysAhead: number = 30
  ): Promise<ScheduleInfo[]> {
    try {
      await connectDB();

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);

      const recurringPayments = await RecurringPayment.find({
        userId: userId,
        isActive: true,
        nextDueDate: { $lte: futureDate }
      }).sort({ nextDueDate: 1 });

      const now = new Date();

      return recurringPayments.map(payment => {
        const isOverdue = payment.nextDueDate < now;
        const daysPastDue = isOverdue
          ? Math.floor((now.getTime() - payment.nextDueDate.getTime()) / (1000 * 60 * 60 * 24))
          : 0;

        return {
          recurringPaymentId: payment._id.toString(),
          type: payment.type,
          amount: payment.amount,
          description: payment.description,
          nextDueDate: payment.nextDueDate,
          frequency: payment.frequency,
          isOverdue,
          daysPastDue
        };
      });

    } catch (error) {
      console.error('Upcoming schedule error:', error);
      return [];
    }
  }

  /**
   * Gets overdue recurring payments for a user
   */
  static async getOverduePayments(userId: string): Promise<ScheduleInfo[]> {
    try {
      await connectDB();

      const now = new Date();
      const recurringPayments = await RecurringPayment.find({
        userId: userId,
        isActive: true,
        nextDueDate: { $lt: now }
      }).sort({ nextDueDate: 1 });

      return recurringPayments.map(payment => {
        const daysPastDue = Math.floor((now.getTime() - payment.nextDueDate.getTime()) / (1000 * 60 * 60 * 24));

        return {
          recurringPaymentId: payment._id.toString(),
          type: payment.type,
          amount: payment.amount,
          description: payment.description,
          nextDueDate: payment.nextDueDate,
          frequency: payment.frequency,
          isOverdue: true,
          daysPastDue
        };
      });

    } catch (error) {
      console.error('Overdue payments error:', error);
      return [];
    }
  }

  /**
   * Calculates next due date for a recurring payment
   */
  static calculateNextDueDate(
    currentDueDate: Date,
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
  ): Date {
    const nextDate = new Date(currentDueDate);

    switch (frequency) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + 1);
        break;
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case 'yearly':
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
    }

    return nextDate;
  }

  /**
   * Validates recurring payment configuration
   */
  static validateRecurringPayment(paymentData: {
    type: 'income' | 'expense';
    amount: number;
    frequency: string;
    startDate: Date;
    endDate?: Date;
    categoryId?: string;
    vendorId?: string;
  }): { isValid: boolean; errors: string[] } {
    const errors = [];

    // Validate type
    if (!['income', 'expense'].includes(paymentData.type)) {
      errors.push('Type must be either income or expense');
    }

    // Validate amount
    if (!paymentData.amount || paymentData.amount <= 0) {
      errors.push('Amount must be a positive number');
    }

    // Validate frequency
    if (!['daily', 'weekly', 'monthly', 'yearly'].includes(paymentData.frequency)) {
      errors.push('Frequency must be daily, weekly, monthly, or yearly');
    }

    // Validate dates
    if (paymentData.endDate && paymentData.endDate <= paymentData.startDate) {
      errors.push('End date must be after start date');
    }

    // Validate category/vendor requirements
    if (paymentData.type === 'income' && !paymentData.categoryId) {
      errors.push('Income payments must have a category');
    }

    if (paymentData.type === 'expense' && !paymentData.categoryId && !paymentData.vendorId) {
      errors.push('Expense payments must have either a category or vendor');
    }

    if (paymentData.type === 'income' && paymentData.vendorId) {
      errors.push('Income payments cannot have a vendor');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}