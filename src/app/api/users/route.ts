import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { User, Role } from '@/lib/database/models';
import { PermissionService } from '@/lib/services/permission.service';
import { UserInvitationService } from '@/lib/services/user-invitation.service';
import { InvitationErrorHandler } from '@/lib/services/invitation-error-handler.service';
import { z } from 'zod';

// Validation schemas
const getUsersQuerySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('10'),
  search: z.string().optional(),
  role: z.string().optional(),
  status: z.enum(['active', 'pending', 'disabled']).optional(),
  sortBy: z.enum(['email', 'firstName', 'lastName', 'createdAt', 'lastLogin']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
});

const inviteUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  roleId: z.string().min(1, 'Role is required'),
  customMessage: z.string().optional()
});

/**
 * Get users with filtering, searching, and pagination
 * GET /api/users
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission
    const hasPermission = await PermissionService.checkPermission(
      session.user.id,
      'users',
      'read'
    );

    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const queryValidation = getUsersQuerySchema.safeParse(Object.fromEntries(searchParams));

    if (!queryValidation.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: queryValidation.error.errors },
        { status: 400 }
      );
    }

    const { page, limit, search, role, status, sortBy, sortOrder } = queryValidation.data;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build query
    let query: any = {};

    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } }
      ];
    }

    if (role) {
      query.role = role;
    }

    if (status) {
      query.status = status;
    }

    // Build sort object
    const sortObj: any = {};
    sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute queries
    const [users, totalCount] = await Promise.all([
      User.find(query)
        .populate('role', 'name description')
        .populate('invitedBy', 'firstName lastName email')
        .select('-password')
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum),
      User.countDocuments(query)
    ]);

    const totalPages = Math.ceil(totalCount / limitNum);

    return NextResponse.json({
      users: users.map(user => ({
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        name: user.getFullName(),
        role: user.role,
        status: user.status,
        isActive: user.isActive,
        isEmailVerified: user.isEmailVerified,
        lastLogin: user.lastLogin,
        invitedBy: user.invitedBy,
        invitedAt: user.invitedAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      })),
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalCount,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Invite a new user
 * POST /api/users
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const validation = inviteUserSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { email, roleId, customMessage } = validation.data;

    // Validate invitation request
    const validationResult = await InvitationErrorHandler.validateInvitationRequest(
      email,
      roleId,
      session.user.id
    );

    if (!validationResult.isValid) {
      const errorDisplay = InvitationErrorHandler.getErrorDisplay(validationResult.error!);

      // Log the error
      InvitationErrorHandler.logInvitationError(validationResult.error!, {
        email,
        invitedBy: session.user.id,
        operation: 'invite_user'
      });

      return NextResponse.json(
        {
          error: validationResult.error!.message,
          code: validationResult.error!.code,
          display: errorDisplay,
          recoverable: validationResult.error!.recoverable,
          retryable: validationResult.error!.retryable
        },
        { status: 400 }
      );
    }

    // Handle duplicate email scenarios
    const duplicateResult = await InvitationErrorHandler.handleDuplicateEmailInvitation(
      email,
      roleId,
      session.user.id
    );

    if (duplicateResult.action === 'error') {
      const errorDisplay = InvitationErrorHandler.getErrorDisplay(duplicateResult.error!);

      InvitationErrorHandler.logInvitationError(duplicateResult.error!, {
        email,
        invitedBy: session.user.id,
        operation: 'duplicate_check'
      });

      return NextResponse.json(
        {
          error: duplicateResult.error!.message,
          code: duplicateResult.error!.code,
          display: errorDisplay,
          recoverable: duplicateResult.error!.recoverable,
          retryable: duplicateResult.error!.retryable
        },
        { status: 409 }
      );
    }

    // Send invitation with retry mechanism
    try {
      const result = await InvitationErrorHandler.retryOperation(
        () => UserInvitationService.inviteUser(
          email,
          roleId,
          session.user.id,
          customMessage
        ),
        { maxRetries: 2, retryDelay: 1000 }
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to send invitation');
      }

      return NextResponse.json({
        success: true,
        message: 'Invitation sent successfully',
        invitation: result.invitation,
        warnings: validationResult.warnings,
        duplicateHandling: duplicateResult.action !== 'resend' ? {
          action: duplicateResult.action,
          details: duplicateResult.invitation
        } : undefined
      }, { status: 201 });

    } catch (error) {
      const invitationError = {
        code: 'INVITATION_SEND_FAILED',
        message: error instanceof Error ? error.message : 'Failed to send invitation',
        recoverable: true,
        retryable: true,
        suggestedAction: 'Try again'
      };

      InvitationErrorHandler.logInvitationError(invitationError, {
        email,
        invitedBy: session.user.id,
        operation: 'send_invitation'
      });

      const errorDisplay = InvitationErrorHandler.getErrorDisplay(invitationError);

      return NextResponse.json(
        {
          error: invitationError.message,
          code: invitationError.code,
          display: errorDisplay,
          recoverable: invitationError.recoverable,
          retryable: invitationError.retryable
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error inviting user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}