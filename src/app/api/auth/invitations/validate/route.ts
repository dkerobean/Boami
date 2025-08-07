import { NextRequest, NextResponse } from 'next/server';
import { UserInvitationService } from '@/lib/services/user-invitation.service';

/**
 * Validate invitation token
 * GET /api/auth/invitations/validate?token=xxx
 */
// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    const validation = await UserInvitationService.validateInvitationToken(token);

    if (!validation.valid) {
      return NextResponse.json(
        {
          valid: false,
          error: validation.error
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      valid: true,
      invitation: {
        email: validation.invitation?.email,
        role: validation.invitation?.role,
        invitedBy: validation.invitation?.invitedBy,
        expiresAt: validation.invitation?.expiresAt
      }
    });
  } catch (error) {
    console.error('Error validating invitation token:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}