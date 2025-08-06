import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-config';
import { SubscriptionDataMigration } from '@/lib/utils/subscription-data-migration';
import { errorHandler } from '@/lib/utils/error-handler';
import { subscriptionLogger } from '@/lib/utils/subscription-logger';

export async function POST(request: NextRequest) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (session.user.role?.name !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { operation, options = {} } = body;

    await subscriptionLogger.logSecurityActivity('data_migration_requested', {
      adminId: session.user.id,
      operation,
      options
    }, {
      userId: session.user.id,
      severity: 'info'
    });

    let result: any;

    switch (operation) {
      case 'migrate-users':
        result = await SubscriptionDataMigration.migrateUsersToDefaultSubscription();
        break;

      case 'migrate-legacy':
        result = await SubscriptionDataMigration.migrateLegacySubscriptionData();
        break;

      case 'cleanup-expired':
        const expiredDays = options.daysOld || 90;
        result = await SubscriptionDataMigration.cleanupExpiredSubscriptions(expiredDays);
        break;

      case 'cleanup-transactions':
        const transactionDays = options.daysOld || 365;
        result = await SubscriptionDataMigration.cleanupOldTransactions(transactionDays);
        break;

      case 'export-data':
        const format = options.format || 'json';
        const outputPath = options.outputPath;
        result = await SubscriptionDataMigration.exportSubscriptionData(format, outputPath);
        break;

      case 'create-backup':
        const backupPath = options.outputPath;
        result = await SubscriptionDataMigration.createSubscriptionBackup(backupPath);
        break;

      case 'restore-backup':
        if (!options.backupPath) {
          return NextResponse.json(
            { success: false, error: 'Backup path is required for restore operation' },
            { status: 400 }
          );
        }
        result = await SubscriptionDataMigration.restoreSubscriptionBackup(options.backupPath);
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid operation' },
          { status: 400 }
        );
    }

    await subscriptionLogger.logSecurityActivity('data_migration_completed', {
      adminId: session.user.id,
      operation,
      success: result.success,
      processed: result.processed || result.deleted || result.exported,
      errors: result.errors
    }, {
      userId: session.user.id,
      severity: 'info'
    });

    return NextResponse.json({
      success: true,
      data: {
        operation,
        result,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    await subscriptionLogger.logSecurityActivity('data_migration_failed', {
      error: error.message,
      stack: error.stack
    }, {
      severity: 'error'
    });

    const handledError = errorHandler.handleError(error);
    
    // Map error severity to HTTP status code
    const statusCode = handledError.severity === 'critical' ? 500 :
                      handledError.severity === 'high' ? 500 :
                      handledError.severity === 'medium' ? 400 : 400;
    
    return NextResponse.json(
      { success: false, error: handledError.message },
      { status: statusCode }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (session.user.role?.name !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Return available migration operations
    const operations = [
      {
        id: 'migrate-users',
        name: 'Migrate Users to Default Subscription',
        description: 'Add default subscription status to existing users without subscription data',
        category: 'migration',
        destructive: false
      },
      {
        id: 'migrate-legacy',
        name: 'Migrate Legacy Subscription Data',
        description: 'Update legacy subscription records to match current schema',
        category: 'migration',
        destructive: false
      },
      {
        id: 'cleanup-expired',
        name: 'Cleanup Expired Subscriptions',
        description: 'Remove old expired and cancelled subscriptions',
        category: 'cleanup',
        destructive: true,
        options: {
          daysOld: {
            type: 'number',
            default: 90,
            description: 'Number of days old to consider for cleanup'
          }
        }
      },
      {
        id: 'cleanup-transactions',
        name: 'Cleanup Old Transactions',
        description: 'Archive and remove old completed transactions',
        category: 'cleanup',
        destructive: true,
        options: {
          daysOld: {
            type: 'number',
            default: 365,
            description: 'Number of days old to consider for cleanup'
          }
        }
      },
      {
        id: 'export-data',
        name: 'Export Subscription Data',
        description: 'Export subscription data for analysis or backup',
        category: 'export',
        destructive: false,
        options: {
          format: {
            type: 'select',
            options: ['json', 'csv'],
            default: 'json',
            description: 'Export format'
          },
          outputPath: {
            type: 'string',
            description: 'Output file path (optional)'
          }
        }
      },
      {
        id: 'create-backup',
        name: 'Create Full Backup',
        description: 'Create a complete backup of all subscription-related data',
        category: 'backup',
        destructive: false,
        options: {
          outputPath: {
            type: 'string',
            description: 'Backup file path (optional)'
          }
        }
      },
      {
        id: 'restore-backup',
        name: 'Restore from Backup',
        description: 'Restore subscription data from a backup file',
        category: 'backup',
        destructive: true,
        options: {
          backupPath: {
            type: 'string',
            required: true,
            description: 'Path to backup file'
          }
        }
      }
    ];

    return NextResponse.json({
      success: true,
      data: {
        operations,
        categories: ['migration', 'cleanup', 'export', 'backup'],
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    await subscriptionLogger.logSecurityActivity('migration_operations_fetch_failed', {
      error: error.message,
      stack: error.stack
    }, {
      severity: 'error'
    });

    const handledError = errorHandler.handleError(error);
    
    // Map error severity to HTTP status code
    const statusCode = handledError.severity === 'critical' ? 500 :
                      handledError.severity === 'high' ? 500 :
                      handledError.severity === 'medium' ? 400 : 400;
    
    return NextResponse.json(
      { success: false, error: handledError.message },
      { status: statusCode }
    );
  }
}