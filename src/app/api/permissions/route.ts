import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/database/mongoose-connection';
import { Permission } from '@/lib/database/models';

/**
 * GET /api/permissions
 * Get permissions with optional grouping
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const groupByResource = searchParams.get('groupByResource') === 'true';

    const permissions = await Permission.find().sort({ resource: 1, action: 1 });

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
          resource: permission.resource,
          action: permission.action,
          description: permission.description
        });
        return acc;
      }, {} as Record<string, any[]>);

      return NextResponse.json({
        success: true,
        permissions: groupedPermissions
      });
    } else {
      // Return flat list
      const formattedPermissions = permissions.map(permission => ({
        id: permission._id,
        name: permission.name,
        resource: permission.resource,
        action: permission.action,
        description: permission.description
      }));

      return NextResponse.json({
        success: true,
        permissions: formattedPermissions
      });
    }

  } catch (error: any) {
    console.error('Get permissions error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch permissions'
      },
      { status: 500 }
    );
  }
}