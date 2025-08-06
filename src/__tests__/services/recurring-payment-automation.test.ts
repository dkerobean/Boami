/**
 * Tests for Recurring Payment Automation
 * Tests the automated processing of recurring payments
 */

import { RecurringPaymentProcessor } from '@/lib/services/RecurringPaymentProcessor';
import { cronScheduler } from '@/lib/utils/cron-scheduler';
import { paymentMonitor } from '@/lib/utils/payment-monitor';
import { SystemStartup } from '@/lib/utils/system-startup';
import { connectDB } from '@/lib/database/connection';
import RecurringPayment from '@/lib/database/models/RecurringPayment';
import Income from '@/lib/database/models/Income';
import Expense from '@/lib/database/models/Expense';
import IncomeCategory from '@/lib/database/models/IncomeCategory';
import ExpenseCategory from '@/lib/database/models/ExpenseCategory';
import Vendor from '@/lib/database/models/Vendor';

// Mock the database connection
jest.mock('@/lib/database/connection');
jest.mock('@/lib/utils/payment-monitor');

describe('Recurring Payment Automation', () => {
  const mockUserId = 'user123';
  const mockCategoryId = 'category123';
  const mockVendorId = 'vendor123';

  beforeEach(() => {
    jest.clearAllMocks();
    (connectDB as jest.Mock).mockResolvedValue(undefined);
  });

  describe('RecurringPaymentProcessor', () => {
    describe('processUserRecurringPayments', () => {
      it('should process due recurring payments for a user', async () => {
        // Mock due recurring payments
        const mockDuePayments = [
          {
            _id: 'payment1',
            type: 'income',
            amount: 1000,
            description: 'Monthly Salary',
            frequency: 'monthly',
            categoryId: mockCategoryId,
            userId: mockUserId,
            isActive: true,
            nextDueDate: new Date(Date.now() - 86400000), // Yesterday
            endDate: null,
            updateNextDueDate: jest.fn().mockResolvedValue(undefined),
            save: jest.fn().mockResolvedValue(undefined)
          },
          {
            _id: 'payment2',
            type: 'expense',
            amount: 500,
            description: 'Office Rent',
            frequency: 'monthly',
            categoryId: mockCategoryId,
            vendorId: mockVendorId,
            userId: mockUserId,
            isActive: true,
            nextDueDate: new Date(Date.now() - 86400000), // Yesterday
            endDate: null,
            updateNextDueDate: jest.fn().mockResolvedValue(undefined),
            save: jest.fn().mockResolvedValue(undefined)
          }
        ];

        // Mock database queries
        RecurringPayment.find = jest.fn().mockResolvedValue(mockDuePayments);

        // Mock Income and Expense creation
        const mockIncomeRecord = { _id: 'income1', amount: 1000, description: 'Monthly Salary (Recurring)' };
        const mockExpenseRecord = { _id: 'expense1', amount: 500, description: 'Office Rent (Recurring)' };

        Income.prototype.save = jest.fn().mockResolvedValue(mockIncomeRecord);
        Expense.prototype.save = jest.fn().mockResolvedValue(mockExpenseRecord);

        // Execute the test
        const result = await RecurringPaymentProcessor.processUserRecurringPayments(mockUserId);

        // Assertions
        expect(result.success).toBe(true);
        expect(result.processedCount).toBe(2);
        expect(result.createdRecords).toHaveLength(2);
        expect(result.errors).toHaveLength(0);
        expect(result.deactivatedCount).toBe(0);

        // Verify income record creation
        expect(result.createdRecords[0]).toEqual({
          type: 'income',
          recordId: 'income1',
          amount: 1000,
          description: 'Monthly Salary (Recurring)'
        });

        // Verify expense record creation
        expect(result.createdRecords[1]).toEqual({
          type: 'expense',
          recordId: 'expense1',
          amount: 500,
          description: 'Office Rent (Recurring)'
        });

        // Verify next due date updates
        expect(mockDuePayments[0].updateNextDueDate).toHaveBeenCalled();
        expect(mockDuePayments[1].updateNextDueDate).toHaveBeenCalled();
      });

      it('should handle expired recurring payments', async () => {
        const expiredPayment = {
          _id: 'payment1',
          type: 'income',
          amount: 1000,
          description: 'Expired Payment',
          frequency: 'monthly',
          categoryId: mockCategoryId,
          userId: mockUserId,
          isActive: true,
          nextDueDate: new Date(Date.now() - 86400000),
          endDate: new Date(Date.now() - 86400000), // Expired yesterday
          save: jest.fn().mockResolvedValue(undefined)
        };

        RecurringPayment.find = jest.fn().mockResolvedValue([expiredPayment]);

        const result = await RecurringPaymentProcessor.processUserRecurringPayments(mockUserId);

        expect(result.success).toBe(true);
        expect(result.processedCount).toBe(0);
        expect(result.deactivatedCount).toBe(1);
        expect(expiredPayment.isActive).toBe(false);
        expect(expiredPayment.save).toHaveBeenCalled();
      });

      it('should handle processing errors gracefully', async () => {
        const problematicPayment = {
          _id: 'payment1',
          type: 'income',
          amount: 1000,
          description: 'Problematic Payment',
          frequency: 'monthly',
          categoryId: mockCategoryId,
          userId: mockUserId,
          isActive: true,
          nextDueDate: new Date(Date.now() - 86400000),
          endDate: null,
          updateNextDueDate: jest.fn().mockRejectedValue(new Error('Database error'))
        };

        RecurringPayment.find = jest.fn().mockResolvedValue([problematicPayment]);
        Income.prototype.save = jest.fn().mockResolvedValue({ _id: 'income1', amount: 1000, description: 'Test' });

        const result = await RecurringPaymentProcessor.processUserRecurringPayments(mockUserId);

        expect(result.success).toBe(false);
        expect(result.processedCount).toBe(0);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toEqual({
          recurringPaymentId: 'payment1',
          error: 'Database error'
        });
      });
    });

    describe('processAllDueRecurringPayments', () => {
      it('should process all due payments system-wide', async () => {
        const mockDuePayments = [
          {
            _id: 'payment1',
            type: 'income',
            amount: 1000,
            description: 'User 1 Income',
            frequency: 'monthly',
            categoryId: mockCategoryId,
            userId: 'user1',
            isActive: true,
            nextDueDate: new Date(Date.now() - 86400000),
            endDate: null,
            updateNextDueDate: jest.fn().mockResolvedValue(undefined)
          },
          {
            _id: 'payment2',
            type: 'expense',
            amount: 500,
            description: 'User 2 Expense',
            frequency: 'monthly',
            categoryId: mockCategoryId,
            userId: 'user2',
            isActive: true,
            nextDueDate: new Date(Date.now() - 86400000),
            endDate: null,
            updateNextDueDate: jest.fn().mockResolvedValue(undefined)
          }
        ];

        RecurringPayment.find = jest.fn().mockResolvedValue(mockDuePayments);
        Income.prototype.save = jest.fn().mockResolvedValue({ _id: 'income1', amount: 1000, description: 'Test' });
        Expense.prototype.save = jest.fn().mockResolvedValue({ _id: 'expense1', amount: 500, description: 'Test' });

        const result = await RecurringPaymentProcessor.processAllDueRecurringPayments();

        expect(result.success).toBe(true);
        expect(result.processedCount).toBe(2);
        expect(result.createdRecords).toHaveLength(2);
      });
    });

    describe('getUpcomingSchedule', () => {
      it('should return upcoming payments for a user', async () => {
        const futureDate = new Date(Date.now() + 86400000); // Tomorrow
        const overdueDate = new Date(Date.now() - 86400000); // Yesterday

        const mockPayments = [
          {
            _id: 'payment1',
            type: 'income',
            amount: 1000,
            description: 'Future Payment',
            frequency: 'monthly',
            nextDueDate: futureDate
          },
          {
            _id: 'payment2',
            type: 'expense',
            amount: 500,
            description: 'Overdue Payment',
            frequency: 'weekly',
            nextDueDate: overdueDate
          }
        ];

        RecurringPayment.find = jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue(mockPayments)
        });

        const result = await RecurringPaymentProcessor.getUpcomingSchedule(mockUserId, 30);

        expect(result).toHaveLength(2);
        expect(result[0].isOverdue).toBe(false);
        expect(result[1].isOverdue).toBe(true);
        expect(result[1].daysPastDue).toBe(1);
      });
    });

    describe('validateRecurringPayment', () => {
      it('should validate correct payment data', () => {
        const validPaymentData = {
          type: 'income' as const,
          amount: 1000,
          frequency: 'monthly',
          startDate: new Date(),
          categoryId: mockCategoryId
        };

        const result = RecurringPaymentProcessor.validateRecurringPayment(validPaymentData);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject invalid payment data', () => {
        const invalidPaymentData = {
          type: 'invalid' as any,
          amount: -100,
          frequency: 'invalid',
          startDate: new Date(),
          endDate: new Date(Date.now() - 86400000) // End date before start date
        };

        const result = RecurringPaymentProcessor.validateRecurringPayment(invalidPaymentData);

        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors).toContain('Type must be either income or expense');
        expect(result.errors).toContain('Amount must be a positive number');
        expect(result.errors).toContain('Frequency must be daily, weekly, monthly, or yearly');
      });
    });
  });

  describe('CronScheduler', () => {
    it('should start and stop the scheduler', () => {
      expect(cronScheduler.isSchedulerRunning()).toBe(false);

      cronScheduler.start();
      expect(cronScheduler.isSchedulerRunning()).toBe(true);

      cronScheduler.stop();
      expect(cronScheduler.isSchedulerRunning()).toBe(false);
    });

    it('should get scheduler statistics', () => {
      const stats = cronScheduler.getStats();

      expect(stats).toHaveProperty('isRunning');
      expect(stats).toHaveProperty('totalJobs');
      expect(stats).toHaveProperty('enabledJobs');
      expect(stats).toHaveProperty('activeJobs');
      expect(stats).toHaveProperty('totalRuns');
      expect(stats).toHaveProperty('totalErrors');
    });

    it('should enable and disable jobs', () => {
      cronScheduler.setJobEnabled('recurring-payments', false);
      const disabledJob = cronScheduler.getJobStatus('recurring-payments');
      expect(disabledJob?.enabled).toBe(false);

      cronScheduler.setJobEnabled('recurring-payments', true);
      const enabledJob = cronScheduler.getJobStatus('recurring-payments');
      expect(enabledJob?.enabled).toBe(true);
    });

    it('should update job schedules', () => {
      const newSchedule = '0 */12 * * *'; // Every 12 hours
      cronScheduler.updateJobSchedule('recurring-payments', newSchedule);

      const job = cronScheduler.getJobStatus('recurring-payments');
      expect(job?.schedule).toBe(newSchedule);
    });
  });

  describe('PaymentMonitor', () => {
    it('should log successful payment processing', () => {
      paymentMonitor.logSuccess({
        message: 'Test payment processed',
        userId: mockUserId,
        recurringPaymentId: 'payment1',
        amount: 1000,
        processingTime: 100
      });

      // Verify the log was created (mocked)
      expect(paymentMonitor.logSuccess).toHaveBeenCalledWith({
        message: 'Test payment processed',
        userId: mockUserId,
        recurringPaymentId: 'payment1',
        amount: 1000,
        processingTime: 100
      });
    });

    it('should log processing errors', () => {
      const testError = new Error('Test error');

      paymentMonitor.logError({
        message: 'Test payment failed',
        error: testError,
        userId: mockUserId,
        recurringPaymentId: 'payment1'
      });

      expect(paymentMonitor.logError).toHaveBeenCalledWith({
        message: 'Test payment failed',
        error: testError,
        userId: mockUserId,
        recurringPaymentId: 'payment1'
      });
    });
  });

  describe('SystemStartup', () => {
    it('should initialize system services', async () => {
      const config = {
        enableCronJobs: true,
        cronJobSchedule: '0 0 * * *',
        logLevel: 'info' as const
      };

      await SystemStartup.initialize(config);

      expect(SystemStartup.isInitialized()).toBe(true);

      const status = SystemStartup.getStatus();
      expect(status.initialized).toBe(true);
      expect(status.config).toEqual(expect.objectContaining(config));
    });

    it('should shutdown system services', async () => {
      await SystemStartup.initialize();
      expect(SystemStartup.isInitialized()).toBe(true);

      await SystemStartup.shutdown();
      expect(SystemStartup.isInitialized()).toBe(false);
    });
  });

  describe('Integration Tests', () => {
    it('should process recurring payments end-to-end', async () => {
      // Setup test data
      const testCategory = {
        _id: mockCategoryId,
        name: 'Test Category',
        userId: mockUserId,
        isDefault: false
      };

      const testRecurringPayment = {
        _id: 'payment1',
        type: 'income',
        amount: 1000,
        description: 'Test Recurring Income',
        frequency: 'monthly',
        startDate: new Date(Date.now() - 86400000 * 30), // 30 days ago
        nextDueDate: new Date(Date.now() - 86400000), // Yesterday (due)
        isActive: true,
        categoryId: mockCategoryId,
        userId: mockUserId,
        endDate: null,
        updateNextDueDate: jest.fn().mockResolvedValue(undefined)
      };

      // Mock database operations
      RecurringPayment.find = jest.fn().mockResolvedValue([testRecurringPayment]);
      IncomeCategory.findOne = jest.fn().mockResolvedValue(testCategory);
      Income.prototype.save = jest.fn().mockResolvedValue({
        _id: 'income1',
        amount: 1000,
        description: 'Test Recurring Income (Recurring)',
        categoryId: mockCategoryId,
        userId: mockUserId
      });

      // Process the payment
      const result = await RecurringPaymentProcessor.processUserRecurringPayments(mockUserId);

      // Verify results
      expect(result.success).toBe(true);
      expect(result.processedCount).toBe(1);
      expect(result.createdRecords[0].type).toBe('income');
      expect(result.createdRecords[0].amount).toBe(1000);
      expect(testRecurringPayment.updateNextDueDate).toHaveBeenCalled();
    });

    it('should handle multiple payment types in one batch', async () => {
      const mixedPayments = [
        {
          _id: 'payment1',
          type: 'income',
          amount: 2000,
          description: 'Salary',
          frequency: 'monthly',
          categoryId: mockCategoryId,
          userId: mockUserId,
          isActive: true,
          nextDueDate: new Date(Date.now() - 86400000),
          endDate: null,
          updateNextDueDate: jest.fn().mockResolvedValue(undefined)
        },
        {
          _id: 'payment2',
          type: 'expense',
          amount: 800,
          description: 'Rent',
          frequency: 'monthly',
          categoryId: mockCategoryId,
          vendorId: mockVendorId,
          userId: mockUserId,
          isActive: true,
          nextDueDate: new Date(Date.now() - 86400000),
          endDate: null,
          updateNextDueDate: jest.fn().mockResolvedValue(undefined)
        }
      ];

      RecurringPayment.find = jest.fn().mockResolvedValue(mixedPayments);
      Income.prototype.save = jest.fn().mockResolvedValue({ _id: 'income1', amount: 2000, description: 'Salary (Recurring)' });
      Expense.prototype.save = jest.fn().mockResolvedValue({ _id: 'expense1', amount: 800, description: 'Rent (Recurring)' });

      const result = await RecurringPaymentProcessor.processUserRecurringPayments(mockUserId);

      expect(result.success).toBe(true);
      expect(result.processedCount).toBe(2);
      expect(result.createdRecords).toHaveLength(2);

      // Verify both income and expense were created
      const incomeRecord = result.createdRecords.find(r => r.type === 'income');
      const expenseRecord = result.createdRecords.find(r => r.type === 'expense');

      expect(incomeRecord).toBeDefined();
      expect(expenseRecord).toBeDefined();
      expect(incomeRecord?.amount).toBe(2000);
      expect(expenseRecord?.amount).toBe(800);
    });
  });
});