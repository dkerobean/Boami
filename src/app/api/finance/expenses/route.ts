import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/database/mongoose-connection';
import Expense from '@/lib/database/models/Expense';
import ExpenseCategory from '@/lib/database/models/ExpenseCategory';
import Vendor from '@/lib/database/models/Vendor';
import { authenticateApiRequest, createApiResponse } from '@/lib/auth/nextauth-middleware';
import { ensureDefaultCategories } from '@/lib/database/seeders/default-categories';

/**
 * GET /api/finance/expenses
 * Retrieves expense records for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await authenticateApiRequest(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: authResult.error || { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    await connectDB();

    // Ensure default categories exist for this user
    await ensureDefaultCategories(authResult.user.id);

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const categoryId = searchParams.get('categoryId');
    const vendorId = searchParams.get('vendorId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const isRecurring = searchParams.get('isRecurring');

    // Build query
    const query: any = { userId: authResult.user.id };

    if (categoryId) {
      query.categoryId = categoryId;
    }

    if (vendorId) {
      query.vendorId = vendorId;
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    if (isRecurring !== null && isRecurring !== undefined) {
      query.isRecurring = isRecurring === 'true';
    }

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const [expenses, total] = await Promise.all([
      Expense.find(query)
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Expense.countDocuments(query)
    ]);

    // Get category and vendor information
    const categoryIds = Array.from(new Set(expenses.filter(e => e.categoryId).map(e => e.categoryId)));
    const vendorIds = Array.from(new Set(expenses.filter(e => e.vendorId).map(e => e.vendorId)));

    const [categories, vendors] = await Promise.all([
      ExpenseCategory.find({ _id: { $in: categoryIds } }).lean(),
      Vendor.find({ _id: { $in: vendorIds } }).lean()
    ]);

    const categoryMap = categories.reduce((map, cat) => {
      map[cat._id.toString()] = cat;
      return map;
    }, {} as any);

    const vendorMap = vendors.reduce((map, vendor) => {
      map[vendor._id.toString()] = vendor;
      return map;
    }, {} as any);

    // Enrich expense data
    const enrichedExpenses = expenses.map(expense => ({
      ...expense,
      category: expense.categoryId ? categoryMap[expense.categoryId] || null : null,
      vendor: expense.vendorId ? vendorMap[expense.vendorId] || null : null
    }));

    // Calculate totals
    const totalAmount = await Expense.getTotalByUser(authResult.user.id);

    return NextResponse.json({
      success: true,
      data: {
        expenses: enrichedExpenses,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        summary: {
          totalAmount,
          count: total
        }
      }
    });

  } catch (error) {
    console.error('Expense GET error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve expense records' } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/finance/expenses
 * Creates a new expense record
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await authenticateApiRequest(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: authResult.error || { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    await connectDB();

    // Parse request body
    const body = await request.json();
    const { amount, description, date, categoryId, vendorId, isRecurring, recurringPaymentId } = body;

    // Validate required fields
    if (!amount || !description) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Amount and description are required' } },
        { status: 400 }
      );
    }

    // Validate that either category or vendor is provided
    if (!categoryId && !vendorId) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Either category or vendor must be specified' } },
        { status: 400 }
      );
    }

    // Validate amount
    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Amount must be a positive number' } },
        { status: 400 }
      );
    }

    // Validate category if provided
    let category = null;
    if (categoryId) {
      category = await ExpenseCategory.findOne({
        _id: categoryId,
        userId: authResult.user.id
      });

      if (!category) {
        return NextResponse.json(
          { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid category or category does not belong to user' } },
          { status: 400 }
        );
      }
    }

    // Validate vendor if provided
    let vendor = null;
    if (vendorId) {
      vendor = await Vendor.findOne({
        _id: vendorId,
        userId: authResult.user.id
      });

      if (!vendor) {
        return NextResponse.json(
          { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid vendor or vendor does not belong to user' } },
          { status: 400 }
        );
      }
    }

    // Create expense record
    const expenseData = {
      amount,
      description: description.trim(),
      date: date ? new Date(date) : new Date(),
      categoryId: categoryId || null,
      vendorId: vendorId || null,
      isRecurring: Boolean(isRecurring),
      recurringPaymentId: recurringPaymentId || null,
      userId: authResult.user.id
    };

    const expense = new Expense(expenseData);
    const savedExpense = await expense.save();

    // Return the created expense with enriched data
    const enrichedExpense = {
      ...savedExpense.toJSON(),
      category: category?.toJSON() || null,
      vendor: vendor?.toJSON() || null
    };

    return NextResponse.json({
      success: true,
      data: {
        expense: enrichedExpense
      },
      message: 'Expense record created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Expense POST error:', error);

    // Handle validation errors
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: error.message } },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create expense record' } },
      { status: 500 }
    );
  }
}