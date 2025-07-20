import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/database/mongoose-connection';
import Vendor from '@/lib/database/models/Vendor';
import Expense from '@/lib/database/models/Expense';
import { verifyJWT } from '@/lib/auth/jwt';

/**
 * GET /api/finance/vendors/[id]
 * Retrieves a specific vendor
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

    // Find vendor
    const vendor = await Vendor.findOne({
      _id: params.id,
      userId: decoded.userId
    }).lean();

    if (!vendor) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Vendor not found' } },
        { status: 404 }
      );
    }

    // Get expense statistics for this vendor
    const expenseStats = await Expense.aggregate([
      { $match: { vendorId: params.id, userId: decoded.userId } },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          avgAmount: { $avg: '$amount' }
        }
      }
    ]);

    const stats = expenseStats.length > 0 ? expenseStats[0] : { count: 0, totalAmount: 0, avgAmount: 0 };

    // Get recent expenses for this vendor
    const recentExpenses = await Expense.find({
      vendorId: params.id,
      userId: decoded.userId
    })
    .sort({ date: -1 })
    .limit(5)
    .lean();

    const enrichedVendor = {
      ...vendor,
      expenseStats: {
        count: stats.count,
        totalAmount: Math.round(stats.totalAmount * 100) / 100,
        averageAmount: Math.round(stats.avgAmount * 100) / 100
      },
      recentExpenses
    };

    return NextResponse.json({
      success: true,
      data: {
        vendor: enrichedVendor
      }
    });

  } catch (error) {
    console.error('Vendor GET by ID error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve vendor' } },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/finance/vendors/[id]
 * Updates a specific vendor
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

    // Find existing vendor
    const existingVendor = await Vendor.findOne({
      _id: params.id,
      userId: decoded.userId
    });

    if (!existingVendor) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Vendor not found' } },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { name, contactEmail, contactPhone, address, notes } = body;

    // Validate name if provided
    if (name !== undefined) {
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: { code: 'VALIDATION_ERROR', message: 'Vendor name cannot be empty' } },
          { status: 400 }
        );
      }

      // Check for duplicate name (excluding current vendor)
      if (name.trim() !== existingVendor.name) {
        const duplicateVendor = await Vendor.findByNameAndUser(name.trim(), decoded.userId);
        if (duplicateVendor && (duplicateVendor._id as any).toString() !== params.id) {
          return NextResponse.json(
            { success: false, error: { code: 'DUPLICATE_ERROR', message: 'Vendor name already exists' } },
            { status: 409 }
          );
        }
      }
    }

    // Validate email format if provided
    if (contactEmail !== undefined && contactEmail && !/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(contactEmail)) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid email format' } },
        { status: 400 }
      );
    }

    // Validate phone format if provided
    if (contactPhone !== undefined && contactPhone && !/^[\+]?[1-9][\d]{0,15}$/.test(contactPhone)) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid phone number format' } },
        { status: 400 }
      );
    }

    // Update fields
    if (name !== undefined) existingVendor.name = name.trim();
    if (contactEmail !== undefined) existingVendor.contactEmail = contactEmail?.trim() || null;
    if (contactPhone !== undefined) existingVendor.contactPhone = contactPhone?.trim() || null;
    if (address !== undefined) existingVendor.address = address?.trim() || null;
    if (notes !== undefined) existingVendor.notes = notes?.trim() || null;

    const updatedVendor = await existingVendor.save();

    // Get expense statistics
    const expenseStats = await Expense.aggregate([
      { $match: { vendorId: params.id, userId: decoded.userId } },
      { $group: { _id: null, count: { $sum: 1 }, totalAmount: { $sum: '$amount' } } }
    ]);

    const stats = expenseStats.length > 0 ? expenseStats[0] : { count: 0, totalAmount: 0 };

    const enrichedVendor = {
      ...updatedVendor.toJSON(),
      expenseStats: {
        count: stats.count,
        totalAmount: Math.round(stats.totalAmount * 100) / 100
      }
    };

    return NextResponse.json({
      success: true,
      data: {
        vendor: enrichedVendor
      },
      message: 'Vendor updated successfully'
    });

  } catch (error) {
    console.error('Vendor PUT error:', error);

    // Handle validation errors
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: error.message } },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update vendor' } },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/finance/vendors/[id]
 * Deletes a specific vendor (with dependency check)
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

    // Find vendor
    const vendor = await Vendor.findOne({
      _id: params.id,
      userId: decoded.userId
    });

    if (!vendor) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Vendor not found' } },
        { status: 404 }
      );
    }

    // Check for dependent expenses
    const expenseCount = await Expense.countDocuments({
      vendorId: params.id,
      userId: decoded.userId
    });

    if (expenseCount > 0) {
      return NextResponse.json(
        { success: false, error: { code: 'DEPENDENCY_ERROR', message: `Cannot delete vendor. ${expenseCount} expense record(s) are associated with this vendor.` } },
        { status: 409 }
      );
    }

    // Delete the vendor
    await Vendor.findByIdAndDelete(params.id);

    return NextResponse.json({
      success: true,
      message: 'Vendor deleted successfully',
      data: {
        deletedId: params.id
      }
    });

  } catch (error) {
    console.error('Vendor DELETE error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete vendor' } },
      { status: 500 }
    );
  }
}