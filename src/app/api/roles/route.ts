import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/database/mongoose-connection';
import { Role, User } from '@/lib/database/models';

/**
 * GET /api/roles
 * Get roles with optional parameters
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const includePermissions = searchParams.get('includePermissions') === 'true';
    const includeUserCount = searchParams.get('includeUserCount') === 'true';

    let query = Role.find();

    if (includePermissions) {
      query = query.populate('permissions');
    }

    const roles = await query.sort({ createdAt: -1 });

    // Add user count if requested
    const rolesWithCounts = await Promise.all(
      roles.map(async (role) => {
        const roleObj = role.toObject();

        if (includeUserCount) {
          const userCount = await User.countDocuments({ role: role._id });
          roleObj.userCount = userCount;
        }

        return {
          id: roleObj._id,
          name: roleObj.name,
          description: roleObj.description,
          isSystem: roleObj.isSystemRole,
          permissions: roleObj.permissions || [],
          userCount: roleObj.userCount || 0,
          createdAt: roleObj.createdAt,
          updatedAt: roleObj.updatedAt
        };
      })
    );

    return NextResponse.json({
      success: true,
      roles: rolesWithCounts
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