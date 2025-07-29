import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { Permission } from '@/lib/database/models';
import { PermissionService } from '@/lib/services/permission.service';

/**
 * Get all permissions
 * GET /api/permissions
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
    const resource = searchParams.get('resource');
    const groupByResource = searchParams.get('groupByResource') === 'true';

    let query = Permission.find();

    if (resource) {
      query = query.where('resource', resource);
    }

    const permissions = await query.sort({ resource: 1, action: 1 });

    if (groupByResource) {
      // Group permissions by resource
      const groupedPermissions = permissions.reduce((acc, permission) => {
        const resource = permission.resource;
        if (!acc[resource]) {
          acc[resource] = [];
        }
        acc[resource].push({
          id: permission._id,
          name: permission.name,
          action: permission.action,
          description: permission.description
        });
        return acc;
      }, {} as Record<string, any[]>);

      return NextResponse.json({
        permissions: groupedPermissions
      });
    }

    return NextResponse.json({
      permissions: permissions.map(permission => ({
        id: permission._id,
        name: permission.name,
        resource: permission.resource,
        action: permission.action,
        description: permission.description,
        createdAt: permission.createdAt
      }))
    });
  } catch (error) {
    console.error('Error fetching permissions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}