import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/database/mongoose-connection';
import Income from '@/lib/database/models/Income';
import IncomeCategory from '@/lib/database/models/IncomeCategory';
import { authenticateRequest } from '@/lib/auth/api-auth';

/**
 * GET /api/finance/income
 * Retrieves income records for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await authenticateRequest(request);
    if (!authResult.success || !authResult.userId) {
      return NextResponse.json(
        { success: false, error: authResult.error || { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    await connectDB();

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100); // Max 100 items
    const categoryId = searchParams.get('categoryId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const isRecurring = searchParams.get('isRecurring');

    // Build query
    const query: any = { userId: authResult.userId };

    if (categoryId) {
      query.categoryId = categoryId;
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
    const [incomes, total] = await Promise.all([
      Income.find(query)
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Income.countDocuments(query)
    ]);

    // Get category information for the incomes
    const categoryIds = Array.from(new Set(incomes.map(income => income.categoryId)));
    const categories = await IncomeCategory.find({
      _id: { $in: categoryIds }
    }).lean();

    const categoryMap = categories.reduce((map, cat) => {
      map[cat._id.toString()] = cat;
      return map;
    }, {} as any);

    // Enrich income data with category information
    const enrichedIncomes = incomes.map(income => ({
      ...income,
      categoryId: categoryMap[income.categoryId] || { _id: income.categoryId, name: 'Unknown Category', isDefault: false }
    }));

    // Calculate totals
    const totalAmount = await Income.getTotalByUser(authResult.userId);

    return NextResponse.json({
      success: true,
      data: {
        incomes: enrichedIncomes,
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
    console.error('Income GET error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve income records' } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/finance/income
 * Creates a new income record
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await authenticateRequest(request);
    if (!authResult.success || !authResult.userId) {
      return NextResponse.json(
        { success: false, error: authResult.error || { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    await connectDB();

    // Parse request body
    const body = await request.json();
    const { amount, description, date, categoryId, saleId, isRecurring, recurringPaymentId } = body;

    // Validate required fields
    if (!amount || !description || !categoryId) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Amount, description, and category are required' } },
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

    // Validate category exists and belongs to user
    const category = await IncomeCategory.findOne({
      _id: categoryId,
      userId: authResult.userId
    });

    if (!category) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid category or category does not belong to user' } },
        { status: 400 }
      );
    }

    // Create income record
    const incomeData = {
      amount,
      description: description.trim(),
      date: date ? new Date(date) : new Date(),
      categoryId,
      saleId: saleId || null,
      isRecurring: Boolean(isRecurring),
      recurringPaymentId: recurringPaymentId || null,
      userId: authResult.userId
    };

    const income = new Income(incomeData);
    const savedIncome = await income.save();

    // Return the created income with category information
    const enrichedIncome = {
      ...savedIncome.toJSON(),
      category: category.toJSON()
    };

    return NextResponse.json({
      success: true,
      data: {
        income: enrichedIncome
      },
      message: 'Income record created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Income POST error:', error);

    // Handle validation errors
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: error.message } },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create income record' } },
      { status: 500 }
    );
  }
}