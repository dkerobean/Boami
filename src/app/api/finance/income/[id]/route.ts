import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/database/mongoose-connection';
import Income from '@/lib/database/models/Income';
import IncomeCategory from '@/lib/database/models/IncomeCategory';
import { verifyJWT } from '@/lib/auth/jwt';

/**
 * GET /api/finance/income/[id]
 * Retrieves a specific income record
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

    // Find income record
    const income = await Income.findOne({
      _id: params.id,
      userId: decoded.userId
    }).lean();

    if (!income) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Income record not found' } },
        { status: 404 }
      );
    }

    // Get category information
    const category = await IncomeCategory.findById(income.categoryId).lean();

    const enrichedIncome = {
      ...income,
      category: category || null
    };

    return NextResponse.json({
      success: true,
      data: {
        income: enrichedIncome
      }
    });

  } catch (error) {
    console.error('Income GET by ID error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve income record' } },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/finance/income/[id]
 * Updates a specific income record
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

    // Find existing income record
    const existingIncome = await Income.findOne({
      _id: params.id,
      userId: decoded.userId
    });

    if (!existingIncome) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Income record not found' } },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { amount, description, date, categoryId, saleId, isRecurring, recurringPaymentId } = body;

    // Validate required fields
    if (amount !== undefined && (typeof amount !== 'number' || amount <= 0)) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Amount must be a positive number' } },
        { status: 400 }
      );
    }

    // Validate category if provided
    if (categoryId && categoryId !== existingIncome.categoryId) {
      const category = await IncomeCategory.findOne({
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

    // Update fields
    if (amount !== undefined) existingIncome.amount = amount;
    if (description !== undefined) existingIncome.description = description.trim();
    if (date !== undefined) existingIncome.date = new Date(date);
    if (categoryId !== undefined) existingIncome.categoryId = categoryId;
    if (saleId !== undefined) existingIncome.saleId = saleId;
    if (isRecurring !== undefined) existingIncome.isRecurring = Boolean(isRecurring);
    if (recurringPaymentId !== undefined) existingIncome.recurringPaymentId = recurringPaymentId;

    const updatedIncome = await existingIncome.save();

    // Get category information
    const category = await IncomeCategory.findById(updatedIncome.categoryId).lean();

    const enrichedIncome = {
      ...updatedIncome.toJSON(),
      category: category || null
    };

    return NextResponse.json({
      success: true,
      data: {
        income: enrichedIncome
      },
      message: 'Income record updated successfully'
    });

  } catch (error) {
    console.error('Income PUT error:', error);

    // Handle validation errors
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: error.message } },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update income record' } },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/finance/income/[id]
 * Deletes a specific income record
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

    // Find and delete income record
    const deletedIncome = await Income.findOneAndDelete({
      _id: params.id,
      userId: decoded.userId
    });

    if (!deletedIncome) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Income record not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Income record deleted successfully',
      data: {
        deletedId: params.id
      }
    });

  } catch (error) {
    console.error('Income DELETE error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete income record' } },
      { status: 500 }
    );
  }
}