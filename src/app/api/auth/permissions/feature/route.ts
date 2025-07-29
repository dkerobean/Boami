import { NextRequest, NextResponse } from 'next/server';
import { JWTManager } from '@/lib/auth/jwt';
import { PermissionService } from '@/lib/services/permission.service';

/**
 * Check if user has access to a feature
 * POST /api/auth/permissions/feature
 */
export async function POST(request: NextRequest) {
  try {
    const user = JWTManager.getCurrentUser();
    if (!user?.userId) {
      return NextResponse.json({ hasAccess: false }, { status: 200 });
    }

    const { feature } = await request.json();

    if (!feature) {
      return NextResponse.json(
        { error: 'Feature is required' },
        { status: 400 }
      );
    }

    const hasAccess = await PermissionService.hasFeatureAccess(
      session.user.id,
      feature
    );

    return NextResponse.json({ hasAccess });
  } catch (error) {
    console.error('Error checking feature access:', error);
    return NextResponse.json({ hasAccess: false }, { status: 200 });
  }
}