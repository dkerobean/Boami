import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { PermissionService } from '@/lib/services/permission.service';

/**
 * Check if user has a specific permission
 * POST /api/auth/permissions/check
 */
export async function POST(request: NextRequest) {
  try {
    console.log('Permission check API called');

    const session = await getServerSession(authOptions);
    console.log('Session:', session ? { id: session.user.id, email: session.user.email } : 'No session');

    if (!session?.user?.id) {
      console.log('No user session found');
      return NextResponse.json({ hasPermission: false }, { status: 200 });
    }

    const { resource, action } = await request.json();
    console.log('Checking permission:', { resource, action, userId: session.user.id });

    if (!resource || !action) {
      return NextResponse.json(
        { error: 'Resource and action are required' },
        { status: 400 }
      );
    }

    const hasPermission = await PermissionService.checkPermission(
      session.user.id,
      resource,
      action
    );

    console.log('Permission result:', { hasPermission, resource, action });
    return NextResponse.json({ hasPermission });
  } catch (error) {
    console.error('Error checking permission:', error);
    return NextResponse.json({ hasPermission: false }, { status: 200 });
  }
}