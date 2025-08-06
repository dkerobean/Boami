import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/database/connection';
import { User, Role } from '@/lib/database/models';
import { Types } from 'mongoose';

/**
 * GET /api/admin/users/[id]
 * Get a specific user by ID
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
          error: 'Invalid user ID'
        },
        { status: 400 }
      );
    }

    const user = await User.findById(params.id)
      .populate('role', 'name description permissions')
      .select('-password -refreshTokens');

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'User not found'
        },
        { status: 404 }
      );
    }

    const userData = {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      name: user.getFullName(),
      role: user.role ? {
        id: (user.role as any)._id,
        name: (user.role as any).name,
        description: (user.role as any).description,
        permissions: (user.role as any).permissions || []
      } : null,
      status: user.isActive ? 'active' : 'disabled',
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    return NextResponse.json({
      success: true,
      data: userData
    });

  } catch (error: any) {
    console.error('Get user error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch user'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/users/[id]
 * Update a user
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
          error: 'Invalid user ID'
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { firstName, lastName, role, isActive } = body;

    const user = await User.findById(params.id);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'User not found'
        },
        { status: 404 }
      );
    }

    // Validate role if provided
    if (role) {
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
    }

    // Update user
    const updates: any = {};
    if (firstName) updates.firstName = firstName;
    if (lastName) updates.lastName = lastName;
    if (role) updates.role = role;
    if (typeof isActive === 'boolean') updates.isActive = isActive;

    const updatedUser = await User.findByIdAndUpdate(
      params.id,
      updates,
      { new: true, runValidators: true }
    ).populate('role', 'name description');

    if (!updatedUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: updatedUser._id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        name: updatedUser.getFullName(),
        role: updatedUser.role ? {
          id: (updatedUser.role as any)._id,
          name: (updatedUser.role as any).name,
          description: (updatedUser.role as any).description
        } : null,
        status: updatedUser.isActive ? 'active' : 'disabled',
        isActive: updatedUser.isActive,
        isEmailVerified: updatedUser.isEmailVerified,
        lastLogin: updatedUser.lastLogin,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt
      },
      message: 'User updated successfully'
    });

  } catch (error: any) {
    console.error('Update user error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update user'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/users/[id]
 * Delete a user
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
          error: 'Invalid user ID'
        },
        { status: 400 }
      );
    }

    const user = await User.findById(params.id);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'User not found'
        },
        { status: 404 }
      );
    }

    // TODO: Add checks for preventing deletion of certain users (e.g., last admin)

    await User.findByIdAndDelete(params.id);

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error: any) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete user'
      },
      { status: 500 }
    );
  }
}