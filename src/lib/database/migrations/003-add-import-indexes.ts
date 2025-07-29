/**
 * Migration: Add database indexes to optimize import performance
 * This migration adds indexes for faster category and vendor lookups during imports
 */

import { connectDB } from '../mongoose-connection';
import IncomeCategory from '../models/IncomeCategory';
import ExpenseCategory from '../models/ExpenseCategory';
import Vendor from '../models/Vendor';

export async function up(): Promise<void> {
  try {
    await connectDB();
    console.log('🔄 Adding import performance indexes...');

    // Index for income categories (userId + name for faster lookups)
    await IncomeCategory.createIndexes([
      { userId: 1, name: 1 },
      { userId: 1, name: 'text' } // Text index for case-insensitive search
    ]);
    console.log('✅ Income category indexes created');

    // Index for expense categories (userId + name for faster lookups)
    await ExpenseCategory.createIndexes([
      { userId: 1, name: 1 },
      { userId: 1, name: 'text' } // Text index for case-insensitive search
    ]);
    console.log('✅ Expense category indexes created');

    // Index for vendors (userId + name for faster lookups)
    await Vendor.createIndexes([
      { userId: 1, name: 1 },
      { userId: 1, name: 'text' } // Text index for case-insensitive search
    ]);
    console.log('✅ Vendor indexes created');

    console.log('🎉 Import performance indexes migration completed successfully');
  } catch (error) {
    console.error('❌ Import performance indexes migration failed:', error);
    throw error;
  }
}

export async function down(): Promise<void> {
  try {
    await connectDB();
    console.log('🔄 Removing import performance indexes...');

    // Remove indexes from income categories
    await IncomeCategory.collection.dropIndex({ userId: 1, name: 1 });
    await IncomeCategory.collection.dropIndex({ userId: 1, name: 'text' });
    console.log('✅ Income category indexes removed');

    // Remove indexes from expense categories  
    await ExpenseCategory.collection.dropIndex({ userId: 1, name: 1 });
    await ExpenseCategory.collection.dropIndex({ userId: 1, name: 'text' });
    console.log('✅ Expense category indexes removed');

    // Remove indexes from vendors
    await Vendor.collection.dropIndex({ userId: 1, name: 1 });
    await Vendor.collection.dropIndex({ userId: 1, name: 'text' });
    console.log('✅ Vendor indexes removed');

    console.log('🎉 Import performance indexes rollback completed successfully');
  } catch (error) {
    console.error('❌ Import performance indexes rollback failed:', error);
    throw error;
  }
}

// Export migration metadata
export const migrationInfo = {
  version: '003',
  name: 'add-import-indexes',
  description: 'Add database indexes to optimize import performance',
  createdAt: new Date('2025-01-29'),
};