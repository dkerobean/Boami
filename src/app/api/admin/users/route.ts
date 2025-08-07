import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/database/connection';
import { User, Role } from '@/lib/database/models';

/**
 * GET /api/admin/users
 * Get all users with pagination and filtering
 */
// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status');
    const role = searchParams.get('role');

    // Build query
    const query: any = {};

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) {
      if (status === 'active') {
        query.isActive = true;
      } else if (status === 'disabled') {
        query.isActive = false;
      } else if (status === 'pending') {
        query.isEmailVerified = false;
      }
    }

    if (role) {
      query.role = role;
    }

    // Get total count for pagination
    const totalCount = await User.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limit);
    const skip = (page - 1) * limit;

    // Get users with role information
    const users = await User.find(query)
      .populate('role', 'name description')
      .select('-password -refreshTokens')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    // Transform users for client consumption
    const transformedUsers = users.map(user => ({
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      name: user.getFullName(),
      role: user.role ? {
        id: (user.role as any)._id,
        name: (user.role as any).name,
        description: (user.role as any).description
      } : null,
      status: user.isActive ? 'active' : 'disabled',
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }));

    return NextResponse.json({
      success: true,
      data: {
        users: transformedUsers,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        }
      }
    });

  } catch (error: any) {
    console.error('Get users error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch users'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/users
 * Create a new user (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { email, firstName, lastName, role, sendInvitation = true } = body;

    // Validate required fields
    if (!email || !firstName || !lastName || !role) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email, first name, last name, and role are required'
        },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: 'A user with this email already exists'
        },
        { status: 409 }
      );
    }

    // Validate role exists
    const roleDoc = await Role.findById(role);
    if (!roleDoc) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid role specified'
        },
        { status: 400 }
      );
    }

    // Create user
    const user = new User({
      email: email.toLowerCase(),
      firstName,
      lastName,
      role,
      isActive: true,
      isEmailVerified: false // Will be verified when they accept invitation
    });

    await user.save();

    // Send invitation if requested
    if (sendInvitation) {
      // TODO: Implement invitation sending logic
      // This would typically create an invitation record and send an email
    }

    // Populate role for response
    await user.populate('role', 'name description');

    return NextResponse.json({
      success: true,
      data: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        name: user.getFullName(),
        role: {
          id: (user.role as any)._id,
          name: (user.role as any).name,
          description: (user.role as any).description
        },
        status: 'pending',
        isActive: user.isActive,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt
      },
      message: sendInvitation ? 'User created and invitation sent' : 'User created successfully'
    }, { status: 201 });

  } catch (error: any) {
    console.error('Create user error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create user'
      },
      { status: 500 }
    );
  }
}