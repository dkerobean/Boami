import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/database/mongoose-connection';
import Vendor from '@/lib/database/models/Vendor';
import Expense from '@/lib/database/models/Expense';
import { authenticateRequest } from '@/lib/auth/api-auth';

/**
 * GET /api/finance/vendors
 * Retrieves vendors for the authenticated user
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
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

    let query: any = { userId: authResult.userId };

    // Add search filter if provided
    if (search) {
      query.name = { $regex: new RegExp(search, 'i') };
    }

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const [vendors, total] = await Promise.all([
      Vendor.find(query)
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Vendor.countDocuments(query)
    ]);

    // Get expense counts for each vendor
    const vendorIds = vendors.map(v => v._id.toString());
    const expenseCounts = await Expense.aggregate([
      { $match: { vendorId: { $in: vendorIds }, userId: authResult.userId } },
      { $group: { _id: '$vendorId', count: { $sum: 1 }, totalAmount: { $sum: '$amount' } } }
    ]);

    const expenseMap = expenseCounts.reduce((map, item) => {
      map[item._id] = { count: item.count, totalAmount: item.totalAmount };
      return map;
    }, {} as any);

    // Enrich vendor data with expense information
    const enrichedVendors = vendors.map(vendor => ({
      ...vendor,
      expenseStats: expenseMap[vendor._id.toString()] || { count: 0, totalAmount: 0 }
    }));

    return NextResponse.json({
      success: true,
      data: {
        vendors: enrichedVendors,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Vendors GET error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve vendors' } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/finance/vendors
 * Creates a new vendor
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
    const { name, contactEmail, contactPhone, address, notes } = body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Vendor name is required' } },
        { status: 400 }
      );
    }

    // Check for duplicate vendor name
    const existingVendor = await Vendor.findByNameAndUser(name.trim(), authResult.userId);
    if (existingVendor) {
      return NextResponse.json(
        { success: false, error: { code: 'DUPLICATE_ERROR', message: 'Vendor name already exists' } },
        { status: 409 }
      );
    }

    // Validate email format if provided
    if (contactEmail && !/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(contactEmail)) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid email format' } },
        { status: 400 }
      );
    }

    // Validate phone format if provided
    if (contactPhone && !/^[\+]?[1-9][\d]{0,15}$/.test(contactPhone)) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid phone number format' } },
        { status: 400 }
      );
    }

    // Create vendor
    const vendorData = {
      name: name.trim(),
      contactEmail: contactEmail?.trim() || null,
      contactPhone: contactPhone?.trim() || null,
      address: address?.trim() || null,
      notes: notes?.trim() || null,
      userId: authResult.userId
    };

    const vendor = new Vendor(vendorData);
    const savedVendor = await vendor.save();

    return NextResponse.json({
      success: true,
      data: {
        vendor: {
          ...savedVendor.toJSON(),
          expenseStats: { count: 0, totalAmount: 0 }
        }
      },
      message: 'Vendor created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Vendor POST error:', error);

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
        { success: false, error: { code: 'DUPLICATE_ERROR', message: 'Vendor name already exists' } },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create vendor' } },
      { status: 500 }
    );
  }
}