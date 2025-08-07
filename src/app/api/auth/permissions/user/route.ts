import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { PermissionService } from '@/lib/services/permission.service';

/**
 * Get user permissions and role
 * GET /api/auth/permissions/user
 */
// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({
        permissions: [],
        role: null
      }, { status: 200 });
    }

    const [permissions, role] = await Promise.all([
      PermissionService.getUserPermissions(session.user.id),
      PermissionService.getUserRole(session.user.id)
    ]);

    return NextResponse.json({
      permissions,
      role
    });
  } catch (error) {
    console.error('Error getting user permissions:', error);
    return NextResponse.json({
      permissions: [],
      role: null
    }, { status: 200 });
  }
}