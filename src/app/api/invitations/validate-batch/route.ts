import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/database/connection';
import { InvitationValidator } from '@/lib/utils/invitation-validation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';

interface BatchValidationRequest {
  tokens: string[];
  options?: {
    checkUserExists?: boolean;
    checkRoleExists?: boolean;
    checkInviterActive?: boolean;
    updateExpiredStatus?: boolean;
  };
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication and permissions
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    await connectToDatabase();

    const body: BatchValidationRequest = await request.json();

    if (!body.tokens || !Array.isArray(body.tokens)) {
      return NextResponse.json(
        { error: 'Tokens array is required' },
        { status: 400 }
      );
    }

    if (body.tokens.length === 0) {
      return NextResponse.json(
        { error: 'At least one token is required' },
        { status: 400 }
      );
    }

    if (body.tokens.length > 100) {
      return NextResponse.json(
        { error: 'Maximum 100 tokens allowed per batch' },
        { status: 400 }
      );
    }

    // Validate all tokens
    const results = await InvitationValidator.validateMultipleInvitations(
      body.tokens,
      body.options || {
        checkUserExists: true,
        checkRoleExists: true,
        checkInviterActive: true,
        updateExpiredStatus: false // Don't update status in batch operations
      }
    );

    // Calculate summary statistics
    const summary = {
      total: body.tokens.length,
      valid: 0,
      invalid: 0,
      expired: 0,
      accepted: 0,
      cancelled: 0,
      userExists: 0,
      roleNotFound: 0,
      inviterInactive: 0
    };

    Object.values(results).forEach(result => {
      if (result.isValid) {
        summary.valid++;
      } else {
        summary.invalid++;

        switch (result.error?.code) {
          case 'INVITATION_EXPIRED':
            summary.expired++;
            break;
          case 'ALREADY_ACCEPTED':
            summary.accepted++;
            break;
          case 'INVITATION_CANCELLED':
            summary.cancelled++;
            break;
          case 'USER_EXISTS':
            summary.userExists++;
            break;
          case 'ROLE_NOT_FOUND':
            summary.roleNotFound++;
            break;
          case 'INVITER_INACTIVE':
            summary.inviterInactive++;
            break;
        }
      }
    });

    return NextResponse.json({
      results,
      summary,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in batch validation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}