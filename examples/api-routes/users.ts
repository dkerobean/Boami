import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../database/mongoose-connection';
import User, { IUser } from '../database/user-schema';
import * as yup from 'yup';

/**
 * Example API routes for user management
 * Demonstrates RESTful CRUD operations with proper error handling
 * File: app/api/users/route.ts
 */

/**
 * Validation schema for user creation
 */
const createUserSchema = yup.object({
  email: yup.string().email('Invalid email format').required('Email is required'),
  password: yup.string().min(8, 'Password must be at least 8 characters').required('Password is required'),
  firstName: yup.string().max(50, 'First name too long').required('First name is required'),
  lastName: yup.string().max(50, 'Last name too long').required('Last name is required'),
  role: yup.string().oneOf(['admin', 'user', 'manager'], 'Invalid role').optional()
});

/**
 * Validation schema for user updates
 */
const updateUserSchema = yup.object({
  email: yup.string().email('Invalid email format').optional(),
  firstName: yup.string().max(50, 'First name too long').optional(),
  lastName: yup.string().max(50, 'Last name too long').optional(),
  role: yup.string().oneOf(['admin', 'user', 'manager'], 'Invalid role').optional(),
  isActive: yup.boolean().optional()
});

/**
 * GET /api/users - Retrieve all users with pagination and filtering
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const role = searchParams.get('role');
    const isActive = searchParams.get('isActive');
    const search = searchParams.get('search');
    
    // Build filter object
    const filter: any = {};
    if (role) filter.role = role;
    if (isActive !== null) filter.isActive = isActive === 'true';
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Execute queries in parallel for better performance
    const [users, totalCount] = await Promise.all([
      User.find(filter)
        .select('-password') // Exclude password from response
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(), // Use lean() for better performance when not needing document methods
      User.countDocuments(filter)
    ]);
    
    const totalPages = Math.ceil(totalCount / limit);
    
    return NextResponse.json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    }, { status: 200 });
    
  } catch (error) {
    console.error('GET /api/users error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch users'
    }, { status: 500 });
  }
}

/**
 * POST /api/users - Create a new user
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await connectDB();
    
    const body = await request.json();
    
    // Validate request data
    try {
      await createUserSchema.validate(body);
    } catch (validationError) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: (validationError as yup.ValidationError).errors
      }, { status: 400 });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ email: body.email });
    if (existingUser) {
      return NextResponse.json({
        success: false,
        error: 'User with this email already exists'
      }, { status: 409 });
    }
    
    // Create new user
    const userData: Partial<IUser> = {
      email: body.email,
      password: body.password,
      firstName: body.firstName,
      lastName: body.lastName,
      role: body.role || 'user'
    };
    
    const user = await User.create(userData);
    
    // Remove password from response
    const userResponse = user.toObject();
    delete (userResponse as any).password;
    
    return NextResponse.json({
      success: true,
      data: { user: userResponse },
      message: 'User created successfully'
    }, { status: 201 });
    
  } catch (error) {
    console.error('POST /api/users error:', error);
    
    // Handle duplicate key error
    if ((error as any).code === 11000) {
      return NextResponse.json({
        success: false,
        error: 'User with this email already exists'
      }, { status: 409 });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to create user'
    }, { status: 500 });
  }
}

/**
 * GET /api/users/[id] - Retrieve a specific user by ID
 * File: app/api/users/[id]/route.ts
 */
export async function getUserById(request: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
  try {
    await connectDB();
    
    const { id } = params;
    
    // Validate ObjectId format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid user ID format'
      }, { status: 400 });
    }
    
    const user = await User.findById(id).select('-password');
    
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      data: { user }
    }, { status: 200 });
    
  } catch (error) {
    console.error(`GET /api/users/${params.id} error:`, error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch user'
    }, { status: 500 });
  }
}

/**
 * PATCH /api/users/[id] - Update a specific user
 * File: app/api/users/[id]/route.ts
 */
export async function updateUserById(request: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
  try {
    await connectDB();
    
    const { id } = params;
    const body = await request.json();
    
    // Validate ObjectId format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid user ID format'
      }, { status: 400 });
    }
    
    // Validate request data
    try {
      await updateUserSchema.validate(body);
    } catch (validationError) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: (validationError as yup.ValidationError).errors
      }, { status: 400 });
    }
    
    // Check if email is being updated and if it already exists
    if (body.email) {
      const existingUser = await User.findOne({ 
        email: body.email, 
        _id: { $ne: id } 
      });
      if (existingUser) {
        return NextResponse.json({
          success: false,
          error: 'User with this email already exists'
        }, { status: 409 });
      }
    }
    
    const user = await User.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      data: { user },
      message: 'User updated successfully'
    }, { status: 200 });
    
  } catch (error) {
    console.error(`PATCH /api/users/${params.id} error:`, error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update user'
    }, { status: 500 });
  }
}

/**
 * DELETE /api/users/[id] - Delete a specific user (soft delete)
 * File: app/api/users/[id]/route.ts
 */
export async function deleteUserById(request: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
  try {
    await connectDB();
    
    const { id } = params;
    
    // Validate ObjectId format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid user ID format'
      }, { status: 400 });
    }
    
    // Soft delete by setting isActive to false
    const user = await User.findByIdAndUpdate(
      id,
      { $set: { isActive: false } },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      data: { user },
      message: 'User deactivated successfully'
    }, { status: 200 });
    
  } catch (error) {
    console.error(`DELETE /api/users/${params.id} error:`, error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete user'
    }, { status: 500 });
  }
}

/**
 * GET /api/users/search - Advanced user search
 * File: app/api/users/search/route.ts
 */
export async function searchUsers(request: NextRequest): Promise<NextResponse> {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const role = searchParams.get('role');
    const limit = parseInt(searchParams.get('limit') || '20');
    
    if (!query || query.length < 2) {
      return NextResponse.json({
        success: false,
        error: 'Search query must be at least 2 characters long'
      }, { status: 400 });
    }
    
    // Build aggregation pipeline for advanced search
    const pipeline: any[] = [
      {
        $match: {
          $and: [
            { isActive: true },
            ...(role ? [{ role }] : []),
            {
              $or: [
                { firstName: { $regex: query, $options: 'i' } },
                { lastName: { $regex: query, $options: 'i' } },
                { email: { $regex: query, $options: 'i' } }
              ]
            }
          ]
        }
      },
      {
        $addFields: {
          fullName: { $concat: ['$firstName', ' ', '$lastName'] },
          searchScore: {
            $sum: [
              { $cond: [{ $regexMatch: { input: '$firstName', regex: query, options: 'i' } }, 3, 0] },
              { $cond: [{ $regexMatch: { input: '$lastName', regex: query, options: 'i' } }, 3, 0] },
              { $cond: [{ $regexMatch: { input: '$email', regex: query, options: 'i' } }, 2, 0] }
            ]
          }
        }
      },
      {
        $project: {
          password: 0,
          __v: 0
        }
      },
      {
        $sort: { searchScore: -1, createdAt: -1 }
      },
      {
        $limit: limit
      }
    ];
    
    const users = await User.aggregate(pipeline);
    
    return NextResponse.json({
      success: true,
      data: { 
        users,
        query,
        count: users.length
      }
    }, { status: 200 });
    
  } catch (error) {
    console.error('GET /api/users/search error:', error);
    return NextResponse.json({
      success: false,
      error: 'Search failed'
    }, { status: 500 });
  }
}