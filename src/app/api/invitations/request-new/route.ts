import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/database/connection';
import { Invitation } from '@/lib/database/models/Invitation';
import { User } from '@/lib/database/models/User';
import { UserInvitationService } from '@/lib/services/user-invitation.service';

interface RequestNewInvitationRequest {
  email: string;
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const body: RequestNewInvitationRequest = await request.json();

    if (!body.email) {
      return NextResponse.json(
        { error: 'Email address is required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: body.email });
    if (existingUser) {
      return NextResponse.json(
        { error: 'A user with this email address already exists' },
        { status: 409 }
      );
    }

    // Find the most recent invitation for this email
    const existingInvitation = await Invitation.findOne({
      email: body.email
    })
    .sort({ createdAt: -1 })
    .populate('role')
    .populate('invitedBy');

    if (!existingInvitation) {
      return NextResponse.json(
        { error: 'No invitation found for this email address' },
        { status: 404 }
      );
    }

    // Check if there's already a pending invitation that hasn't expired
    if (existingInvitation.status === 'pending' && new Date(existingInvitation.expiresAt) > new Date()) {
      return NextResponse.json(
        { error: 'A valid invitation already exists for this email address' },
        { status: 409 }
      );
    }

    // Create a new invitation with the same role and invited by user
    const invitationService = new UserInvitationService();

    try {
      await invitationService.inviteUser(
        body.email,
        existingInvitation.role._id.toString(),
        existingInvitation.invitedBy._id.toString(),
        'A new invitation has been sent to replace your expired invitation.'
      );

      // Mark the old invitation as expired
      await Invitation.findByIdAndUpdate(existingInvitation._id, {
        status: 'expired'
      });

      return NextResponse.json({
        message: 'A new invitation has been sent to your email address'
      });

    } catch (invitationError) {
      console.error('Error creating new invitation:', invitationError);
      return NextResponse.json(
        { error: 'Failed to send new invitation' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error requesting new invitation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}