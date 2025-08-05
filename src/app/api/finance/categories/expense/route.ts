import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/database/mongoose-connection';
import ExpenseCategory from '@/lib/database/models/ExpenseCategory';
import { authenticateApiRequest, createApiResponse } from '@/lib/auth/nextauth-middleware';
import { ensureDefaultCategories } from '@/lib/database/seeders/default-categories';

/**
 * GET /api/finance/categories/expense
 * Retrieves expense categories for the authenticated user
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
    const includeDefaults = searchParams.get('includeDefaults') !== 'false'; // Default to true
    const search = searchParams.get('search');

    let query: any = { userId: authResult.user.id };

    // Add search filter if provided
    if (search) {
      query.name = { $regex: new RegExp(search, 'i') };
    }

    // Get user categories
    const categories = await ExpenseCategory.find(query)
      .sort({ name: 1 })
      .lean();

    // Separate default and custom categories
    const defaultCategories = categories.filter(cat => cat.isDefault);
    const customCategories = categories.filter(cat => !cat.isDefault);

    return NextResponse.json({
      success: true,
      data: {
        categories: includeDefaults ? categories : customCategories,
        summary: {
          total: categories.length,
          default: defaultCategories.length,
          custom: customCategories.length
        }
      }
    });

  } catch (error) {
    console.error('Expense categories GET error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve expense categories' } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/finance/categories/expense
 * Creates a new expense category
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
    const { name, description } = body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Category name is required' } },
        { status: 400 }
      );
    }

    // Check for duplicate category name
    const existingCategory = await ExpenseCategory.findByNameAndUser(name.trim(), authResult.user.id);
    if (existingCategory) {
      return NextResponse.json(
        { success: false, error: { code: 'DUPLICATE_ERROR', message: 'Category name already exists' } },
        { status: 409 }
      );
    }

    // Create category
    const categoryData = {
      name: name.trim(),
      description: description?.trim() || null,
      userId: authResult.user.id,
      isDefault: false
    };

    const category = new ExpenseCategory(categoryData);
    const savedCategory = await category.save();

    return NextResponse.json({
      success: true,
      data: {
        category: savedCategory.toJSON()
      },
      message: 'Expense category created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Expense category POST error:', error);

    // Handle validation errors
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: error.message } },
        { status: 400 }
      );
    }

    // Handle duplicate key errors
    if (error instanceof Error && error.message.includes('duplicate key')) {
      return NextResponse.json(
        { success: false, error: { code: 'DUPLICATE_ERROR', message: 'Category name already exists' } },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create expense category' } },
      { status: 500 }
    );
  }
}