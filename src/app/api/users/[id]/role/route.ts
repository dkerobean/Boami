import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { User, Role } from '@/lib/database/models';
import { PermissionService } from '@/lib/services/permission.service';
import { validateRoleAssignment } from '@/lib/utils/server-permissions';
import { z } from 'zod';

const updateRoleSchema = z.object({
  roleId: z.string().min(1, 'Role ID is required'),
  reason: z.string().optional()
});

/**
 * Update user role
 * PATCH /api/users/[id]/role
 */
export async function PATCH(
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
    const validation = updateRoleSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { roleId, reason } = validation.data;

    // Prevent users from changing their own role
    if (params.id === session.user.id) {
      return NextResponse.json(
        { error: 'Cannot change your own role' },
        { status: 400 }
      );
    }

    // Validate role exists
    const role = await Role.findById(roleId);
    if (!role) {
      return NextResponse.json(
        { error: 'Invalid role specified' },
        { status: 400 }
      );
    }

    // Validate role assignment permissions
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

    const user = await User.findById(params.id).populate('role', 'name');
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const oldRole = user.role;

    // Update user role
    const updatedUser = await User.findByIdAndUpdate(
      params.id,
      { role: roleId },
      { new: true }
    )
      .populate('role', 'name description')
      .select('-password');

    // Log the role change
    console.log(`User ${user.email} role changed from ${(oldRole as any)?.name} to ${role.name} by ${session.user.email}${reason ? ` (Reason: ${reason})` : ''}`);

    return NextResponse.json({
      success: true,
      message: 'User role updated successfully',
      user: {
        id: updatedUser?._id,
        email: updatedUser?.email,
        firstName: updatedUser?.firstName,
        lastName: updatedUser?.lastName,
        role: updatedUser?.role,
        status: updatedUser?.status,
        updatedAt: updatedUser?.updatedAt
      },
      changes: {
        oldRole: oldRole,
        newRole: role,
        changedBy: session.user.email,
        changedAt: new Date(),
        reason
      }
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}