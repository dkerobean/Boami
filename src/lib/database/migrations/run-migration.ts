#!/usr/bin/env node

/**
 * Migration runner script for productivity data
 * Usage: npx ts-node src/lib/database/migrations/run-migration.ts [command] [userId]
 *
 * Commands:
 * - migrate-all: Migrate data for all users
 * - migrate-user <userId>: Migrate data for specific user
 * - init-user <userId>: Initialize data for new user
 * - cleanup-user <userId>: Clean up data for user (testing only)
 */

import { ProductivityMigration } from './productivity-migration';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const userId = args[1];

  try {
    switch (command) {
      case 'migrate-all':
        console.log('Starting migration for all users...');
        const allResult = await ProductivityMigration.migrateAllUsers();
        console.log('Migration completed successfully:', allResult);
        break;

      case 'migrate-user':
        if (!userId) {
          console.error('User ID is required for migrate-user command');
          process.exit(1);
        }
        console.log(`Starting migration for user ${userId}...`);
        const userResult = await ProductivityMigration.migrateAllForUser(userId);
        console.log('Migration completed successfully:', userResult);
        break;

      case 'init-user':
        if (!userId) {
          console.error('User ID is required for init-user command');
          process.exit(1);
        }
        console.log(`Initializing productivity data for user ${userId}...`);
        const initResult = await ProductivityMigration.initializeNewUser(userId);
        console.log('Initialization completed successfully:', initResult);
        break;

      case 'cleanup-user':
        if (!userId) {
          console.error('User ID is required for cleanup-user command');
          process.exit(1);
        }
        console.log(`Cleaning up productivity data for user ${userId}...`);
        const cleanupResult = await ProductivityMigration.cleanupUserData(userId);
        console.log('Cleanup completed successfully:', cleanupResult);
        break;

      default:
        console.log('Available commands:');
        console.log('  migrate-all                    - Migrate data for all users');
        console.log('  migrate-user <userId>          - Migrate data for specific user');
        console.log('  init-user <userId>             - Initialize data for new user');
        console.log('  cleanup-user <userId>          - Clean up data for user (testing only)');
        console.log('');
        console.log('Examples:');
        console.log('  npx ts-node src/lib/database/migrations/run-migration.ts migrate-all');
        console.log('  npx ts-node src/lib/database/migrations/run-migration.ts migrate-user 507f1f77bcf86cd799439011');
        console.log('  npx ts-node src/lib/database/migrations/run-migration.ts init-user 507f1f77bcf86cd799439011');
        break;
    }
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Run if called directly
if (require.main === module) {
  main();
}