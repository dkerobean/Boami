import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectToDatabase } from '@/lib/database/connection';
import { Invitation } from '@/lib/database/models/Invitation';
import { User } from '@/lib/database/models/User';
import { InvitationValidator } from '@/lib/utils/invitation-validation';

interface AcceptInvitationRequest {
  firstName: string;
  lastName: string;
  password: string;
  phone?: string;
  bio?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    await connectToDatabase();

    const { token } = params;
    const body: AcceptInvitationRequest = await request.json();

    // Validate required fields
    if (!body.firstName || !body.lastName || !body.password) {
      return NextResponse.json(
        { error: 'First name, last name, and password are required' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (body.password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(body.password)) {
      return NextResponse.json(
        { error: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' },
        { status: 400 }
      );
    }

    // Validate the invitation first
    const validationResult = await InvitationValidator.validateInvitation(token, {
      checkUserExists: true,
      checkRoleExists: true,
      checkInviterActive: true,
      updateExpiredStatus: true
    });

    if (!validationResult.isValid) {
      const { error } = validationResult;
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

    // Get the full invitation data for processing
    const invitation = await Invitation.findOne({ token })
      .populate('role')
      .populate('invitedBy', 'firstName lastName email');

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invalid invitation token' },
        { status: 404 }
      );
    }

    // Create the user (password will be hashed by User model's pre-save middleware)
    const newUser = new User({
      email: invitation.email,
      password: body.password,
      firstName: body.firstName.trim(),
      lastName: body.lastName.trim(),
      name: `${body.firstName.trim()} ${body.lastName.trim()}`,
      role: invitation.role._id,
      status: 'active',
      isActive: true,
      isEmailVerified: true, // Since they clicked the invitation link
      emailVerifiedAt: new Date(),
      phone: body.phone?.trim() || undefined,
      bio: body.bio?.trim() || undefined,
      invitedBy: invitation.invitedBy._id,
      invitedAt: invitation.createdAt,
      profile: {
        firstName: body.firstName.trim(),
        lastName: body.lastName.trim(),
      }
    });

    await newUser.save();

    // Update invitation status to accepted
    await Invitation.findByIdAndUpdate(invitation._id, {
      status: 'accepted',
      acceptedAt: new Date()
    });

    // Log the successful account creation
    console.log(`User account created successfully for ${invitation.email} with role ${invitation.role.name}`);

    return NextResponse.json({
      message: 'Account created successfully',
      user: {
        id: newUser._id,
        email: newUser.email,
        name: newUser.name,
        role: {
          id: invitation.role._id,
          name: invitation.role.name,
          description: invitation.role.description
        },
        status: newUser.status
      }
    });

  } catch (error) {
    console.error('Error accepting invitation:', error);

    // Handle specific MongoDB errors
    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'A user with this email address already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
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