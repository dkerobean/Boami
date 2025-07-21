#!/usr/bin/env node

import { connectDB, disconnectDB } from '../mongoose-connection';

/**
 * Migration runner utility
 * Runs all subscription system migrations in order
 */

const migrations = [
  {
    name: '001-create-subscription-plans',
    module: () => import('./001-create-subscription-plans')
  },
  {
    name: '002-add-subscription-indexes',
    module: () => import('./002-add-subscription-indexes')
  }
];

async function runMigrations() {
  console.log('🚀 Starting subscription system migrations...\n');

  try {
    await connectDB();
    console.log('✅ Connected to MongoDB\n');

    for (const migration of migrations) {
      console.log(`📦 Running migration: ${migration.name}`);
      const migrationModule = await migration.module();
      await migrationModule.up();
      console.log(`✅ Completed migration: ${migration.name}\n`);
    }

    console.log('🎉 All migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await disconnectDB();
  }
}

async function rollbackMigrations() {
  console.log('🔄 Rolling back subscription system migrations...\n');

  try {
    await connectDB();
    console.log('✅ Connected to MongoDB\n');

    // Run rollbacks in reverse order
    for (const migration of migrations.reverse()) {
      console.log(`📦 Rolling back migration: ${migration.name}`);
      const migrationModule = await migration.module();
      await migrationModule.down();
      console.log(`✅ Rolled back migration: ${migration.name}\n`);
    }

    console.log('🎉 All migrations rolled back successfully!');
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    process.exit(1);
  } finally {
    await disconnectDB();
  }
}

// Command line interface
const command = process.argv[2];

switch (command) {
  case 'up':
    runMigrations();
    break;
  case 'down':
    rollbackMigrations();
    break;
  default:
    console.log('Usage: npm run migrate [up|down]');
    console.log('  up   - Run all migrations');
    console.log('  down - Rollback all migrations');
    process.exit(1);
}

export { runMigrations, rollbackMigrations };