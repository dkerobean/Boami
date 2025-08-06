import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/database/connection';
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
        let userCount = 0;

        if (includeUserCount) {
          userCount = await User.countDocuments({ role: role._id });
        }

        return {
          id: roleObj._id,
          name: roleObj.name,
          description: roleObj.description,
          isSystem: roleObj.isSystem,
          permissions: roleObj.permissions || [],
          userCount,
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