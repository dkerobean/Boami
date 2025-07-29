import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/database/connection';
import { InvitationValidator } from '@/lib/utils/invitation-validation';

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    await connectToDatabase();

    const { token } = params;

    // Use the comprehensive validation utility
    const validationResult = await InvitationValidator.validateInvitation(token, {
      checkUserExists: true,
      checkRoleExists: true,
      checkInviterActive: true,
      updateExpiredStatus: true
    });

    if (!validationResult.isValid) {
      const { error } = validationResult;

      // Map error codes to appropriate HTTP status codes
      const statusCode = getStatusCodeForError(error!.code);

      return NextResponse.json(
        {
          error: error!.message,
          code: error!.code,
          ...(error!.details && { details: error!.details })
        },
        { status: statusCode }
      );
    }

    // Return successful validation with invitation data
    return NextResponse.json(validationResult.invitation);

  } catch (error) {
    console.error('Error validating invitation:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}

/**
 * Maps error codes to appropriate HTTP status codes
 */
function getStatusCodeForError(errorCode: string): number {
  switch (errorCode) {
    case 'MISSING_TOKEN':
    case 'INVALID_TOKEN_FORMAT':
      return 400;
    case 'TOKEN_NOT_FOUND':
      return 404;
    case 'ALREADY_ACCEPTED':
    case 'USER_EXISTS':
      return 409;
    case 'INVITATION_EXPIRED':
    case 'INVITATION_CANCELLED':
    case 'ROLE_NOT_FOUND':
    case 'INVITER_INACTIVE':
      return 410;
    case 'INTERNAL_ERROR':
    default:
      return 500;
  }
}