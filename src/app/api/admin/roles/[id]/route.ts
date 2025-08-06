import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/database/connection';
import { Role, Permission, User } from '@/lib/database/models';
import { Types } from 'mongoose';

/**
 * GET /api/admin/roles/[id]
 * Get a specific role by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    if (!Types.ObjectId.isValid(params.id)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid role ID'
        },
        { status: 400 }
      );
    }

    const role = await Role.findById(params.id).populate('permissions');

    if (!role) {
      return NextResponse.json(
        {
          success: false,
          error: 'Role not found'
        },
        { status: 404 }
      );
    }

    // Get user count for this role
    const userCount = await User.countDocuments({ role: role._id });

    const roleData = {
      ...role.toObject(),
      userCount
    };

    return NextResponse.json({
      success: true,
      data: roleData
    });

  } catch (error: any) {
    console.error('Get role error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch role'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/roles/[id]
 * Update a role
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    if (!Types.ObjectId.isValid(params.id)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid role ID'
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, description, permissions } = body;

    const role = await Role.findById(params.id);

    if (!role) {
      return NextResponse.json(
        {
          success: false,
          error: 'Role not found'
        },
        { status: 404 }
      );
    }

    // Prevent modification of system roles
    if (role.isSystem) {
      return NextResponse.json(
        {
          success: false,
          error: 'System roles cannot be modified'
        },
        { status: 403 }
      );
    }

    // Check if new name conflicts with existing role (if name is being changed)
    if (name && name !== role.name) {
      const existingRole = await Role.findOne({
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        _id: { $ne: params.id }
      });

      if (existingRole) {
        return NextResponse.json(
          {
            success: false,
            error: 'A role with this name already exists'
          },
          { status: 409 }
        );
      }
    }

    // Validate permissions if provided
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

    // Update role
    const updates: any = {};
    if (name) updates.name = name;
    if (description) updates.description = description;
    if (permissions !== undefined) updates.permissions = permissions;

    const updatedRole = await Role.findByIdAndUpdate(
      params.id,
      updates,
      { new: true, runValidators: true }
    ).populate('permissions');

    return NextResponse.json({
      success: true,
      data: updatedRole,
      message: 'Role updated successfully'
    });

  } catch (error: any) {
    console.error('Update role error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update role'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/roles/[id]
 * Delete a role
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    if (!Types.ObjectId.isValid(params.id)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid role ID'
        },
        { status: 400 }
      );
    }

    const role = await Role.findById(params.id);

    if (!role) {
      return NextResponse.json(
        {
          success: false,
          error: 'Role not found'
        },
        { status: 404 }
      );
    }

    // Prevent deletion of system roles
    if (role.isSystem) {
      return NextResponse.json(
        {
          success: false,
          error: 'System roles cannot be deleted'
        },
        { status: 403 }
      );
    }

    // Check if role is assigned to any users
    const userCount = await User.countDocuments({ role: role._id });
    if (userCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete role. It is assigned to ${userCount} user(s). Please reassign these users to a different role first.`
        },
        { status: 409 }
      );
    }

    await Role.findByIdAndDelete(params.id);

    return NextResponse.json({
      success: true,
      message: 'Role deleted successfully'
    });

  } catch (error: any) {
    console.error('Delete role error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete role'
      },
      { status: 500 }
    );
  }
}