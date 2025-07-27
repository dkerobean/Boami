import { connectToDatabase } from './mongoose-connection';
import mongoose from 'mongoose';

// Migration tracking schema
const migrationSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  executedAt: { type: Date, default: Date.now },
  version: { type: String, required: true }
});

const Migration = mongoose.model('Migration', migrationSchema);

// Available migrations
const migrations = [
  {
    name: '001_subscription_system_setup',
    version: '1.0.0',
    module: () => import('./migrations/001_subscription_system_setup')
  }
];

export class MigrationRunner {
  /**
   * Run all pending migrations
   */
  static async runMigrations(): Promise<void> {
    console.log('🚀 Starting database migrations...');

    await connectToDatabase();

    try {
      // Get executed migrations
      const executedMigrations = await Migration.fin executedAt: 1 });
      const executedNames = executedMigrations.map(m => m.name);

      // Find pending migrations
      const pendingMigrations = migrations.filter(m => !executedNames.includes(m.name));

      if (pendingMigrations.length === 0) {
        console.log('✅ No pending migrations found');
        return;
      }

      console.log(`📋 Found ${pendingMigrations.length} pending migration(s):`);
      pendingMigrations.forEach(m => console.log(`  - ${m.name} (v${m.version})`));

      // Execute pending migrations
      for (const migration of pendingMigrations) {
        console.log(`\n⏳ Executing migration: ${migration.name}`);

        try {
          const migrationModule = await migration.module();
          await migrationModule.up();

          // Record successful migration
          await Migration.create({
            name: migration.name,
            version: migration.version,
            executedAt: new Date()
          });

          console.log(`✅ Migration ${migration.name} completed successfully`);

        } catch (error) {
          console.error(`❌ Migration ${migration.name} failed:`, error);
          throw new Error(`Migration ${migration.name} failed: ${error}`);
        }
      }

      console.log('\n🎉 All migrations completed successfully!');

    } catch (error) {
      console.error('❌ Migration process failed:', error);
      throw error;
    }
  }

  /**
   * Rollback the last migration
   */
  static async rollbackLastMigration(): Promise<void> {
    console.log('🔄 Rolling back last migration...');

    await connectToDatabase();

    try {
      // Get the last executed migration
      const lastMigration = await Migration.findOne({}).sort({ executedAt: -1 });

      if (!lastMigration) {
        console.log('ℹ️ No migrations to rollback');
        return;
      }

      console.log(`⏳ Rolling back migration: ${lastMigration.name}`);

      // Find the migration module
      const migration = migrations.find(m => m.name === lastMigration.name);

      if (!migration) {
        throw new Error(`Migration module not found: ${lastMigration.name}`);
      }

      try {
        const migrationModule = await migration.module();

        if (migrationModule.down) {
          await migrationModule.down();
        } else {
          console.log(`⚠️ No rollback function found for ${migration.name}`);
        }

        // Remove migration record
        await Migration.deleteOne({ _id: lastMigration._id });

        console.log(`✅ Migration ${lastMigration.name} rolled back successfully`);

      } catch (error) {
        console.error(`❌ Rollback of ${lastMigration.name} failed:`, error);
        throw error;
      }

    } catch (error) {
      console.error('❌ Rollback process failed:', error);
      throw error;
    }
  }

  /**
   * Get migration status
   */
  static async getMigrationStatus(): Promise<{
    executed: Array<{ name: string; version: string; executedAt: Date }>;
    pending: Array<{ name: string; version: string }>;
  }> {
    await connectToDatabase();

    const executedMigrations = await Migration.find({}).sort({ executedAt: 1 });
    const executedNames = executedMigrations.map(m => m.name);

    const pendingMigrations = migrations
      .filter(m => !executedNames.includes(m.name))
      .map(m => ({ name: m.name, version: m.version }));

    return {
      executed: executedMigrations.map(m => ({
        name: m.name,
        version: m.version,
        executedAt: m.executedAt
      })),
      pending: pendingMigrations
    };
  }

  /**
   * Verify migrations integrity
   */
  static async verifyMigrations(): Promise<boolean> {
    console.log('🔍 Verifying migrations integrity...');

    try {
      await connectToDatabase();

      const status = await this.getMigrationStatus();

      console.log(`✅ Executed migrations: ${status.executed.length}`);
      status.executed.forEach(m => {
        console.log(`  - ${m.name} (v${m.version}) - ${m.executedAt.toISOString()}`);
      });

      console.log(`📋 Pending migrations: ${status.pending.length}`);
      status.pending.forEach(m => {
        console.log(`  - ${m.name} (v${m.version})`);
      });

      // Verify database structure
      const collections = await mongoose.connection.db.listCollections().toArray();
      const collectionNames = collections.map(c => c.name);

      const requiredCollections = ['users', 'plans', 'subscriptions', 'transactions'];
      const missingCollections = requiredCollections.filter(c => !collectionNames.includes(c));

      if (missingCollections.length > 0) {
        console.error(`❌ Missing required collections: ${missingCollections.join(', ')}`);
        return false;
      }

      console.log('✅ All required collections exist');

      // Verify indexes
      const userIndexes = await mongoose.connection.db.collection('users').indexes();
      const planIndexes = await mongoose.connection.db.collection('plans').indexes();
      const subscriptionIndexes = await mongoose.connection.db.collection('subscriptions').indexes();
      const transactionIndexes = await mongoose.connection.db.collection('transactions').indexes();

      console.log(`📊 Database indexes:`);
      console.log(`  - Users: ${userIndexes.length} indexes`);
      console.log(`  - Plans: ${planIndexes.length} indexes`);
      console.log(`  - Subscriptions: ${subscriptionIndexes.length} indexes`);
      console.log(`  - Transactions: ${transactionIndexes.length} indexes`);

      console.log('✅ Migration verification completed successfully');
      return true;

    } catch (error) {
      console.error('❌ Migration verification failed:', error);
      return false;
    }
  }
}

// CLI interface
if (require.main === module) {
  const command = process.argv[2];

  async function runCommand() {
    try {
      switch (command) {
        case 'up':
        case 'migrate':
          await MigrationRunner.runMigrations();
          break;

        case 'down':
        case 'rollback':
          await MigrationRunner.rollbackLastMigration();
          break;

        case 'status':
          const status = await MigrationRunner.getMigrationStatus();
          console.log('Migration Status:');
          console.log('Executed:', status.executed);
          console.log('Pending:', status.pending);
          break;

        case 'verify':
          const isValid = await MigrationRunner.verifyMigrations();
          process.exit(isValid ? 0 : 1);
          break;

        default:
          console.log('Usage: node migrate.js [up|down|status|verify]');
          console.log('  up/migrate - Run pending migrations');
          console.log('  down/rollback - Rollback last migration');
          console.log('  status - Show migration status');
          console.log('  verify - Verify migration integrity');
          process.exit(1);
      }

      process.exit(0);

    } catch (error) {
      console.error('Command failed:', error);
      process.exit(1);
    }
  }

  runCommand();
}