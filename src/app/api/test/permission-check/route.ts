import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { PermissionService } from '@/lib/services/permission.service';
import { connectDB } from '@/lib/database/connection';

/**
 * Test endpoint to check permission system
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const session = await getServerSession(authOptions);
    console.log('Session check:', session ? { id: session.user.id, email: session.user.email } : 'No session');

    if (!session?.user?.id) {
      return NextResponse.json({
        success: false,
        error: 'No session found',
        session: null
      });
    }

    // Test specific permissions
    const permissions = [
      { resource: 'roles', action: 'read' },
      { resource: 'roles', action: 'manage' },
      { resource: 'users', action: 'read' },
      { resource: 'users', action: 'manage' }
    ];

    const results = {};
    for (const perm of permissions) {
      const hasPermission = await PermissionService.checkPermission(
        session.user.id,
        perm.resource,
        perm.action
      );
      (results as any)[`${perm.resource}.${perm.action}`] = hasPermission;
    }

    return NextResponse.json({
      success: true,
      user: {
        id: session.user.id,
        email: session.user.email,
        role: session.user.role
      },
      permissions: results
    });

  } catch (error: any) {
    console.error('Permission test error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}