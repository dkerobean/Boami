import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/database/mongoose-connection';
import { Permission } from '@/lib/database/models';

/**
 * GET /api/admin/permissions
 * Get all permissions grouped by resource
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const permissions = await Permission.find().sort({ resource: 1, action: 1 });

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
      success: true,
      data: {
        permissions: groupedPermissions,
        total: permissions.length
      }
    });

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