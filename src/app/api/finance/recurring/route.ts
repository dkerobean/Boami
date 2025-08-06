import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/database/connection';
import RecurringPayment from '@/lib/database/models/RecurringPayment';
import IncomeCategory from '@/lib/database/models/IncomeCategory';
import ExpenseCategory from '@/lib/database/models/ExpenseCategory';
import Vendor from '@/lib/database/models/Vendor';
import { verifyJWT } from '@/lib/auth/jwt';

/**
 * GET /api/finance/recurring
 * Retrieves recurring payments for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const decoded = verifyJWT(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_TOKEN', message: 'Invalid authentication token' } },
        { status: 401 }
      );
    }

    await connectDB();

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'income' or 'expense'
    const isActive = searchParams.get('isActive');
    const isDue = searchParams.get('isDue') === 'true';

    // Build query
    let query: any = { userId: decoded.userId };

    if (type && ['income', 'expense'].includes(type)) {
      query.type = type;
    }

    if (isActive !== null && isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    if (isDue) {
      query.isActive = true;
      query.nextDueDate = { $lte: new Date() };
    }

    // Get recurring payments
    const recurringPayments = await RecurringPayment.find(query)
      .sort({ nextDueDate: 1, type: 1 })
      .lean();

    // Get related categories and vendors
    const incomeCategoryIds = Array.from(new Set(recurringPayments
      .filter(rp => rp.type === 'income' && rp.categoryId)
      .map(rp => rp.categoryId)));

    const expenseCategoryIds = Array.from(new Set(recurringPayments
      .filter(rp => rp.type === 'expense' && rp.categoryId)
      .map(rp => rp.categoryId)));

    const vendorIds = Array.from(new Set(recurringPayments
      .filter(rp => rp.vendorId)
      .map(rp => rp.vendorId)));

    const [incomeCategories, expenseCategories, vendors] = await Promise.all([
      IncomeCategory.find({ _id: { $in: incomeCategoryIds } }).lean(),
      ExpenseCategory.find({ _id: { $in: expenseCategoryIds } }).lean(),
      Vendor.find({ _id: { $in: vendorIds } }).lean()
    ]);

    // Create lookup maps
    const incomeCategoryMap = incomeCategories.reduce((map, cat) => {
      map[cat._id.toString()] = cat;
      return map;
    }, {} as any);

    const expenseCategoryMap = expenseCategories.reduce((map, cat) => {
      map[cat._id.toString()] = cat;
      return map;
    }, {} as any);

    const vendorMap = vendors.reduce((map, vendor) => {
      map[vendor._id.toString()] = vendor;
      return map;
    }, {} as any);

    // Enrich recurring payments data
    const enrichedPayments = recurringPayments.map(payment => ({
      ...payment,
      category: payment.categoryId ?
        (payment.type === 'income' ? incomeCategoryMap[payment.categoryId] : expenseCategoryMap[payment.categoryId]) || null
        : null,
      vendor: payment.vendorId ? vendorMap[payment.vendorId] || null : null,
      isDue: payment.isActive && payment.nextDueDate <= new Date(),
      isExpired: payment.endDate ? payment.endDate < new Date() : false
    }));

    // Calculate summary statistics
    const summary = {
      total: enrichedPayments.length,
      active: enrichedPayments.filter(p => p.isActive).length,
      due: enrichedPayments.filter(p => p.isDue).length,
      income: enrichedPayments.filter(p => p.type === 'income').length,
      expense: enrichedPayments.filter(p => p.type === 'expense').length
    };

    return NextResponse.json({
      success: true,
      data: {
        recurringPayments: enrichedPayments,
        summary
      }
    });

  } catch (error) {
    console.error('Recurring payments GET error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve recurring payments' } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/finance/recurring
 * Creates a new recurring payment
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const decoded = verifyJWT(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_TOKEN', message: 'Invalid authentication token' } },
        { status: 401 }
      );
    }

    await connectDB();

    // Parse request body
    const body = await request.json();
    const { type, amount, description, frequency, startDate, endDate, categoryId, vendorId, isActive = true } = body;

    // Validate required fields
    if (!type || !['income', 'expense'].includes(type)) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Type must be either "income" or "expense"' } },
        { status: 400 }
      );
    }

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Amount must be a positive number' } },
        { status: 400 }
      );
    }

    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Description is required' } },
        { status: 400 }
      );
    }

    if (!frequency || !['daily', 'weekly', 'monthly', 'yearly'].includes(frequency)) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Frequency must be daily, weekly, monthly, or yearly' } },
        { status: 400 }
      );
    }

    if (!startDate) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Start date is required' } },
        { status: 400 }
      );
    }

    // Validate dates
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : null;

    if (end && end <= start) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'End date must be after start date' } },
        { status: 400 }
      );
    }

    // Validate category/vendor requirements
    if (type === 'income' && !categoryId) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Income payments must have a category' } },
        { status: 400 }
      );
    }

    if (type === 'expense' && !categoryId && !vendorId) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Expense payments must have either a category or vendor' } },
        { status: 400 }
      );
    }

    // Validate category if provided
    let category = null;
    if (categoryId) {
      const CategoryModel = type === 'income' ? IncomeCategory : ExpenseCategory;
      category = await CategoryModel.findOne({
        _id: categoryId,
        userId: decoded.userId
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
      if (type === 'income') {
        return NextResponse.json(
          { success: false, error: { code: 'VALIDATION_ERROR', message: 'Vendor cannot be specified for income payments' } },
          { status: 400 }
        );
      }

      vendor = await Vendor.findOne({
        _id: vendorId,
        userId: decoded.userId
      });

      if (!vendor) {
        return NextResponse.json(
          { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid vendor or vendor does not belong to user' } },
          { status: 400 }
        );
      }
    }

    // Create recurring payment
    const recurringPaymentData = {
      type,
      amount,
      description: description.trim(),
      frequency,
      startDate: start,
      endDate: end,
      nextDueDate: start, // Will be calculated in pre-save middleware
      isActive: Boolean(isActive),
      categoryId: categoryId || null,
      vendorId: vendorId || null,
      userId: decoded.userId
    };

    const recurringPayment = new RecurringPayment(recurringPaymentData);
    const savedPayment = await recurringPayment.save();

    // Return enriched data
    const enrichedPayment = {
      ...savedPayment.toJSON(),
      category: category?.toJSON() || null,
      vendor: vendor?.toJSON() || null,
      isDue: savedPayment.isActive && savedPayment.nextDueDate <= new Date(),
      isExpired: savedPayment.endDate ? savedPayment.endDate < new Date() : false
    };

    return NextResponse.json({
      success: true,
      data: {
        recurringPayment: enrichedPayment
      },
      message: 'Recurring payment created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Recurring payment POST error:', error);

    // Handle validation errors
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: error.message } },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create recurring payment' } },
      { status: 500 }
    );
  }
}