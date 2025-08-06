import { NextRequest, NextResponse } from 'next/server';
import * as yup from 'yup';
import { connectToDatabase } from '@/lib/database/connection';
import WordPressConnection from '@/lib/database/models/WordPressConnection';

// Validation schemas
const wordpressConnectionCreateSchema = yup.object({
  name: yup.string().required('Connection name is required').max(100),
  siteUrl: yup.string().required('Site URL is required').url('Please enter a valid URL'),
  consumerKey: yup.string().required('Consumer key is required'),
  consumerSecret: yup.string().required('Consumer secret is required'),
  version: yup.string().oneOf(['wc/v3', 'wc/v2', 'wc/v1', 'wp/v2']).default('wc/v3'),
  isWooCommerce: yup.boolean().default(true),
  isActive: yup.boolean().default(true),
  syncSettings: yup.object({
    autoSync: yup.boolean().default(false),
    syncInterval: yup.number().min(5).max(1440).default(60),
    syncCategories: yup.boolean().default(true),
    syncImages: yup.boolean().default(true),
    syncVariations: yup.boolean().default(true),
    importOnlyPublished: yup.boolean().default(true),
    updateExisting: yup.boolean().default(true)
  }).default({})
});

const connectionListSchema = yup.object({
  page: yup.number().min(1).default(1),
  limit: yup.number().min(1).max(50).default(10),
  search: yup.string(),
  isActive: yup.boolean(),
  sortBy: yup.string().oneOf(['name', 'siteUrl', 'createdAt', 'lastTestDate', 'lastSyncDate']).default('createdAt'),
  sortOrder: yup.string().oneOf(['asc', 'desc']).default('desc')
});

/**
 * GET /api/wordpress/connections - List WordPress connections with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams.entries());

    // Parse boolean parameters
    if (params.isActive) {
      (params as any).isActive = params.isActive === 'true';
    }

    // Validate query parameters
    const validatedParams = await connectionListSchema.validate(params);

    // Build MongoDB query
    const query: any = {};

    if (validatedParams.search) {
      query.$or = [
        { name: { $regex: validatedParams.search, $options: 'i' } },
        { siteUrl: { $regex: validatedParams.search, $options: 'i' } }
      ];
    }

    if (validatedParams.isActive !== undefined) {
      query.isActive = validatedParams.isActive;
    }

    // Build sort object
    const sort: any = {};
    sort[validatedParams.sortBy] = validatedParams.sortOrder === 'asc' ? 1 : -1;

    // Calculate pagination
    const skip = (validatedParams.page - 1) * validatedParams.limit;

    // Execute query
    const [connections, total] = await Promise.all([
      WordPressConnection.find(query)
        .sort(sort)
        .skip(skip)
        .limit(validatedParams.limit)
        .lean(),
      WordPressConnection.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / validatedParams.limit);

    return NextResponse.json({
      success: true,
      data: {
        connections,
        pagination: {
          page: validatedParams.page,
          limit: validatedParams.limit,
          total,
          totalPages
        },
        filters: {
          search: validatedParams.search,
          isActive: validatedParams.isActive
        },
        sort: {
          field: validatedParams.sortBy,
          direction: validatedParams.sortOrder
        }
      }
    });

  } catch (error) {
    console.error('WordPress connections GET error:', error);

    if (error instanceof yup.ValidationError) {
      return NextResponse.json({
        success: false,
        error: 'Validation error',
        details: error.errors
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to fetch WordPress connections'
    }, { status: 500 });
  }
}

/**
 * POST /api/wordpress/connections - Create new WordPress connection
 */
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

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
      validatedData = await wordpressConnectionCreateSchema.validate(body);
    } catch (validationError) {
      return NextResponse.json({
        success: false,
        error: 'Validation error',
        details: validationError instanceof yup.ValidationError ? validationError.errors : [validationError]
      }, { status: 400 });
    }

    // Check if connection with same URL already exists
    const existingConnection = await WordPressConnection.findByUrl(validatedData.siteUrl);
    if (existingConnection) {
      return NextResponse.json({
        success: false,
        error: 'A connection with this site URL already exists'
      }, { status: 409 });
    }

    // Create new connection
    const connectionData = {
      ...validatedData,
      createdBy: 'system', // TODO: Get from JWT token
      importStats: {
        totalProducts: 0,
        lastImportCount: 0,
        totalSynced: 0,
        totalErrors: 0
      },
      testResult: {
        success: false,
        message: 'Not tested',
        testedAt: new Date()
      }
    };

    const connection = new WordPressConnection(connectionData);
    await connection.save();

    return NextResponse.json({
      success: true,
      message: 'WordPress connection created successfully',
      data: connection
    }, { status: 201 });

  } catch (error) {
    console.error('WordPress connection creation error:', error);

    if (error instanceof yup.ValidationError) {
      return NextResponse.json({
        success: false,
        error: 'Validation error',
        details: error.errors
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
        error: 'A connection with this site URL already exists'
      }, { status: 409 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to create WordPress connection'
    }, { status: 500 });
  }
}