import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/database/connection';
import Income from '@/lib/database/models/Income';
import Expense from '@/lib/database/models/Expense';
import Sale from '@/lib/database/models/Sale';
import IncomeCategory from '@/lib/database/models/IncomeCategory';
import ExpenseCategory from '@/lib/database/models/ExpenseCategory';
import RecurringPayment from '@/lib/database/models/RecurringPayment';
import Product from '@/lib/database/models/Product';
import { authenticateApiRequest, createApiResponse } from '@/lib/auth/nextauth-middleware';

/**
 * GET /api/finance/dashboard
 * Retrieves financial dashboard data for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    console.log('💰 Finance dashboard API called');

    // Verify authentication
    const authResult = await authenticateApiRequest(request);
    if (!authResult.success || !authResult.user) {
      console.log('❌ Authentication failed:', authResult.error);
      const { response, status } = createApiResponse(false, null, authResult.error, 401);
      return NextResponse.json(response, { status });
    }

    console.log('✅ User authenticated:', authResult.user.email);

    await connectDB();

    const userId = authResult.user.id;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const dateRange = searchParams.get('dateRange') || 'month';

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    let previousStartDate: Date;

    switch (dateRange) {
      case 'week':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        previousStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 14);
        break;
      case 'quarter':
        startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        previousStartDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 - 3, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        previousStartDate = new Date(now.getFullYear() - 1, 0, 1);
        break;
      default: // month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    }

    const endDate = now;
    const previousEndDate = new Date(startDate);

    // Get current period data
    const [currentIncomes, currentExpenses, currentSales] = await Promise.all([
      Income.find({
        userId: userId,
        date: { $gte: startDate, $lte: endDate }
      }).populate('categoryId').lean(),

      Expense.find({
        userId: userId,
        date: { $gte: startDate, $lte: endDate }
      }).populate('categoryId').populate('vendorId').lean(),

      Sale.find({
        userId: userId,
        date: { $gte: startDate, $lte: endDate }
      }).populate('productId').lean()
    ]);

    // Get previous period data for comparison
    const [previousIncomes, previousExpenses, previousSales] = await Promise.all([
      Income.find({
        userId: userId,
        date: { $gte: previousStartDate, $lt: previousEndDate }
      }).lean(),

      Expense.find({
        userId: userId,
        date: { $gte: previousStartDate, $lt: previousEndDate }
      }).lean(),

      Sale.find({
        userId: userId,
        date: { $gte: previousStartDate, $lt: previousEndDate }
      }).lean()
    ]);

    // Calculate summaries
    const totalIncome = currentIncomes.reduce((sum, income) => sum + income.amount, 0);
    const totalExpenses = currentExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const totalSales = currentSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const netProfit = totalIncome - totalExpenses;
    const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;
    const averageSale = currentSales.length > 0 ? totalSales / currentSales.length : 0;

    const previousTotalIncome = previousIncomes.reduce((sum, income) => sum + income.amount, 0);
    const previousTotalExpenses = previousExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const previousTotalSales = previousSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const previousNetProfit = previousTotalIncome - previousTotalExpenses;

    // Get category breakdowns
    const incomeByCategory = currentIncomes.reduce((acc, income) => {
      const categoryName = income.categoryId?.name || 'Uncategorized';
      acc[categoryName] = (acc[categoryName] || 0) + income.amount;
      return acc;
    }, {} as Record<string, number>);

    const expensesByCategory = currentExpenses.reduce((acc, expense) => {
      const categoryName = expense.categoryId?.name || 'Uncategorized';
      acc[categoryName] = (acc[categoryName] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);

    // Format category breakdowns
    const incomeBreakdown = Object.entries(incomeByCategory).map(([name, value]) => ({
      name,
      value,
      percentage: totalIncome > 0 ? Math.round((value / totalIncome) * 100) : 0
    }));

    const expensesBreakdown = Object.entries(expensesByCategory).map(([name, value]) => ({
      name,
      value,
      percentage: totalExpenses > 0 ? Math.round((value / totalExpenses) * 100) : 0
    }));

    // Get recent transactions (last 10)
    const recentTransactions = [
      ...currentIncomes.map(income => ({
        id: income._id.toString(),
        type: 'income' as const,
        description: income.description,
        amount: income.amount,
        date: income.date.toISOString(),
        category: income.categoryId?.name || 'Uncategorized'
      })),
      ...currentExpenses.map(expense => ({
        id: expense._id.toString(),
        type: 'expense' as const,
        description: expense.description,
        amount: expense.amount,
        date: expense.date.toISOString(),
        category: expense.categoryId?.name || 'Uncategorized'
      })),
      ...currentSales.map(sale => ({
        id: sale._id.toString(),
        type: 'sale' as const,
        description: `Sale: ${sale.productId?.title || 'Product'} (${sale.quantity}x)`,
        amount: sale.totalAmount,
        date: sale.date.toISOString(),
        category: 'Product Sales'
      }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);

    // Get upcoming recurring payments
    const upcomingPayments = await RecurringPayment.find({
      userId: userId,
      isActive: true,
      nextPaymentDate: { $gte: now, $lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) } // Next 30 days
    }).populate('categoryId').populate('vendorId').lean();

    const formattedUpcomingPayments = upcomingPayments.map(payment => ({
      id: payment._id.toString(),
      description: payment.description,
      amount: payment.amount,
      dueDate: payment.nextPaymentDate.toISOString(),
      type: payment.type
    }));

    // Get low stock products
    const lowStockProducts = await Product.find({
      manageStock: true,
      stock: true,
      $expr: { $lte: ['$qty', '$lowStockThreshold'] }
    }).limit(10).lean();

    const formattedLowStockProducts = lowStockProducts.map(product => ({
      id: product._id.toString(),
      name: product.title,
      currentStock: product.qty,
      threshold: product.lowStockThreshold || 0
    }));

    // Generate monthly data for the last 6 months
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      const monthIncomes = await Income.find({
        userId: userId,
        date: { $gte: monthStart, $lte: monthEnd }
      }).lean();

      const monthExpenses = await Expense.find({
        userId: userId,
        date: { $gte: monthStart, $lte: monthEnd }
      }).lean();

      const monthSales = await Sale.find({
        userId: userId,
        date: { $gte: monthStart, $lte: monthEnd }
      }).lean();

      const monthIncome = monthIncomes.reduce((sum, income) => sum + income.amount, 0);
      const monthExpense = monthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
      const monthSalesTotal = monthSales.reduce((sum, sale) => sum + sale.totalAmount, 0);

      monthlyData.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'short' }),
        income: monthIncome,
        expenses: monthExpense,
        profit: monthIncome - monthExpense,
        sales: monthSalesTotal
      });
    }

    const dashboardData = {
      summary: {
        totalIncome,
        totalExpenses,
        netProfit,
        profitMargin: Math.round(profitMargin * 100) / 100,
        totalSales,
        averageSale: Math.round(averageSale * 100) / 100
      },
      previousSummary: {
        totalIncome: previousTotalIncome,
        totalExpenses: previousTotalExpenses,
        netProfit: previousNetProfit,
        totalSales: previousTotalSales
      },
      monthlyData,
      categoryBreakdown: {
        income: incomeBreakdown,
        expenses: expensesBreakdown
      },
      recentTransactions,
      upcomingPayments: formattedUpcomingPayments,
      lowStockProducts: formattedLowStockProducts
    };

    return NextResponse.json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error('Dashboard GET error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve dashboard data' } },
      { status: 500 }
    );
  }
}