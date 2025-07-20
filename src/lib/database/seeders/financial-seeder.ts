import { connectDB } from '../mongoose-connection';
import IncomeCategory from '../models/IncomeCategory';
import ExpenseCategory from '../models/ExpenseCategory';

/**
 * Financial Database Seeder
 * Seeds default categories for new users and system initialization
 */

export interface SeedResult {
  success: boolean;
  message: string;
  data?: any;
}

/**
 * Seeds default income categories for a user
 */
export async function seedIncomeCategoriesForUser(userId: string): Promise<SeedResult> {
  try {
    await connectDB();

    const defaultCategories = [
      {
        name: 'Product Sales',
        description: 'Revenue from product sales and merchandise',
        userId: userId,
        isDefault: false
      },
      {
        name: 'Service Fees',
        description: 'Income from services provided to clients',
        userId: userId,
        isDefault: false
      },
      {
        name: 'Commissions',
        description: 'Commission-based income and referral fees',
        userId: userId,
        isDefault: false
      },
      {
        name: 'Other Income',
        description: 'Miscellaneous income sources',
        userId: userId,
        isDefault: false
      }
    ];

    const createdCategories = [];
    let skippedCount = 0;

    for (const categoryData of defaultCategories) {
      try {
        // Check if category already exists
        const existingCategory = await IncomeCategory.findByNameAndUser(
          categoryData.name,
          userId
        );

        if (existingCategory) {
          skippedCount++;
          continue;
        }

        const category = new IncomeCategory(categoryData);
        const savedCategory = await category.save();
        createdCategories.push(savedCategory);
      } catch (error) {
        console.log(`Skipped income category ${categoryData.name}: ${error}`);
        skippedCount++;
      }
    }

    return {
      success: true,
      message: `Created ${createdCategories.length} income categories, skipped ${skippedCount}`,
      data: {
        created: createdCategories.length,
        skipped: skippedCount,
        categories: createdCategories
      }
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to seed income categories: ${error}`
    };
  }
}

/**
 * Seeds default expense categories for a user
 */
export async function seedExpenseCategoriesForUser(userId: string): Promise<SeedResult> {
  try {
    await connectDB();

    const defaultCategories = [
      {
        name: 'Rent',
        description: 'Monthly rent payments and property costs',
        userId: userId,
        isDefault: false
      },
      {
        name: 'Utilities',
        description: 'Electricity, water, gas, internet, and phone bills',
        userId: userId,
        isDefault: false
      },
      {
        name: 'Advertising',
        description: 'Marketing and promotional expenses',
        userId: userId,
        isDefault: false
      },
      {
        name: 'Shipping',
        description: 'Shipping and delivery costs',
        userId: userId,
        isDefault: false
      },
      {
        name: 'Salaries',
        description: 'Employee wages, salaries, and benefits',
        userId: userId,
        isDefault: false
      },
      {
        name: 'Equipment',
        description: 'Business equipment, tools, and supplies',
        userId: userId,
        isDefault: false
      },
      {
        name: 'Office Supplies',
        description: 'Stationery, printing, and office materials',
        userId: userId,
        isDefault: false
      },
      {
        name: 'Travel',
        description: 'Business travel and transportation expenses',
        userId: userId,
        isDefault: false
      }
    ];

    const createdCategories = [];
    let skippedCount = 0;

    for (const categoryData of defaultCategories) {
      try {
        // Check if category already exists
        const existingCategory = await ExpenseCategory.findByNameAndUser(
          categoryData.name,
          userId
        );

        if (existingCategory) {
          skippedCount++;
          continue;
        }

        const category = new ExpenseCategory(categoryData);
        const savedCategory = await category.save();
        createdCategories.push(savedCategory);
      } catch (error) {
        console.log(`Skipped expense category ${categoryData.name}: ${error}`);
        skippedCount++;
      }
    }

    return {
      success: true,
      message: `Created ${createdCategories.length} expense categories, skipped ${skippedCount}`,
      data: {
        created: createdCategories.length,
        skipped: skippedCount,
        categories: createdCategories
      }
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to seed expense categories: ${error}`
    };
  }
}

/**
 * Seeds all default financial categories for a user
 */
export async function seedFinancialCategoriesForUser(userId: string): Promise<SeedResult> {
  try {
    const incomeResult = await seedIncomeCategoriesForUser(userId);
    const expenseResult = await seedExpenseCategoriesForUser(userId);

    const totalCreated = (incomeResult.data?.created || 0) + (expenseResult.data?.created || 0);
    const totalSkipped = (incomeResult.data?.skipped || 0) + (expenseResult.data?.skipped || 0);

    return {
      success: incomeResult.success && expenseResult.success,
      message: `Seeded financial categories: ${totalCreated} created, ${totalSkipped} skipped`,
      data: {
        income: incomeResult.data,
        expense: expenseResult.data,
        totals: {
          created: totalCreated,
          skipped: totalSkipped
        }
      }
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to seed financial categories: ${error}`
    };
  }
}

/**
 * Removes all financial data for a user (for testing/cleanup)
 */
export async function cleanupUserFinancialData(userId: string): Promise<SeedResult> {
  try {
    await connectDB();

    // Import all models
    const Income = (await import('../models/Income')).default;
    const Expense = (await import('../models/Expense')).default;
    const Sale = (await import('../models/Sale')).default;
    const Vendor = (await import('../models/Vendor')).default;
    const RecurringPayment = (await import('../models/RecurringPayment')).default;

    // Delete all user data
    const results = await Promise.all([
      IncomeCategory.deleteMany({ userId }),
      ExpenseCategory.deleteMany({ userId }),
      Income.deleteMany({ userId }),
      Expense.deleteMany({ userId }),
      Sale.deleteMany({ userId }),
      Vendor.deleteMany({ userId }),
      RecurringPayment.deleteMany({ userId })
    ]);

    const totalDeleted = results.reduce((sum, result) => sum + result.deletedCount, 0);

    return {
      success: true,
      message: `Cleaned up ${totalDeleted} financial records for user`,
      data: {
        deletedCounts: {
          incomeCategories: results[0].deletedCount,
          expenseCategories: results[1].deletedCount,
          income: results[2].deletedCount,
          expenses: results[3].deletedCount,
          sales: results[4].deletedCount,
          vendors: results[5].deletedCount,
          recurringPayments: results[6].deletedCount
        },
        totalDeleted
      }
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to cleanup user financial data: ${error}`
    };
  }
}

/**
 * Validates financial data integrity for a user
 */
export async function validateUserFinancialData(userId: string): Promise<SeedResult> {
  try {
    await connectDB();

    const Income = (await import('../models/Income')).default;
    const Expense = (await import('../models/Expense')).default;
    const Sale = (await import('../models/Sale')).default;
    const Vendor = (await import('../models/Vendor')).default;
    const RecurringPayment = (await import('../models/RecurringPayment')).default;

    // Count records
    const counts = await Promise.all([
      IncomeCategory.countDocuments({ userId }),
      ExpenseCategory.countDocuments({ userId }),
      Income.countDocuments({ userId }),
      Expense.countDocuments({ userId }),
      Sale.countDocuments({ userId }),
      Vendor.countDocuments({ userId }),
      RecurringPayment.countDocuments({ userId })
    ]);

    // Check for orphaned records (basic validation)
    const orphanedIncome = await Income.countDocuments({
      userId,
      categoryId: { $nin: await IncomeCategory.find({ userId }).distinct('_id') }
    });

    const orphanedExpenses = await Expense.countDocuments({
      userId,
      $and: [
        { categoryId: { $ne: null } },
        { categoryId: { $nin: await ExpenseCategory.find({ userId }).distinct('_id') } }
      ]
    });

    return {
      success: true,
      message: 'Financial data validation completed',
      data: {
        counts: {
          incomeCategories: counts[0],
          expenseCategories: counts[1],
          income: counts[2],
          expenses: counts[3],
          sales: counts[4],
          vendors: counts[5],
          recurringPayments: counts[6]
        },
        validation: {
          orphanedIncome,
          orphanedExpenses,
          hasIssues: orphanedIncome > 0 || orphanedExpenses > 0
        }
      }
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to validate financial data: ${error}`
    };
  }
}