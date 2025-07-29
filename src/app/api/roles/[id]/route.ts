import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { Role, Permission, User } from '@/lib/database/models';
import { PermissionService } from '@/lib/services/permission.service';
import { RoleUtils } from '@/lib/utils/role.utils';
import { z } from 'zod';

// Validation schemas
const updateRoleSchema = z.object({
  name: z.string().min(1, 'Role name is required').max(50, 'Role name too long').optional(),
  description: z.string().min(1, 'Description is required').max(255, 'Description too long').optional(),
  permissions: z.array(z.string()).min(1, 'At least one permission is required').optional()
});

/**
 * Get role by ID
 * GET /api/roles/[id]
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
      'roles',
      'read'
    );

    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const role = await Role.findById(params.id).populate('permissions', 'name resource action description');

    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    // Get users with this role
    const userCount = await User.countDocuments({ role: role._id });
    const users = await User.find({ role: role._id })
      .select('firstName lastName email status lastLogin')
      .limit(10); // Limit to first 10 users for preview

    // Get role impact analysis
    const impactAnalysis = await RoleUtils.getRoleImpactAnalysis(role._id);

    return NextResponse.json({
      id: role._id,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      permissions: role.permissions,
      userCount,
      users: users.map(user => ({
        id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        status: user.status,
        lastLogin: user.lastLogin
      })),
      impactAnalysis,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt
    });
  } catch (error) {
    console.error('Error fetching role:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Update role
 * PUT /api/roles/[id]
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
      'roles',
      'update'
    );

    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validation = updateRoleSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      );
    }

    const updateData = validation.data;

    const role = await Role.findById(params.id);
    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    // Prevent modification of system roles
    if (role.isSystem) {
      return NextResponse.json(
        { error: 'Cannot modify system role' },
        { status: 400 }
      );
    }

    // If name is being updated, check for duplicates
    if (updateData.name && updateData.name !== role.name) {
      const existingRole = await Role.findByName(updateData.name);
      if (existingRole) {
        return NextResponse.json(
          { error: 'Role with this name already exists' },
          { status: 400 }
        );
      }
    }

    // If permissions are being updated, validate them
    if (updateData.permissions) {
      const permissionValidation = await RoleUtils.validatePermissionAssignment(
        role._id,
        updateData.permissions
      );

      if (!permissionValidation.isValid) {
        return NextResponse.json(
          { error: 'Permission validation failed', details: permissionValidation.errors },
          { status: 400 }
        );
      }

      // Validate all permissions exist
      const permissionDocs = await Permission.find({ _id: { $in: updateData.permissions } });
      if (permissionDocs.length !== updateData.permissions.length) {
        return NextResponse.json(
          { error: 'One or more permissions are invalid' },
          { status: 400 }
        );
      }
    }

    // Update the role
    const updatedRole = await Role.findByIdAndUpdate(
      params.id,
      {
        ...(updateData.name && { name: updateData.name }),
        ...(updateData.description && { description: updateData.description }),
        ...(updateData.permissions && { permissions: updateData.permissions })
      },
      { new: true, runValidators: true }
    ).populate('permissions', 'name resource action description');

    if (!updatedRole) {
      return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Role updated successfully',
      role: {
        id: updatedRole._id,
        name: updatedRole.name,
        description: updatedRole.description,
        isSystem: updatedRole.isSystem,
        permissions: updatedRole.permissions,
        updatedAt: updatedRole.updatedAt
      }
    });
  } catch (error) {
    console.error('Error updating role:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Delete role
 * DELETE /api/roles/[id]
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
      'roles',
      'delete'
    );

    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if role can be deleted
    const deletionCheck = await RoleUtils.canDeleteRole(params.id);
    if (!deletionCheck.canDelete) {
      return NextResponse.json(
        {
          error: deletionCheck.reason,
          affectedUsers: deletionCheck.affectedUsers
        },
        { status: 400 }
      );
    }

    const role = await Role.findById(params.id);
    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    await Role.findByIdAndDelete(params.id);

    return NextResponse.json({
      success: true,
      message: 'Role deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting role:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}