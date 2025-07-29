import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { Role, Permission, User } from '@/lib/database/models';
import { PermissionService } from '@/lib/services/permission.service';
import { RoleUtils } from '@/lib/utils/role.utils';
import { z } from 'zod';

// Validation schemas
const createRoleSchema = z.object({
  name: z.string().min(1, 'Role name is required').max(50, 'Role name too long'),
  description: z.string().min(1, 'Description is required').max(255, 'Description too long'),
  permissions: z.array(z.string()).min(1, 'At least one permission is required')
});

/**
 * Get all roles with their permissions
 * GET /api/roles
 */
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const includePermissions = searchParams.get('includePermissions') === 'true';
    const includeUserCount = searchParams.get('includeUserCount') === 'true';

    let query = Role.find().sort({ name: 1 });

    if (includePermissions) {
      query = query.populate('permissions', 'name resource action description');
    }

    const roles = await query;

    // Get user counts for each role if requested
    let userCounts: Record<string, number> = {};
    if (includeUserCount) {
      const userCountsArray = await Promise.all(
        roles.map(async (role) => ({
          roleId: role._id.toString(),
          count: await User.countDocuments({ role: role._id })
        }))
      );

      userCounts = userCountsArray.reduce((acc, { roleId, count }) => {
        acc[roleId] = count;
        return acc;
      }, {} as Record<string, number>);
    }

    return NextResponse.json({
      roles: roles.map(role => ({
        id: role._id,
        name: role.name,
        description: role.description,
        isSystem: role.isSystem,
        permissions: includePermissions ? role.permissions : undefined,
        userCount: includeUserCount ? userCounts[role._id.toString()] || 0 : undefined,
        createdAt: role.createdAt,
        updatedAt: role.updatedAt
      }))
    });
  } catch (error) {
    console.error('Error fetching roles:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Create a new role
 * POST /api/roles
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission
    const hasPermission = await PermissionService.checkPermission(
      session.user.id,
      'roles',
      'create'
    );

    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validation = createRoleSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { name, description, permissions } = validation.data;

    // Check if role name already exists
    const existingRole = await Role.findByName(name);
    if (existingRole) {
      return NextResponse.json(
        { error: 'Role with this name already exists' },
        { status: 400 }
      );
    }

    // Validate all permissions exist
    const permissionDocs = await Permission.find({ _id: { $in: permissions } });
    if (permissionDocs.length !== permissions.length) {
      return NextResponse.json(
        { error: 'One or more permissions are invalid' },
        { status: 400 }
      );
    }

    // Create the role
    const role = await Role.createWithPermissions(name, description, permissions);
    await role.populate('permissions', 'name resource action description');

    return NextResponse.json({
      success: true,
      message: 'Role created successfully',
      role: {
        id: role._id,
        name: role.name,
        description: role.description,
        isSystem: role.isSystem,
        permissions: role.permissions,
        createdAt: role.createdAt
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating role:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}