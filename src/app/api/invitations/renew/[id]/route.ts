import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectToDatabase } from '@/lib/database/connection';
import { PermissionService } from '@/lib/services/permission.service';
import { InvitationErrorHandler } from '@/lib/services/invitation-error-handler.service';

export async function POST(
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
      'create'
    );

    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectToDatabase();

    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'Invitation ID is required' },
        { status: 400 }
      );
    }

    // Handle expired invitation renewal
    const renewalResult = await InvitationErrorHandler.handleExpiredInvitation(id);

    if (!renewalResult.canRenew) {
      const errorDisplay = InvitationErrorHandler.getErrorDisplay(renewalResult.error!);

      InvitationErrorHandler.logInvitationError(renewalResult.error!, {
        invitedBy: session.user.id,
        operation: 'renew_invitation'
      });

      return NextResponse.json(
        {
          error: renewalResult.error!.message,
          code: renewalResult.error!.code,
          display: errorDisplay,
          recoverable: renewalResult.error!.recoverable,
          retryable: renewalResult.error!.retryable
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Invitation renewed successfully',
      newInvitation: renewalResult.newInvitation
    });

  } catch (error) {
    console.error('Error renewing invitation:', error);

    const invitationError = {
      code: 'RENEWAL_FAILED',
      message: 'Failed to renew invitation',
      recoverable: true,
      retryable: true,
      suggestedAction: 'Try again'
    };

    InvitationErrorHandler.logInvitationError(invitationError, {
      invitedBy: session?.user?.id,
      operation: 'renew_invitation'
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}