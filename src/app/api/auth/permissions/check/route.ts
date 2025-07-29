import { NextRequest, NextResponse } from 'next/server';
import { JWTManager } from '@/lib/auth/jwt';
import { PermissionService } from '@/lib/services/permission.service';

/**
 * Check if user has a specific permission
 * POST /api/auth/permissions/check
 */
export async function POST(request: NextRequest) {
  try {
    const user = JWTManager.getCurrentUser();
    if (!user?.userId) {
      return NextResponse.json({ hasPermission: false }, { status: 200 });
    }

    const { resource, action } = await request.json();

    if (!resource || !action) {
      return NextResponse.json(
        { error: 'Resource and action are required' },
        { status: 400 }
      );
    }

    const hasPermission = await PermissionService.checkPermission(
      user.userId,
      resource,
      action
    );

    return NextResponse.json({ hasPermission });
  } catch (error) {
    console.error('Error checking permission:', error);
    return NextResponse.json({ hasPermission: false }, { status: 200 });
  }
}