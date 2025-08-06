import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { User, Role } from '@/lib/database/models';
import { PermissionService } from '@/lib/services/permission.service';
import { validateRoleAssignment } from '@/lib/utils/server-permissions';
import { z } from 'zod';

// Validation schemas
const updateUserSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50, 'First name too long').optional(),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long').optional(),
  roleId: z.string().optional(),
  status: z.enum(['active', 'pending', 'disabled']).optional(),
  designation: z.string().max(100, 'Designation too long').optional(),
  phone: z.string().regex(/^[\+]?[1-9][\d]{0,15}$/, 'Invalid phone number').optional(),
  bio: z.string().max(500, 'Bio too long').optional(),
  company: z.string().max(100, 'Company name too long').optional(),
  department: z.string().max(100, 'Department name too long').optional()
});

/**
 * Get user by ID
 * GET /api/users/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission
    const hasPermission = await PermissionService.checkPermission(
      session.user.id,
      'users',
      'read'
    );

    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const user = await User.findById(params.id)
      .populate('role', 'name description')
      .populate('invitedBy', 'firstName lastName email')
      .select('-password');

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      name: user.getFullName(),
      role: user.role,
      status: user.status,
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified,
      emailVerifiedAt: user.emailVerifiedAt,
      designation: user.designation,
      avatar: user.avatar,
      profileImage: user.profileImage,
      phone: user.phone,
      bio: user.bio,
      company: user.company,
      department: user.department,
      lastLogin: user.lastLogin,
      invitedBy: user.invitedBy,
      invitedAt: user.invitedAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Update user
 * PUT /api/users/[id]
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission
    const hasPermission = await PermissionService.checkPermission(
      session.user.id,
      'users',
      'update'
    );

    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validation = updateUserSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      );
    }

    const updateData = validation.data;

    // Find the user
    const user = await User.findById(params.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent users from updating themselves to avoid privilege escalation
    if (String(user._id) === session.user.id && updateData.roleId) {
      return NextResponse.json(
        { error: 'Cannot change your own role' },
        { status: 400 }
      );
    }

    // If role is being updated, validate role assignment
    if (updateData.roleId) {
      const role = await Role.findById(updateData.roleId);
      if (!role) {
        return NextResponse.json(
          { error: 'Invalid role specified' },
          { status: 400 }
        );
      }

      const roleValidation = await validateRoleAssignment(
        session.user.id,
        role.name
      );

      if (!roleValidation.canAssign) {
        return NextResponse.json(
          { error: roleValidation.reason },
          { status: 403 }
        );
      }

      updateData.roleId = String(role._id);
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      params.id,
      {
        ...updateData,
        ...(updateData.roleId && { role: updateData.roleId })
      },
      { new: true, runValidators: true }
    )
      .populate('role', 'name description')
      .populate('invitedBy', 'firstName lastName email')
      .select('-password');

    if (!updatedUser) {
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'User updated successfully',
      user: {
        id: updatedUser._id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        name: updatedUser.getFullName(),
        role: updatedUser.role,
        status: updatedUser.status,
        isActive: updatedUser.isActive,
        designation: updatedUser.designation,
        phone: updatedUser.phone,
        bio: updatedUser.bio,
        company: updatedUser.company,
        department: updatedUser.department,
        updatedAt: updatedUser.updatedAt
      }
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Delete user (soft delete by disabling)
 * DELETE /api/users/[id]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission
    const hasPermission = await PermissionService.checkPermission(
      session.user.id,
      'users',
      'delete'
    );

    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Prevent users from deleting themselves
    if (params.id === session.user.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    const user = await User.findById(params.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Soft delete by disabling the user
    const updatedUser = await User.findByIdAndUpdate(
      params.id,
      {
        status: 'disabled',
        isActive: false
      },
      { new: true }
    ).select('-password');

    return NextResponse.json({
      success: true,
      message: 'User disabled successfully',
      user: {
        id: updatedUser?._id,
        email: updatedUser?.email,
        status: updatedUser?.status,
        isActive: updatedUser?.isActive
      }
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}