import { connectToDatabase } from '@/lib/database/connection';
import { User } from '@/lib/database/models/User';
import { Plan } from '@/lib/database/models/Plan';
import { Subscription } from '@/lib/database/models/Subscription';
import { Transaction } from '@/lib/database/models/Transaction';
import { subscriptionLogger } from './subscription-logger';
import { subDays, startOfDay } from 'date-fns';

export interface MigrationResult {
  success: boolean;
  processed: number;
  errors: number;
  details: string[];
}

export interface CleanupResult {
  success: boolean;
  deleted: number;
  errors: number;
  details: string[];
}

export interface ExportResult {
  success: boolean;
  exported: number;
  filePath?: string;
  errors: number;
  details: string[];
}

export class SubscriptionDataMigration {
  /**
   * Migrate existing users to default subscription status
   */
  static async migrateUsersToDefaultSubscription(): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: true,
      processed: 0,
      errors: 0,
      details: []
    };

    try {
      await connectToDatabase();

      subscriptionLogger.info('Starting user subscription migration');

      // Find users without subscription data
      const usersWithoutSubscription = await User.find({
        $or: [
          { subscription: { $exists: false } },
          { 'subscription.status': { $exists: false } }
        ]
      });

      result.details.push(`Found ${usersWithoutSubscription.length} users without subscription data`);

      // Get the basic plan (or create default)
      let basicPlan = await Plan.findOne({ name: 'Basic' });
      if (!basicPlan) {
        basicPlan = await Plan.create({
          name: 'Free',
          description: 'Free tier with basic features',
          price: {
            monthly: 0,
            annual: 0,
            currency: 'USD'
          },
          features: ['Basic features'],
          limits: {
            projects: 1,
            storage: 100,
            apiCalls: 100
          },
          active: true,
          trialDays: 0
        });
        result.details.push('Created default free plan');
      }

      // Migrate users in batches
      const batchSize = 100;
      let processed = 0;

      for (let i = 0; i < usersWithoutSubscription.length; i += batchSize) {
        const batch = usersWithoutSubscription.slice(i, i + batchSize);

        try {
          const bulkOps = batch.map(user => ({
            updateOne: {
              filter: { _id: user._id },
              update: {
                $set: {
                  'subscription.status': 'none',
                  'subscription.planId': null,
                  'subscription.currentPeriodStart': null,
                  'subscription.currentPeriodEnd': null,
                  'subscription.cancelAtPeriodEnd': false,
                  'subscription.trialEnd': null,
                  'subscription.lastPaymentDate': null,
                  'subscription.lastPaymentAmount': null,
                  'subscription.lastPaymentCurrency': null,
                  'subscription.lastPaymentTransactionId': null
                }
              }
            }
          }));

          const bulkResult = await User.bulkWrite(bulkOps);
          processed += bulkResult.modifiedCount;
          result.processed += bulkResult.modifiedCount;

          result.details.push(`Processed batch ${Math.floor(i / batchSize) + 1}: ${bulkResult.modifiedCount} users updated`);

        } catch (batchError: any) {
          result.errors++;
          result.details.push(`Batch error: ${batchError.message}`);
          subscriptionLogger.error('Batch migration error', {
            batchStart: i,
            batchSize: batch.length,
            error: batchError.message
          });
        }
      }

      // Update users who might have incomplete subscription data
      const usersWithIncompleteData = await User.find({
        'subscription.status': { $exists: true },
        $or: [
          { 'subscription.cancelAtPeriodEnd': { $exists: false } },
          { 'subscription.lastPaymentDate': { $exists: false } }
        ]
      });

      if (usersWithIncompleteData.length > 0) {
        const incompleteOps = usersWithIncompleteData.map(user => ({
          updateOne: {
            filter: { _id: user._id },
            update: {
              $set: {
                'subscription.cancelAtPeriodEnd': user.subscription?.cancelAtPeriodEnd ?? false,
                'subscription.lastPaymentDate': user.subscription?.lastPaymentDate ?? null,
                'subscription.lastPaymentAmount': user.subscription?.lastPaymentAmount ?? null,
                'subscription.lastPaymentCurrency': user.subscription?.lastPaymentCurrency ?? null,
                'subscription.lastPaymentTransactionId': user.subscription?.lastPaymentTransactionId ?? null
              }
            }
          }
        }));

        const incompleteResult = await User.bulkWrite(incompleteOps);
        result.processed += incompleteResult.modifiedCount;
        result.details.push(`Updated ${incompleteResult.modifiedCount} users with incomplete subscription data`);
      }

      subscriptionLogger.info('User subscription migration completed', {
        processed: result.processed,
        errors: result.errors
      });

      result.details.push(`Migration completed: ${result.processed} users processed, ${result.errors} errors`);

    } catch (error: any) {
      result.success = false;
      result.errors++;
      result.details.push(`Migration failed: ${error.message}`);

      subscriptionLogger.error('User subscription migration failed', {
        error: error.message,
        stack: error.stack
      });
    }

    return result;
  }

  /**
   * Migrate legacy subscription data to new schema
   */
  static async migrateLegacySubscriptionData(): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: true,
      processed: 0,
      errors: 0,
      details: []
    };

    try {
      await connectToDatabase();

      subscriptionLogger.info('Starting legacy subscription data migration');

      // Find subscriptions that might need schema updates
      const legacySubscriptions = await Subscription.find({
        $or: [
          { billingPeriod: { $exists: false } },
          { metadata: { $exists: false } },
          { cancelReason: { $exists: false } }
        ]
      });

      result.details.push(`Found ${legacySubscriptions.length} subscriptions with legacy schema`);

      for (const subscription of legacySubscriptions) {
        try {
          const updates: any = {};

          // Add missing billingPeriod
          if (!subscription.billingPeriod) {
            updates.billingPeriod = 'monthly'; // Default to monthly
          }

          // Add missing metadata
          if (!subscription.metadata) {
            updates.metadata = {};
          }

          // Add missing cancelReason
          if (!subscription.cancelReason && subscription.status === 'cancelled') {
            updates.cancelReason = 'user_cancelled';
          }

          // Add missing fields for better tracking
          if (!subscription.createdAt) {
            updates.createdAt = new Date();
          }

          if (!subscription.updatedAt) {
            updates.updatedAt = new Date();
          }

          if (Object.keys(updates).length > 0) {
            await Subscription.updateOne({ _id: subscription._id }, { $set: updates });
            result.processed++;
          }

        } catch (subscriptionError: any) {
          result.errors++;
          result.details.push(`Error updating subscription ${subscription._id}: ${subscriptionError.message}`);

          subscriptionLogger.error('Legacy subscription update error', {
            subscriptionId: subscription._id,
            error: subscriptionError.message
          });
        }
      }

      subscriptionLogger.info('Legacy subscription migration completed', {
        processed: result.processed,
        errors: result.errors
      });

      result.details.push(`Legacy migration completed: ${result.processed} subscriptions updated, ${result.errors} errors`);

    } catch (error: any) {
      result.success = false;
      result.errors++;
      result.details.push(`Legacy migration failed: ${error.message}`);

      subscriptionLogger.error('Legacy subscription migration failed', {
        error: error.message,
        stack: error.stack
      });
    }

    return result;
  }

  /**
   * Clean up expired and cancelled subscriptions
   */
  static async cleanupExpiredSubscriptions(daysOld: number = 90): Promise<CleanupResult> {
    const result: CleanupResult = {
      success: true,
      deleted: 0,
      errors: 0,
      details: []
    };

    try {
      await connectToDatabase();

      subscriptionLogger.info('Starting expired subscription cleanup', { daysOld });

      const cutoffDate = startOfDay(subDays(new Date(), daysOld));

      // Find expired subscriptions older than cutoff date
      const expiredSubscriptions = await Subscription.find({
        $or: [
          {
            status: 'expired',
            expiredAt: { $lt: cutoffDate }
          },
          {
            status: 'cancelled',
            cancelledAt: { $lt: cutoffDate }
          }
        ]
      });

      result.details.push(`Found ${expiredSubscriptions.length} expired/cancelled subscriptions older than ${daysOld} days`);

      // Archive subscription data before deletion (optional)
      const archiveData = expiredSubscriptions.map(sub => ({
        originalId: sub._id,
        userId: sub.userId,
        planId: sub.planId,
        status: sub.status,
        archivedAt: new Date(),
        originalData: sub.toObject()
      }));

      if (archiveData.length > 0) {
        // Create archive collection if it doesn't exist
        const archiveCollection = Subscription.db.collection('subscription_archive');
        await archiveCollection.insertMany(archiveData);
        result.details.push(`Archived ${archiveData.length} subscriptions before deletion`);
      }

      // Delete expired subscriptions
      const deleteResult = await Subscription.deleteMany({
        _id: { $in: expiredSubscriptions.map(sub => sub._id) }
      });

      result.deleted = deleteResult.deletedCount;
      result.details.push(`Deleted ${result.deleted} expired subscriptions`);

      subscriptionLogger.info('Expired subscription cleanup completed', {
        deleted: result.deleted,
        archived: archiveData.length
      });

    } catch (error: any) {
      result.success = false;
      result.errors++;
      result.details.push(`Cleanup failed: ${error.message}`);

      subscriptionLogger.error('Expired subscription cleanup failed', {
        error: error.message,
        stack: error.stack
      });
    }

    return result;
  }

  /**
   * Clean up old transaction records
   */
  static async cleanupOldTransactions(daysOld: number = 365): Promise<CleanupResult> {
    const result: CleanupResult = {
      success: true,
      deleted: 0,
      errors: 0,
      details: []
    };

    try {
      await connectToDatabase();

      subscriptionLogger.info('Starting old transaction cleanup', { daysOld });

      const cutoffDate = startOfDay(subDays(new Date(), daysOld));

      // Find old completed transactions (keep failed ones for analysis)
      const oldTransactions = await Transaction.find({
        status: 'completed',
        createdAt: { $lt: cutoffDate }
      });

      result.details.push(`Found ${oldTransactions.length} old completed transactions older than ${daysOld} days`);

      // Archive transaction data before deletion
      const archiveData = oldTransactions.map(txn => ({
        originalId: txn._id,
        userId: txn.userId,
        subscriptionId: txn.subscriptionId,
        amount: txn.amount,
        currency: txn.currency,
        status: txn.status,
        archivedAt: new Date(),
        originalData: txn.toObject()
      }));

      if (archiveData.length > 0) {
        // Create archive collection if it doesn't exist
        const archiveCollection = Transaction.db.collection('transaction_archive');
        await archiveCollection.insertMany(archiveData);
        result.details.push(`Archived ${archiveData.length} transactions before deletion`);
      }

      // Delete old transactions
      const deleteResult = await Transaction.deleteMany({
        _id: { $in: oldTransactions.map(txn => txn._id) }
      });

      result.deleted = deleteResult.deletedCount;
      result.details.push(`Deleted ${result.deleted} old transactions`);

      subscriptionLogger.info('Old transaction cleanup completed', {
        deleted: result.deleted,
        archived: archiveData.length
      });

    } catch (error: any) {
      result.success = false;
      result.errors++;
      result.details.push(`Transaction cleanup failed: ${error.message}`);

      subscriptionLogger.error('Old transaction cleanup failed', {
        error: error.message,
        stack: error.stack
      });
    }

    return result;
  }

  /**
   * Export subscription data for backup or analysis
   */
  static async exportSubscriptionData(
    format: 'json' | 'csv' = 'json',
    outputPath?: string
  ): Promise<ExportResult> {
    const result: ExportResult = {
      success: true,
      exported: 0,
      errors: 0,
      details: []
    };

    try {
      await connectToDatabase();

      subscriptionLogger.info('Starting subscription data export', { format });

      // Get all subscription data with related information
      const subscriptions = await Subscription.aggregate([
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user'
          }
        },
        {
          $lookup: {
            from: 'plans',
            localField: 'planId',
            foreignField: '_id',
            as: 'plan'
          }
        },
        {
          $unwind: { path: '$user', preserveNullAndEmptyArrays: true }
        },
        {
          $unwind: { path: '$plan', preserveNullAndEmptyArrays: true }
        },
        {
          $project: {
            subscriptionId: '$_id',
            userId: '$userId',
            userEmail: '$user.email',
            userName: { $concat: ['$user.firstName', ' ', '$user.lastName'] },
            planId: '$planId',
            planName: '$plan.name',
            status: 1,
            billingPeriod: 1,
            currentPeriodStart: 1,
            currentPeriodEnd: 1,
            cancelAtPeriodEnd: 1,
            cancelledAt: 1,
            cancelReason: 1,
            expiredAt: 1,
            lastPaymentDate: 1,
            lastPaymentAmount: 1,
            lastPaymentCurrency: 1,
            createdAt: 1,
            updatedAt: 1
          }
        },
        {
          $sort: { createdAt: -1 }
        }
      ]);

      result.exported = subscriptions.length;
      result.details.push(`Exported ${result.exported} subscription records`);

      // Generate output path if not provided
      if (!outputPath) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        outputPath = `./exports/subscription-data-${timestamp}.${format}`;
      }

      // Ensure export directory exists
      const fs = require('fs');
      const path = require('path');
      const exportDir = path.dirname(outputPath);

      if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true });
      }

      // Export data based on format
      if (format === 'json') {
        const exportData = {
          exportedAt: new Date().toISOString(),
          totalRecords: subscriptions.length,
          data: subscriptions
        };

        fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2));

      } else if (format === 'csv') {
        // Convert to CSV format
        const csvHeaders = [
          'Subscription ID',
          'User ID',
          'User Email',
          'User Name',
          'Plan ID',
          'Plan Name',
          'Status',
          'Billing Period',
          'Current Period Start',
          'Current Period End',
          'Cancel At Period End',
          'Cancelled At',
          'Cancel Reason',
          'Expired At',
          'Last Payment Date',
          'Last Payment Amount',
          'Last Payment Currency',
          'Created At',
          'Updated At'
        ];

        const csvRows = subscriptions.map(sub => [
          sub.subscriptionId,
          sub.userId,
          sub.userEmail || '',
          sub.userName || '',
          sub.planId || '',
          sub.planName || '',
          sub.status,
          sub.billingPeriod || '',
          sub.currentPeriodStart ? new Date(sub.currentPeriodStart).toISOString() : '',
          sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toISOString() : '',
          sub.cancelAtPeriodEnd || false,
          sub.cancelledAt ? new Date(sub.cancelledAt).toISOString() : '',
          sub.cancelReason || '',
          sub.expiredAt ? new Date(sub.expiredAt).toISOString() : '',
          sub.lastPaymentDate ? new Date(sub.lastPaymentDate).toISOString() : '',
          sub.lastPaymentAmount || '',
          sub.lastPaymentCurrency || '',
          new Date(sub.createdAt).toISOString(),
          new Date(sub.updatedAt).toISOString()
        ]);

        const csvContent = [csvHeaders, ...csvRows]
          .map(row => row.map(field => `"${field}"`).join(','))
          .join('\n');

        fs.writeFileSync(outputPath, csvContent);
      }

      result.filePath = outputPath;
      result.details.push(`Data exported to: ${outputPath}`);

      subscriptionLogger.info('Subscription data export completed', {
        format,
        exported: result.exported,
        filePath: outputPath
      });

    } catch (error: any) {
      result.success = false;
      result.errors++;
      result.details.push(`Export failed: ${error.message}`);

      subscriptionLogger.error('Subscription data export failed', {
        error: error.message,
        stack: error.stack
      });
    }

    return result;
  }

  /**
   * Create backup of subscription-related data
   */
  static async createSubscriptionBackup(outputPath?: string): Promise<ExportResult> {
    const result: ExportResult = {
      success: true,
      exported: 0,
      errors: 0,
      details: []
    };

    try {
      await connectToDatabase();

      subscriptionLogger.info('Starting subscription backup');

      // Generate backup path if not provided
      if (!outputPath) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        outputPath = `./backups/subscription-backup-${timestamp}.json`;
      }

      // Collect all subscription-related data
      const [subscriptions, plans, transactions] = await Promise.all([
        Subscription.find({}).populate('userId planId').lean(),
        Plan.find({}).lean(),
        Transaction.find({}).lean()
      ]);

      const backupData = {
        createdAt: new Date().toISOString(),
        version: '1.0.0',
        collections: {
          subscriptions: {
            count: subscriptions.length,
            data: subscriptions
          },
          plans: {
            count: plans.length,
            data: plans
          },
          transactions: {
            count: transactions.length,
            data: transactions
          }
        },
        metadata: {
          totalRecords: subscriptions.length + plans.length + transactions.length,
          backupType: 'subscription_system',
          format: 'json'
        }
      };

      // Ensure backup directory exists
      const fs = require('fs');
      const path = require('path');
      const backupDir = path.dirname(outputPath);

      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      // Write backup file
      fs.writeFileSync(outputPath, JSON.stringify(backupData, null, 2));

      result.exported = backupData.metadata.totalRecords;
      result.filePath = outputPath;
      result.details.push(`Backup created with ${result.exported} total records`);
      result.details.push(`Subscriptions: ${subscriptions.length}`);
      result.details.push(`Plans: ${plans.length}`);
      result.details.push(`Transactions: ${transactions.length}`);
      result.details.push(`Backup saved to: ${outputPath}`);

      subscriptionLogger.info('Subscription backup completed', {
        exported: result.exported,
        filePath: outputPath,
        collections: {
          subscriptions: subscriptions.length,
          plans: plans.length,
          transactions: transactions.length
        }
      });

    } catch (error: any) {
      result.success = false;
      result.errors++;
      result.details.push(`Backup failed: ${error.message}`);

      subscriptionLogger.error('Subscription backup failed', {
        error: error.message,
        stack: error.stack
      });
    }

    return result;
  }

  /**
   * Restore subscription data from backup
   */
  static async restoreSubscriptionBackup(backupPath: string): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: true,
      processed: 0,
      errors: 0,
      details: []
    };

    try {
      await connectToDatabase();

      subscriptionLogger.info('Starting subscription backup restore', { backupPath });

      // Read backup file
      const fs = require('fs');
      if (!fs.existsSync(backupPath)) {
        throw new Error(`Backup file not found: ${backupPath}`);
      }

      const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

      if (!backupData.collections) {
        throw new Error('Invalid backup format: missing collections data');
      }

      result.details.push(`Restoring backup created at: ${backupData.createdAt}`);
      result.details.push(`Backup version: ${backupData.version}`);

      // Restore plans first (referenced by subscriptions)
      if (backupData.collections.plans?.data) {
        const plans = backupData.collections.plans.data;
        for (const planData of plans) {
          try {
            await Plan.findOneAndUpdate(
              { _id: planData._id },
              planData,
              { upsert: true, new: true }
            );
            result.processed++;
          } catch (planError: any) {
            result.errors++;
            result.details.push(`Error restoring plan ${planData._id}: ${planError.message}`);
          }
        }
        result.details.push(`Restored ${plans.length} plans`);
      }

      // Restore subscriptions
      if (backupData.collections.subscriptions?.data) {
        const subscriptions = backupData.collections.subscriptions.data;
        for (const subData of subscriptions) {
          try {
            await Subscription.findOneAndUpdate(
              { _id: subData._id },
              subData,
              { upsert: true, new: true }
            );
            result.processed++;
          } catch (subError: any) {
            result.errors++;
            result.details.push(`Error restoring subscription ${subData._id}: ${subError.message}`);
          }
        }
        result.details.push(`Restored ${subscriptions.length} subscriptions`);
      }

      // Restore transactions
      if (backupData.collections.transactions?.data) {
        const transactions = backupData.collections.transactions.data;
        for (const txnData of transactions) {
          try {
            await Transaction.findOneAndUpdate(
              { _id: txnData._id },
              txnData,
              { upsert: true, new: true }
            );
            result.processed++;
          } catch (txnError: any) {
            result.errors++;
            result.details.push(`Error restoring transaction ${txnData._id}: ${txnError.message}`);
          }
        }
        result.details.push(`Restored ${transactions.length} transactions`);
      }

      subscriptionLogger.info('Subscription backup restore completed', {
        processed: result.processed,
        errors: result.errors
      });

      result.details.push(`Restore completed: ${result.processed} records processed, ${result.errors} errors`);

    } catch (error: any) {
      result.success = false;
      result.errors++;
      result.details.push(`Restore failed: ${error.message}`);

      subscriptionLogger.error('Subscription backup restore failed', {
        error: error.message,
        stack: error.stack
      });
    }

    return result;
  }
}