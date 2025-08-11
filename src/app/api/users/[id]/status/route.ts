import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth.config';
import { User } from '@/lib/database/models';
import { PermissionService } from '@/lib/services/permission.service';
import { z } from 'zod';

const updateStatusSchema = z.object({
  status: z.enum(['active', 'pending', 'disabled']),
  reason: z.string().optional()
});

/**
 * Update user status
 * PATCH /api/users/[id]/status
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission
    const hasPermission = await PermissionService.checkPermission(
      session.user.id,
      'users',
      'update'
    );

    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validation = updateStatusSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { status, reason } = validation.data;

    // Prevent users from changing their own status
    if (params.id === session.user.id) {
      return NextResponse.json(
        { error: 'Cannot change your own status' },
        { status: 400 }
      );
    }

    const user = await User.findById(params.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Update user status
    const updatedUser = await User.findByIdAndUpdate(
      params.id,
      {
        status,
        isActive: status === 'active'
      },
      { new: true }
    )
      .populate('role', 'name description')
      .select('-password');

    // Log the status change
    console.log(`User ${user.email} status changed from ${user.status} to ${status} by ${session.user.email}${reason ? ` (Reason: ${reason})` : ''}`);

    return NextResponse.json({
      success: true,
      message: `User ${status === 'active' ? 'activated' : status === 'disabled' ? 'disabled' : 'set to pending'} successfully`,
      user: {
        id: updatedUser?._id,
        email: updatedUser?.email,
        firstName: updatedUser?.firstName,
        lastName: updatedUser?.lastName,
        role: updatedUser?.role,
        status: updatedUser?.status,
        isActive: updatedUser?.isActive,
        updatedAt: updatedUser?.updatedAt
      }
    });
  } catch (error) {
    console.error('Error updating user status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}