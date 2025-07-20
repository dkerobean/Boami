import { connectDB } from '@/lib/database/mongoose-connection';
import Income from '@/lib/database/models/Income';
import Expense from '@/lib/database/models/Expense';
import Sale from '@/lib/database/models/Sale';

/**
 * Financial Calculator Service
 * Provides financial calculations, summaries, and reporting utilities
 */

export interface FinancialSummary {
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  period: {
    startDate: Date;
    endDate: Date;
  };
}

export interface CategoryBreakdown {
  categoryId: string;
  categoryName: string;
  amount: number;
  percentage: number;
  transactionCount: number;
}

export interface MonthlyTrend {
  month: string;
  year: number;
  income: number;
  expenses: number;
  profit: number;
  profitMargin: number;
}

export interface FinancialMetrics {
  summary: FinancialSummary;
  incomeByCategory: CategoryBreakdown[];
  expensesByCategory: CategoryBreakdown[];
  monthlyTrends: MonthlyTrend[];
  topExpenseCategories: CategoryBreakdown[];
  topIncomeCategories: CategoryBreakdown[];
}

export class FinancialCalculator {
  /**
   * Calculates comprehensive financial summary for a user
   */
  static async calculateFinancialSummary(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<FinancialSummary> {
    try {
      await connectDB();

      const dateFilter: any = { userId };

      if (startDate || endDate) {
        dateFilter.date = {};
        if (startDate) dateFilter.date.$gte = startDate;
        if (endDate) dateFilter.date.$lte = endDate;
      }

      // Calculate totals
      const [incomeTotal, expenseTotal] = await Promise.all([
        Income.getTotalByUser(userId),
        Expense.getTotalByUser(userId)
      ]);

      // If date range is specified, recalculate with date filter
      let totalIncome = incomeTotal;
      let totalExpenses = expenseTotal;

      if (startDate || endDate) {
        const [incomeResult, expenseResult] = await Promise.all([
          Income.aggregate([
            { $match: dateFilter },
            { $group: { _id: null, total: { $sum: '$amount' } } }
          ]),
          Expense.aggregate([
            { $match: dateFilter },
            { $group: { _id: null, total: { $sum: '$amount' } } }
          ])
        ]);

        totalIncome = incomeResult.length > 0 ? incomeResult[0].total : 0;
        totalExpenses = expenseResult.length > 0 ? expenseResult[0].total : 0;
      }

      const netProfit = totalIncome - totalExpenses;
      const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

      return {
        totalIncome: Math.round(totalIncome * 100) / 100,
        totalExpenses: Math.round(totalExpenses * 100) / 100,
        netProfit: Math.round(netProfit * 100) / 100,
        profitMargin: Math.round(profitMargin * 100) / 100,
        period: {
          startDate: startDate || new Date(0),
          endDate: endDate || new Date()
        }
      };

    } catch (error) {
      console.error('Financial summary calculation error:', error);
      return {
        totalIncome: 0,
        totalExpenses: 0,
        netProfit: 0,
        profitMargin: 0,
        period: {
          startDate: startDate || new Date(0),
          endDate: endDate || new Date()
        }
      };
    }
  }

  /**
   * Gets income breakdown by category
   */
  static async getIncomeByCategory(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<CategoryBreakdown[]> {
    try {
      await connectDB();

      const matchFilter: any = { userId };
      if (startDate || endDate) {
        matchFilter.date = {};
        if (startDate) matchFilter.date.$gte = startDate;
        if (endDate) matchFilter.date.$lte = endDate;
      }

      const breakdown = await Income.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: '$categoryId',
            amount: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        {
          $lookup: {
            from: 'incomecategories',
            localField: '_id',
            foreignField: '_id',
            as: 'category'
          }
        },
        {
          $project: {
            categoryId: '$_id',
            categoryName: { $arrayElemAt: ['$category.name', 0] },
            amount: 1,
            transactionCount: '$count'
          }
        },
        { $sort: { amount: -1 } }
      ]);

      const totalIncome = breakdown.reduce((sum, item) => sum + item.amount, 0);

      return breakdown.map(item => ({
        categoryId: item.categoryId,
        categoryName: item.categoryName || 'Unknown Category',
        amount: Math.round(item.amount * 100) / 100,
        percentage: totalIncome > 0 ? Math.round((item.amount / totalIncome) * 10000) / 100 : 0,
        transactionCount: item.transactionCount
      }));

    } catch (error) {
      console.error('Income by category calculation error:', error);
      return [];
    }
  }

  /**
   * Gets expense breakdown by category
   */
  static async getExpensesByCategory(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<CategoryBreakdown[]> {
    try {
      await connectDB();

      const matchFilter: any = { userId };
      if (startDate || endDate) {
        matchFilter.date = {};
        if (startDate) matchFilter.date.$gte = startDate;
        if (endDate) matchFilter.date.$lte = endDate;
      }

      const breakdown = await Expense.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: '$categoryId',
            amount: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        {
          $lookup: {
            from: 'expensecategories',
            localField: '_id',
            foreignField: '_id',
            as: 'category'
          }
        },
        {
          $project: {
            categoryId: '$_id',
            categoryName: { $arrayElemAt: ['$category.name', 0] },
            amount: 1,
            transactionCount: '$count'
          }
        },
        { $sort: { amount: -1 } }
      ]);

      const totalExpenses = breakdown.reduce((sum, item) => sum + item.amount, 0);

      return breakdown.map(item => ({
        categoryId: item.categoryId,
        categoryName: item.categoryName || 'Unknown Category',
        amount: Math.round(item.amount * 100) / 100,
        percentage: totalExpenses > 0 ? Math.round((item.amount / totalExpenses) * 10000) / 100 : 0,
        transactionCount: item.transactionCount
      }));

    } catch (error) {
      console.error('Expenses by category calculation error:', error);
      return [];
    }
  }

  /**
   * Gets monthly financial trends
   */
  static async getMonthlyTrends(
    userId: string,
    monthsBack: number = 12
  ): Promise<MonthlyTrend[]> {
    try {
      await connectDB();

      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - monthsBack);
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);

      const [incomeData, expenseData] = await Promise.all([
        Income.aggregate([
          {
            $match: {
              userId: userId,
              date: { $gte: startDate }
            }
          },
          {
            $group: {
              _id: {
                year: { $year: '$date' },
                month: { $month: '$date' }
              },
              income: { $sum: '$amount' }
            }
          }
        ]),
        Expense.aggregate([
          {
            $match: {
              userId: userId,
              date: { $gte: startDate }
            }
          },
          {
            $group: {
              _id: {
                year: { $year: '$date' },
                month: { $month: '$date' }
              },
              expenses: { $sum: '$amount' }
            }
          }
        ])
      ]);

      // Create a map for easy lookup
      const incomeMap = new Map();
      const expenseMap = new Map();

      incomeData.forEach(item => {
        const key = `${item._id.year}-${item._id.month}`;
        incomeMap.set(key, item.income);
      });

      expenseData.forEach(item => {
        const key = `${item._id.year}-${item._id.month}`;
        expenseMap.set(key, item.expenses);
      });

      // Generate trends for each month
      const trends: MonthlyTrend[] = [];
      const currentDate = new Date(startDate);

      while (currentDate <= new Date()) {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        const key = `${year}-${month}`;

        const income = incomeMap.get(key) || 0;
        const expenses = expenseMap.get(key) || 0;
        const profit = income - expenses;
        const profitMargin = income > 0 ? (profit / income) * 100 : 0;

        trends.push({
          month: currentDate.toLocaleString('default', { month: 'long' }),
          year: year,
          income: Math.round(income * 100) / 100,
          expenses: Math.round(expenses * 100) / 100,
          profit: Math.round(profit * 100) / 100,
          profitMargin: Math.round(profitMargin * 100) / 100
        });

        currentDate.setMonth(currentDate.getMonth() + 1);
      }

      return trends;

    } catch (error) {
      console.error('Monthly trends calculation error:', error);
      return [];
    }
  }

  /**
   * Gets comprehensive financial metrics
   */
  static async getFinancialMetrics(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<FinancialMetrics> {
    try {
      const [
        summary,
        incomeByCategory,
        expensesByCategory,
        monthlyTrends
      ] = await Promise.all([
        this.calculateFinancialSummary(userId, startDate, endDate),
        this.getIncomeByCategory(userId, startDate, endDate),
        this.getExpensesByCategory(userId, startDate, endDate),
        this.getMonthlyTrends(userId, 6) // Last 6 months
      ]);

      return {
        summary,
        incomeByCategory,
        expensesByCategory,
        monthlyTrends,
        topExpenseCategories: expensesByCategory.slice(0, 5),
        topIncomeCategories: incomeByCategory.slice(0, 5)
      };

    } catch (error) {
      console.error('Financial metrics calculation error:', error);
      return {
        summary: {
          totalIncome: 0,
          totalExpenses: 0,
          netProfit: 0,
          profitMargin: 0,
          period: {
            startDate: startDate || new Date(0),
            endDate: endDate || new Date()
          }
        },
        incomeByCategory: [],
        expensesByCategory: [],
        monthlyTrends: [],
        topExpenseCategories: [],
        topIncomeCategories: []
      };
    }
  }

  /**
   * Calculates financial ratios and KPIs
   */
  static async calculateFinancialRatios(userId: string) {
    try {
      const summary = await this.calculateFinancialSummary(userId);
      const salesData = await Sale.getSalesAnalytics(userId);

      return {
        profitMargin: summary.profitMargin,
        expenseRatio: summary.totalIncome > 0 ? (summary.totalExpenses / summary.totalIncome) * 100 : 0,
        averageTransactionValue: salesData.averageSaleAmount || 0,
        totalTransactions: salesData.totalTransactions || 0,
        revenuePerTransaction: salesData.averageSaleAmount || 0
      };

    } catch (error) {
      console.error('Financial ratios calculation error:', error);
      return {
        profitMargin: 0,
        expenseRatio: 0,
        averageTransactionValue: 0,
        totalTransactions: 0,
        revenuePerTransaction: 0
      };
    }
  }
}