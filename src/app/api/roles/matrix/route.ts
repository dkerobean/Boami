import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth.config';
import { PermissionService } from '@/lib/services/permission.service';

/**
 * Get permission matrix for all roles
 * GET /api/roles/matrix
 */
// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

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

    const matrix = await PermissionService.getPermissionMatrix();

    return NextResponse.json(matrix);
  } catch (error) {
    console.error('Error fetching permission matrix:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}