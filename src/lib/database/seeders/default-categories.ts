import { connectDB } from '../mongoose-connection';
import IncomeCategory from '../models/IncomeCategory';
import ExpenseCategory from '../models/ExpenseCategory';

// Default income categories
const DEFAULT_INCOME_CATEGORIES = [
  { name: 'Salary', description: 'Regular salary income', isDefault: true },
  { name: 'Freelance', description: 'Freelance work income', isDefault: true },
  { name: 'Business Revenue', description: 'Business sales and revenue', isDefault: true },
  { name: 'Investment Returns', description: 'Dividends, interest, and capital gains', isDefault: true },
  { name: 'Rental Income', description: 'Property rental income', isDefault: true },
  { name: 'Other Income', description: 'Miscellaneous income sources', isDefault: true },
];

// Default expense categories
const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'Office Supplies', description: 'Stationery, equipment, and office materials', isDefault: true },
  { name: 'Travel', description: 'Business travel and transportation', isDefault: true },
  { name: 'Marketing', description: 'Advertising and promotional expenses', isDefault: true },
  { name: 'Utilities', description: 'Electricity, water, internet, and phone bills', isDefault: true },
  { name: 'Rent', description: 'Office or business space rental', isDefault: true },
  { name: 'Professional Services', description: 'Legal, accounting, and consulting fees', isDefault: true },
  { name: 'Software & Subscriptions', description: 'Software licenses and online subscriptions', isDefault: true },
  { name: 'Equipment', description: 'Business equipment and tools', isDefault: true },
  { name: 'Insurance', description: 'Business insurance premiums', isDefault: true },
  { name: 'Other Expenses', description: 'Miscellaneous business expenses', isDefault: true },
];

/**
 * Create default categories for a user
 */
export async function createDefaultCategories(userId: string) {
  try {
    await connectDB();

    // Create default income categories
    const incomeCategories = DEFAULT_INCOME_CATEGORIES.map(category => ({
      ...category,
      userId,
    }));

    // Create default expense categories
    const expenseCategories = DEFAULT_EXPENSE_CATEGORIES.map(category => ({
      ...category,
      userId,
    }));

    // Insert categories (skip if they already exist)
    const existingIncomeCategories = await IncomeCategory.find({ userId, isDefault: true });
    const existingExpenseCategories = await ExpenseCategory.find({ userId, isDefault: true });

    if (existingIncomeCategories.length === 0) {
      await IncomeCategory.insertMany(incomeCategories);
      console.log(`Created ${incomeCategories.length} default income categories for user ${userId}`);
    }

    if (existingExpenseCategories.length === 0) {
      await ExpenseCategory.insertMany(expenseCategories);
      console.log(`Created ${expenseCategories.length} default expense categories for user ${userId}`);
    }

    return {
      incomeCategories: incomeCategories.length,
      expenseCategories: expenseCategories.length,
    };

  } catch (error) {
    console.error('Error creating default categories:', error);
    throw error;
  }
}

/**
 * Ensure default categories exist for a user
 * This function can be called from API routes to ensure categories exist
 */
export async function ensureDefaultCategories(userId: string) {
  try {
    await connectDB();

    // Check if user has any categories
    const [incomeCount, expenseCount] = await Promise.all([
      IncomeCategory.countDocuments({ userId }),
      ExpenseCategory.countDocuments({ userId }),
    ]);

    // If no categories exist, create defaults
    if (incomeCount === 0 || expenseCount === 0) {
      await createDefaultCategories(userId);
    }

    return true;
  } catch (error) {
    console.error('Error ensuring default categories:', error);
    return false;
  }
}