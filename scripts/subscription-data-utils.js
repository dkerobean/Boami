#!/usr/bin/env node

/**
 * Subscription Data Migration and Cleanup Utilities
 * Command-line interface for managing subscription data
 */

const { SubscriptionDataMigration } = require('../src/lib/utils/subscription-data-migration');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function error(message) {
  log(`❌ ERROR: ${message}`, 'red');
}

function success(message) {
  log(`✅ SUCCESS: ${message}`, 'green');
}

function warning(message) {
  log(`⚠️  WARNING: ${message}`, 'yellow');
}

function info(message) {
  log(`ℹ️  INFO: ${message}`, 'blue');
}

function printResult(result, operation) {
  console.log(`\n${colors.bright}=== ${operation} Results ===${colors.reset}`);

  if (result.success) {
    success(`Operation completed successfully`);
  } else {
    error(`Operation failed`);
  }

  if (result.processed !== undefined) {
    info(`Processed: ${result.processed}`);
  }

  if (result.deleted !== undefined) {
    info(`Deleted: ${result.deleted}`);
  }

  if (result.exported !== undefined) {
    info(`Exported: ${result.exported}`);
  }

  if (result.errors > 0) {
    warning(`Errors: ${result.errors}`);
  }

  if (result.filePath) {
    info(`File: ${result.filePath}`);
  }

  if (result.details && result.details.length > 0) {
    console.log(`\n${colors.cyan}Details:${colors.reset}`);
    result.details.forEach(detail => {
      console.log(`  • ${detail}`);
    });
  }

  console.log('');
}

async function migrateUsers() {
  info('Starting user subscription migration...');

  try {
    const result = await SubscriptionDataMigration.migrateUsersToDefaultSubscription();
    printResult(result, 'User Migration');

    if (!result.success) {
      process.exit(1);
    }
  } catch (err) {
    error(`Migration failed: ${err.message}`);
    process.exit(1);
  }
}

async function migrateLegacy() {
  info('Starting legacy subscription data migration...');

  try {
    const result = await SubscriptionDataMigration.migrateLegacySubscriptionData();
    printResult(result, 'Legacy Migration');

    if (!result.success) {
      process.exit(1);
    }
  } catch (err) {
    error(`Legacy migration failed: ${err.message}`);
    process.exit(1);
  }
}

async function cleanupExpired(daysOld) {
  const days = parseInt(daysOld) || 90;
  info(`Starting cleanup of expired subscriptions older than ${days} days...`);

  try {
    const result = await SubscriptionDataMigration.cleanupExpiredSubscriptions(days);
    printResult(result, 'Expired Subscription Cleanup');

    if (!result.success) {
      process.exit(1);
    }
  } catch (err) {
    error(`Cleanup failed: ${err.message}`);
    process.exit(1);
  }
}

async function cleanupTransactions(daysOld) {
  const days = parseInt(daysOld) || 365;
  info(`Starting cleanup of old transactions older than ${days} days...`);

  try {
    const result = await SubscriptionDataMigration.cleanupOldTransactions(days);
    printResult(result, 'Transaction Cleanup');

    if (!result.success) {
      process.exit(1);
    }
  } catch (err) {
    error(`Ttion cleanup failed: ${err.message}`);
    process.exit(1);
  }
}

async function exportData(format, outputPath) {
  const exportFormat = format || 'json';
  info(`Starting subscription data export in ${exportFormat} format...`);

  try {
    const result = await SubscriptionDataMigration.exportSubscriptionData(exportFormat, outputPath);
    printResult(result, 'Data Export');

    if (!result.success) {
      process.exit(1);
    }
  } catch (err) {
    error(`Export failed: ${err.message}`);
    process.exit(1);
  }
}

async function createBackup(outputPath) {
  info('Starting subscription data backup...');

  try {
    const result = await SubscriptionDataMigration.createSubscriptionBackup(outputPath);
    printResult(result, 'Backup Creation');

    if (!result.success) {
      process.exit(1);
    }
  } catch (err) {
    error(`Backup failed: ${err.message}`);
    process.exit(1);
  }
}

async function restoreBackup(backupPath) {
  if (!backupPath) {
    error('Backup file path is required for restore operation');
    process.exit(1);
  }

  info(`Starting subscription data restore from: ${backupPath}`);

  // Confirmation prompt
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question('⚠️  This will overwrite existing subscription data. Continue? (y/N): ', async (answer) => {
      rl.close();

      if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
        warning('Restore operation cancelled');
        process.exit(0);
      }

      try {
        const result = await SubscriptionDataMigration.restoreSubscriptionBackup(backupPath);
        printResult(result, 'Backup Restore');

        if (!result.success) {
          process.exit(1);
        }
      } catch (err) {
        error(`Restore failed: ${err.message}`);
        process.exit(1);
      }

      resolve();
    });
  });
}

function showUsage() {
  console.log(`
${colors.bright}Subscription Data Migration and Cleanup Utilities${colors.reset}

${colors.cyan}Usage:${colors.reset}
  node subscription-data-utils.js <command> [options]

${colors.cyan}Commands:${colors.reset}
  ${colors.green}migrate-users${colors.reset}              Migrate existing users to default subscription status
  ${colors.green}migrate-legacy${colors.reset}             Migrate legacy subscription data to new schema
  ${colors.green}cleanup-expired [days]${colors.reset}     Clean up expired/cancelled subscriptions (default: 90 days)
  ${colors.green}cleanup-transactions [days]${colors.reset} Clean up old completed transactions (default: 365 days)
  ${colors.green}export [format] [path]${colors.reset}     Export subscription data (format: json|csv)
  ${colors.green}backup [path]${colors.reset}              Create full subscription system backup
  ${colors.green}restore <path>${colors.reset}             Restore subscription data from backup
  ${colors.green}help${colors.reset}                       Show this help message

${colors.cyan}Examples:${colors.reset}
  node subscription-data-utils.js migrate-users
  node subscription-data-utils.js cleanup-expired 30
  node subscription-data-utils.js export csv ./exports/subscriptions.csv
  node subscription-data-utils.js backup ./backups/subscription-backup.json
  node subscription-data-utils.js restore ./backups/subscription-backup.json

${colors.cyan}Environment Variables:${colors.reset}
  MONGODB_URI                MongoDB connection string
  NODE_ENV                   Environment (development/production)

${colors.yellow}Warning:${colors.reset}
  - Always create a backup before running cleanup or migration operations
  - Test operations in a development environment first
  - Some operations are irreversible (cleanup commands)
`);
}

async function main() {
  const command = process.argv[2];
  const arg1 = process.argv[3];
  const arg2 = process.argv[4];

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    showUsage();
    return;
  }

  // Load environment variables
  require('dotenv').config();

  console.log(`${colors.bright}Subscription Data Utilities${colors.reset}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`MongoDB: ${process.env.MONGODB_URI ? '✓ Configured' : '❌ Not configured'}`);
  console.log('');

  try {
    switch (command) {
      case 'migrate-users':
        await migrateUsers();
        break;

      case 'migrate-legacy':
        await migrateLegacy();
        break;

      case 'cleanup-expired':
        await cleanupExpired(arg1);
        break;

      case 'cleanup-transactions':
        await cleanupTransactions(arg1);
        break;

      case 'export':
        await exportData(arg1, arg2);
        break;

      case 'backup':
        await createBackup(arg1);
        break;

      case 'restore':
        await restoreBackup(arg1);
        break;

      default:
        error(`Unknown command: ${command}`);
        showUsage();
        process.exit(1);
    }

    success('Operation completed successfully!');

  } catch (err) {
    error(`Operation failed: ${err.message}`);
    console.error(err.stack);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  error(`Uncaught exception: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  error(`Unhandled rejection at: ${promise}, reason: ${reason}`);
  process.exit(1);
});

// Run main function
if (require.main === module) {
  main();
}

module.exports = {
  migrateUsers,
  migrateLegacy,
  cleanupExpired,
  cleanupTransactions,
  exportData,
  createBackup,
  restoreBackup
};