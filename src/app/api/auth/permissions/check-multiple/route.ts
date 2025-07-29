import { NextRequest, NextResponse } from 'next/server';
import { JWTManager } from '@/lib/auth/jwt';
import { PermissionService } from '@/lib/services/permission.service';

/**
 * Check if user has multiple permissions
 * POST /api/auth/permissions/check-multiple
 */
export async function POST(request: NextRequest) {
  try {
    const user = JWTManager.getCurrentUser();
    if (!user?.userId) {
      return NextResponse.json({ hasPermission: false }, { status: 200 });
    }

    const { permissions, requireAll = false } = await request.json();

    if (!permissions || !Array.isArray(permissions)) {
      return NextResponse.json(
        { error: 'Permissions array is required' },
        { status: 400 }
      );
    }

    let hasPermission = false;

    if (requireAll) {
      hasPermission = await PermissionService.checkAllPermissions(
        user.userId,
        permissions
      );
    } else {
      hasPermission = await PermissionService.checkAnyPermission(
        user.userId,
        permissions
      );
    }

    return NextResponse.json({ hasPermission });
  } catch (error) {
    console.error('Error checking multiple permissions:', error);
    return NextResponse.json({ hasPermission: false }, { status: 200 });
  }
}