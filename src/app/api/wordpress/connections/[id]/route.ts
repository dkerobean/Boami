import { NextRequest, NextResponse } from 'next/server';
import * as yup from 'yup';
import { connectToDatabase } from '@/lib/database/connection';
import WordPressConnection from '@/lib/database/models/WordPressConnection';

// Validation schema for updates
const wordpressConnectionUpdateSchema = yup.object({
  name: yup.string().max(100),
  siteUrl: yup.string().url('Please enter a valid URL'),
  consumerKey: yup.string(),
  consumerSecret: yup.string(),
  version: yup.string().oneOf(['wc/v3', 'wc/v2', 'wc/v1', 'wp/v2']),
  isWooCommerce: yup.boolean(),
  isActive: yup.boolean(),
  syncSettings: yup.object({
    autoSync: yup.boolean(),
    syncInterval: yup.number().min(5).max(1440),
    syncCategories: yup.boolean(),
    syncImages: yup.boolean(),
    syncVariations: yup.boolean(),
    importOnlyPublished: yup.boolean(),
    updateExisting: yup.boolean()
  })
});

interface RouteParams {
  params: { id: string }
}

/**
 * GET /api/wordpress/connections/[id] - Get a specific WordPress connection
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await connectToDatabase();

    const { id } = params;

    if (!id || typeof id !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Connection ID is required'
      }, { status: 400 });
    }

    const connection = await WordPressConnection.findById(id)
      .select('+consumerKey +consumerSecret'); // Include credentials for editing

    if (!connection) {
      return NextResponse.json({
        success: false,
        error: 'WordPress connection not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: connection
    });

  } catch (error) {
    console.error('WordPress connection GET error:', error);

    // Handle invalid ObjectId
    if (error && typeof error === 'object' && 'name' in error && error.name === 'CastError') {
      return NextResponse.json({
        success: false,
        error: 'Invalid connection ID'
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to fetch WordPress connection'
    }, { status: 500 });
  }
}

/**
 * PUT /api/wordpress/connections/[id] - Update a WordPress connection
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await connectToDatabase();

    const { id } = params;

    if (!id || typeof id !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Connection ID is required'
      }, { status: 400 });
    }

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid JSON in request body'
      }, { status: 400 });
    }

    // Validate request body
    let validatedData: any;
    try {
      validatedData = await wordpressConnectionUpdateSchema.validate(body);
    } catch (validationError) {
      return NextResponse.json({
        success: false,
        error: 'Validation error',
        details: validationError instanceof yup.ValidationError ? validationError.errors : [validationError]
      }, { status: 400 });
    }

    // Find existing connection
    const existingConnection = await WordPressConnection.findById(id)
      .select('+consumerKey +consumerSecret');

    if (!existingConnection) {
      return NextResponse.json({
        success: false,
        error: 'WordPress connection not found'
      }, { status: 404 });
    }

    // Check if URL is being changed and conflicts with another connection
    if (validatedData.siteUrl && validatedData.siteUrl !== existingConnection.siteUrl) {
      const conflictingConnection = await WordPressConnection.findByUrl(validatedData.siteUrl);
      if (conflictingConnection && conflictingConnection._id.toString() !== id) {
        return NextResponse.json({
          success: false,
          error: 'Another connection with this site URL already exists'
        }, { status: 409 });
      }
    }

    // Update the connection
    const updateData = {
      ...validatedData,
      updatedBy: 'system', // TODO: Get from JWT token
      updatedAt: new Date()
    };

    // If credentials are being updated, clear test results
    if (validatedData.consumerKey || validatedData.consumerSecret || validatedData.siteUrl || validatedData.version) {
      updateData.testResult = {
        success: false,
        message: 'Credentials updated - connection needs to be tested',
        testedAt: new Date()
      };
      updateData.lastTestDate = null;
    }

    const updatedConnection = await WordPressConnection.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    return NextResponse.json({
      success: true,
      message: 'WordPress connection updated successfully',
      data: updatedConnection
    });

  } catch (error) {
    console.error('WordPress connection update error:', error);

    if (error instanceof yup.ValidationError) {
      return NextResponse.json({
        success: false,
        error: 'Validation error',
        details: error.errors
      }, { status: 400 });
    }

    // Handle invalid ObjectId
    if (error && typeof error === 'object' && 'name' in error && error.name === 'CastError') {
      return NextResponse.json({
        success: false,
        error: 'Invalid connection ID'
      }, { status: 400 });
    }

    // Handle mongoose validation errors
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ValidationError') {
      return NextResponse.json({
        success: false,
        error: 'Database validation error',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      }, { status: 400 });
    }

    // Handle duplicate key errors
    if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
      return NextResponse.json({
        success: false,
        error: 'Another connection with this site URL already exists'
      }, { status: 409 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to update WordPress connection'
    }, { status: 500 });
  }
}

/**
 * DELETE /api/wordpress/connections/[id] - Delete a WordPress connection
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await connectToDatabase();

    const { id } = params;

    if (!id || typeof id !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Connection ID is required'
      }, { status: 400 });
    }

    // Find and delete the connection
    const deletedConnection = await WordPressConnection.findByIdAndDelete(id);

    if (!deletedConnection) {
      return NextResponse.json({
        success: false,
        error: 'WordPress connection not found'
      }, { status: 404 });
    }

    // TODO: Clean up related import jobs
    // This could be done in a background job or here
    // await WordPressImportJob.deleteMany({ connectionId: id });

    return NextResponse.json({
      success: true,
      message: 'WordPress connection deleted successfully',
      data: { id: deletedConnection._id }
    });

  } catch (error) {
    console.error('WordPress connection delete error:', error);

    // Handle invalid ObjectId
    if (error && typeof error === 'object' && 'name' in error && error.name === 'CastError') {
      return NextResponse.json({
        success: false,
        error: 'Invalid connection ID'
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to delete WordPress connection'
    }, { status: 500 });
  }
}