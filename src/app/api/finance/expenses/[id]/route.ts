import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/database/mongoose-connection';
import Expense from '@/lib/database/models/Expense';
import ExpenseCategory from '@/lib/database/models/ExpenseCategory';
import Vendor from '@/lib/database/models/Vendor';
import { verifyJWT } from '@/lib/auth/jwt';

/**
 * GET /api/finance/expenses/[id]
 * Retrieves a specific expense record
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Find expense record
    const expense = await Expense.findOne({
      _id: params.id,
      userId: decoded.userId
    }).lean();

    if (!expense) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Expense record not found' } },
        { status: 404 }
      );
    }

    // Get category and vendor information
    const [category, vendor] = await Promise.all([
      expense.categoryId ? ExpenseCategory.findById(expense.categoryId).lean() : null,
      expense.vendorId ? Vendor.findById(expense.vendorId).lean() : null
    ]);

    const enrichedExpense = {
      ...expense,
      category: category || null,
      vendor: vendor || null
    };

    return NextResponse.json({
      success: true,
      data: {
        expense: enrichedExpense
      }
    });

  } catch (error) {
    console.error('Expense GET by ID error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve expense record' } },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/finance/expenses/[id]
 * Updates a specific expense record
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Find existing expense record
    const existingExpense = await Expense.findOne({
      _id: params.id,
      userId: decoded.userId
    });

    if (!existingExpense) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Expense record not found' } },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { amount, description, date, categoryId, vendorId, isRecurring, recurringPaymentId } = body;

    // Validate amount if provided
    if (amount !== undefined && (typeof amount !== 'number' || amount <= 0)) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Amount must be a positive number' } },
        { status: 400 }
      );
    }

    // Validate category if provided
    let category = null;
    if (categoryId && categoryId !== existingExpense.categoryId) {
      category = await ExpenseCategory.findOne({
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
    if (vendorId && vendorId !== existingExpense.vendorId) {
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

    // Update fields
    if (amount !== undefined) existingExpense.amount = amount;
    if (description !== undefined) existingExpense.description = description.trim();
    if (date !== undefined) existingExpense.date = new Date(date);
    if (categoryId !== undefined) existingExpense.categoryId = categoryId;
    if (vendorId !== undefined) existingExpense.vendorId = vendorId;
    if (isRecurring !== undefined) existingExpense.isRecurring = Boolean(isRecurring);
    if (recurringPaymentId !== undefined) existingExpense.recurringPaymentId = recurringPaymentId;

    const updatedExpense = await existingExpense.save();

    // Get enriched data for response
    const [finalCategory, finalVendor] = await Promise.all([
      updatedExpense.categoryId ? ExpenseCategory.findById(updatedExpense.categoryId).lean() : null,
      updatedExpense.vendorId ? Vendor.findById(updatedExpense.vendorId).lean() : null
    ]);

    const enrichedExpense = {
      ...updatedExpense.toJSON(),
      category: finalCategory || null,
      vendor: finalVendor || null
    };

    return NextResponse.json({
      success: true,
      data: {
        expense: enrichedExpense
      },
      message: 'Expense record updated successfully'
    });

  } catch (error) {
    console.error('Expense PUT error:', error);

    // Handle validation errors
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: error.message } },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update expense record' } },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/finance/expenses/[id]
 * Deletes a specific expense record
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Find and delete expense record
    const deletedExpense = await Expense.findOneAndDelete({
      _id: params.id,
      userId: decoded.userId
    });

    if (!deletedExpense) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Expense record not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Expense record deleted successfully',
      data: {
        deletedId: params.id
      }
    });

  } catch (error) {
    console.error('Expense DELETE error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete expense record' } },
      { status: 500 }
    );
  }
}