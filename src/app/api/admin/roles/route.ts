import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/database/connection';
import { Role, Permission } from '@/lib/database/models';

/**
 * GET /api/admin/roles
 * Get all roles with pagination and filtering
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type'); // 'system' or 'custom'

    // Build query
    const query: any = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (type === 'system') {
      query.isSystemRole = true;
    } else if (type === 'custom') {
      query.isSystemRole = false;
    }

    // Get total count for pagination
    const totalCount = await Role.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limit);
    const skip = (page - 1) * limit;

    // Get roles with user count
    const roles = await Role.aggregate([
      { $match: query },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: 'role',
          as: 'users'
        }
      },
      {
        $addFields: {
          userCount: { $size: '$users' }
        }
      },
      {
        $project: {
          users: 0 // Remove the users array, keep only the count
        }
      },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit }
    ]);

    return NextResponse.json({
      success: true,
      data: {
        roles,
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
    console.error('Get roles error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch roles'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/roles
 * Create a new role
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { name, description, permissions } = body;

    // Validate required fields
    if (!name || !description) {
      return NextResponse.json(
        {
          success: false,
          error: 'Name and description are required'
        },
        { status: 400 }
      );
    }

    // Check if role name already exists
    const existingRole = await Role.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existingRole) {
      return NextResponse.json(
        {
          success: false,
          error: 'A role with this name already exists'
        },
        { status: 409 }
      );
    }

    // Validate permissions exist
    if (permissions && permissions.length > 0) {
      const validPermissions = await Permission.find({ _id: { $in: permissions } });
      if (validPermissions.length !== permissions.length) {
        return NextResponse.json(
          {
            success: false,
            error: 'One or more permissions are invalid'
          },
          { status: 400 }
        );
      }
    }

    // Create role
    const role = new Role({
      name,
      description,
      permissions: permissions || [],
      isSystemRole: false
    });

    await role.save();

    // Populate permissions for response
    await role.populate('permissions');

    return NextResponse.json({
      success: true,
      data: role,
      message: 'Role created successfully'
    }, { status: 201 });

  } catch (error: any) {
    console.error('Create role error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create role'
      },
      { status: 500 }
    );
  }
}