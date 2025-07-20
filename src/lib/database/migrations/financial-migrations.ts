import { connectDB } from '../mongoose-connection';

/**
 * Financial Database Migrations
 * Handles schema updates and data migrations for the financial system
 */

export interface MigrationResult {
  success: boolean;
  message: string;
  version?: string;
  data?: any;
}

/**
 * Migration version tracking
 */
const MIGRATION_VERSIONS = {
  INITIAL: '1.0.0',
  ADD_INDEXES: '1.1.0',
  ADD_RECURRING_PAYMENTS: '1.2.0',
  CURRENT: '1.2.0'
};

/**
 * Creates indexes for all financial collections
 */
export async function createFinancialIndexes(): Promise<MigrationResult> {
  try {
    await connectDB();

    const collections = [
      'incomecategories',
      'expensecategories',
      'incomes',
      'expenses',
      'sales',
      'vendors',
      'recurringpayments'
    ];

    const indexResults = [];

    // Income Categories indexes
    try {
      const incomeCategories = await (await import('../models/IncomeCategory')).default.collection;
      await incomeCategories.createIndex({ name: 1, userId: 1 }, { unique: true });
      await incomeCategories.createIndex({ userId: 1, isDefault: 1 });
      indexResults.push('IncomeCategory indexes created');
    } catch (error) {
      indexResults.push(`IncomeCategory indexes: ${error}`);
    }

    // Expense Categories indexes
    try {
      const expenseCategories = await (await import('../models/ExpenseCategory')).default.collection;
      await expenseCategories.createIndex({ name: 1, userId: 1 }, { unique: true });
      await expenseCategories.createIndex({ userId: 1, isDefault: 1 });
      indexResults.push('ExpenseCategory indexes created');
    } catch (error) {
      indexResults.push(`ExpenseCategory indexes: ${error}`);
    }

    // Income indexes
    try {
      const incomes = await (await import('../models/Income')).default.collection;
      await incomes.createIndex({ userId: 1, date: -1 });
      await incomes.createIndex({ userId: 1, categoryId: 1 });
      await incomes.createIndex({ userId: 1, isRecurring: 1 });
      await incomes.createIndex({ description: 'text' });
      indexResults.push('Income indexes created');
    } catch (error) {
      indexResults.push(`Income indexes: ${error}`);
    }

    // Expense indexes
    try {
      const expenses = await (await import('../models/Expense')).default.collection;
      await expenses.createIndex({ userId: 1, date: -1 });
      await expenses.createIndex({ userId: 1, categoryId: 1 });
      await expenses.createIndex({ userId: 1, vendorId: 1 });
      await expenses.createIndex({ userId: 1, isRecurring: 1 });
      await expenses.createIndex({ description: 'text' });
      indexResults.push('Expense indexes created');
    } catch (error) {
      indexResults.push(`Expense indexes: ${error}`);
    }

    // Sales indexes
    try {
      const sales = await (await import('../models/Sale')).default.collection;
      await sales.createIndex({ userId: 1, date: -1 });
      await sales.createIndex({ userId: 1, productId: 1 });
      await sales.createIndex({ productId: 1, date: -1 });
      await sales.createIndex({ notes: 'text' });
      indexResults.push('Sale indexes created');
    } catch (error) {
      indexResults.push(`Sale indexes: ${error}`);
    }

    // Vendor indexes
    try {
      const vendors = await (await import('../models/Vendor')).default.collection;
      await vendors.createIndex({ name: 1, userId: 1 }, { unique: true });
      await vendors.createIndex({ userId: 1 });
      await vendors.createIndex({ name: 'text', contactEmail: 'text', notes: 'text' });
      indexResults.push('Vendor indexes created');
    } catch (error) {
      indexResults.push(`Vendor indexes: ${error}`);
    }

    // Recurring Payment indexes
    try {
      const recurringPayments = await (await import('../models/RecurringPayment')).default.collection;
      await recurringPayments.createIndex({ userId: 1, type: 1 });
      await recurringPayments.createIndex({ userId: 1, isActive: 1 });
      await recurringPayments.createIndex({ nextDueDate: 1, isActive: 1 });
      await recurringPayments.createIndex({ userId: 1, categoryId: 1 });
      await recurringPayments.createIndex({ userId: 1, vendorId: 1 });
      await recurringPayments.createIndex({ description: 'text' });
      indexResults.push('RecurringPayment indexes created');
    } catch (error) {
      indexResults.push(`RecurringPayment indexes: ${error}`);
    }

    return {
      success: true,
      message: 'Financial indexes created successfully',
      version: MIGRATION_VERSIONS.ADD_INDEXES,
      data: {
        results: indexResults,
        collections: collections.length
      }
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to create financial indexes: ${error}`,
      version: MIGRATION_VERSIONS.ADD_INDEXES
    };
  }
}

/**
 * Migrates existing financial data to new schema (if needed)
 */
export async function migrateFinancialData(): Promise<MigrationResult> {
  try {
    await connectDB();

    const migrationResults = [];

    // Example migration: Add isRecurring field to existing income/expense records
    try {
      const Income = (await import('../models/Income')).default;
      const incomeUpdateResult = await Income.updateMany(
        { isRecurring: { $exists: false } },
        { $set: { isRecurring: false } }
      );
      migrationResults.push(`Updated ${incomeUpdateResult.modifiedCount} income records with isRecurring field`);
    } catch (error) {
      migrationResults.push(`Income migration error: ${error}`);
    }

    try {
      const Expense = (await import('../models/Expense')).default;
      const expenseUpdateResult = await Expense.updateMany(
        { isRecurring: { $exists: false } },
        { $set: { isRecurring: false } }
      );
      migrationResults.push(`Updated ${expenseUpdateResult.modifiedCount} expense records with isRecurring field`);
    } catch (error) {
      migrationResults.push(`Expense migration error: ${error}`);
    }

    return {
      success: true,
      message: 'Financial data migration completed',
      version: MIGRATION_VERSIONS.CURRENT,
      data: {
        results: migrationResults
      }
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to migrate financial data: ${error}`,
      version: MIGRATION_VERSIONS.CURRENT
    };
  }
}

/**
 * Runs all financial migrations
 */
export async function runAllFinancialMigrations(): Promise<MigrationResult> {
  try {
    const indexResult = await createFinancialIndexes();
    const dataResult = await migrateFinancialData();

    return {
      success: indexResult.success && dataResult.success,
      message: 'All financial migrations completed',
      version: MIGRATION_VERSIONS.CURRENT,
      data: {
        indexes: indexResult,
        data: dataResult
      }
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to run financial migrations: ${error}`,
      version: MIGRATION_VERSIONS.CURRENT
    };
  }
}

/**
 * Checks if financial collections exist and creates them if needed
 */
export async function ensureFinancialCollections(): Promise<MigrationResult> {
  try {
    await connectDB();

    const mongoose = await import('mongoose');
    const db = mongoose.default.connection.db;

    if (!db) {
      throw new Error('Database connection not available');
    }

    const existingCollections = await db.listCollections().toArray();
    const existingNames = existingCollections.map(col => col.name);

    const requiredCollections = [
      'incomecategories',
      'expensecategories',
      'incomes',
      'expenses',
      'sales',
      'vendors',
      'recurringpayments'
    ];

    const createdCollections = [];
    const existingCollectionsList = [];

    for (const collectionName of requiredCollections) {
      if (!existingNames.includes(collectionName)) {
        await db.createCollection(collectionName);
        createdCollections.push(collectionName);
      } else {
        existingCollectionsList.push(collectionName);
      }
    }

    return {
      success: true,
      message: `Financial collections ensured: ${createdCollections.length} created, ${existingCollectionsList.length} existing`,
      version: MIGRATION_VERSIONS.INITIAL,
      data: {
        created: createdCollections,
        existing: existingCollectionsList,
        required: requiredCollections
      }
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to ensure financial collections: ${error}`,
      version: MIGRATION_VERSIONS.INITIAL
    };
  }
}

/**
 * Complete financial system initialization
 */
export async function initializeFinancialSystem(): Promise<MigrationResult> {
  try {
    console.log('🚀 Initializing Financial System...');

    // Step 1: Ensure collections exist
    console.log('📁 Ensuring collections exist...');
    const collectionsResult = await ensureFinancialCollections();
    if (!collectionsResult.success) {
      throw new Error(collectionsResult.message);
    }

    // Step 2: Run migrations
    console.log('🔄 Running migrations...');
    const migrationsResult = await runAllFinancialMigrations();
    if (!migrationsResult.success) {
      throw new Error(migrationsResult.message);
    }

    console.log('✅ Financial System initialized successfully');

    return {
      success: true,
      message: 'Financial system initialized successfully',
      version: MIGRATION_VERSIONS.CURRENT,
      data: {
        collections: collectionsResult.data,
        migrations: migrationsResult.data
      }
    };
  } catch (error) {
    console.error('❌ Financial System initialization failed:', error);
    return {
      success: false,
      message: `Failed to initialize financial system: ${error}`,
      version: MIGRATION_VERSIONS.CURRENT
    };
  }
}

export { MIGRATION_VERSIONS };