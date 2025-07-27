import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/database/mongoose-connection';
import { User } from '@/lib/database/models';
import jwt from 'jsonwebtoken';

/**
 * POST /api/email/preferences
 * Update user email preferences
 */
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const body = await request.json();
    const { token, userId, preferences } = body;

    if (!token || !userId || !preferences) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Verify the token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }

    let decodedToken;
    try {
      decodedToken = jwt.verify(token, jwtSecret) as any;
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 400 }
      );
    }

    // Verify the token matches the request
    if (decodedToken.userId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Invalid request' },
        { status: 400 }
      );
    }

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Validate preferences object
    const validPreferences = [
      'subscriptionConfirmation',
      'paymentNotifications',
      'renewalReminders',
      'cancellationNotifications',
      'marketingEmails',
      'securityAlerts'
    ];

    const filteredPreferences: any = {};
    for (const [key, value] of Object.entries(preferences)) {
      if (validPreferences.includes(key) && typeof value === 'boolean') {
        // Always keep security alerts enabled
        if (key === 'securityAlerts') {
          filteredPreferences[key] = true;
        } else {
          filteredPreferences[key] = value;
        }
      }
    }

    // Update user preferences
    user.emailPreferences = {
      ...user.emailPreferences,
      ...filteredPreferences
    };

    await user.save();

    return NextResponse.json({
      success: true,
      message: 'Email preferences updated successfully',
      preferences: user.emailPreferences
    });

  } catch (error: any) {
    console.error('Email preferences update error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update email preferences' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/email/preferences
 * Get user email preferences
 */
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const userId = searchParams.get('userId');

    if (!token || !userId) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Verify the token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }

    let decodedToken;
    try {
      decodedToken = jwt.verify(token, jwtSecret) as any;
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 400 }
      );
    }

    // Verify the token matches the request
    if (decodedToken.userId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Invalid request' },
        { status: 400 }
      );
    }

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Return current preferences
    const defaultPreferences = {
      subscriptionConfirmation: true,
      paymentNotifications: true,
      renewalReminders: true,
      cancellationNotifications: true,
      marketingEmails: true,
      securityAlerts: true
    };

    return NextResponse.json({
      success: true,
      preferences: user.emailPreferences || defaultPreferences
    });

  } catch (error: any) {
    console.error('Get email preferences error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get email preferences' },
      { status: 500 }
    );
  }
}