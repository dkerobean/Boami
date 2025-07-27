import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/database/mongoose-connection';
import { User } from '@/lib/database/models';
import jwt from 'jsonwebtoken';

/**
 * POST /api/email/unsubscribe
 * Handle email unsubscribe requests
 */
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const body = await request.json();
    const { token, emailType, userId } = body;

    if (!token || !emailType || !userId) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Verify the unsubscribe token
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
        { success: false, error: 'Invalid or expired unsubscribe link' },
        { status: 400 }
      );
    }

    // Verify the token matches the request
    if (decodedToken.userId !== userId || decodedToken.emailType !== emailType) {
      return NextResponse.json(
        { success: false, error: 'Invalid unsubscribe request' },
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

    // Initialize email preferences if they don't exist
    if (!user.emailPreferences) {
      user.emailPreferences = {
        subscriptionConfirmation: true,
        paymentNotifications: true,
        renewalReminders: true,
        cancellationNotifications: true,
        marketingEmails: true,
        securityAlerts: true
      };
    }

    // Update the specific email preference
    if (emailType === 'all') {
      // Unsubscribe from all non-essential emails
      user.emailPreferences.subscriptionConfirmation = false;
      user.emailPreferences.paymentNotifications = false;
      user.emailPreferences.renewalReminders = false;
      user.emailPreferences.cancellationNotifications = false;
      user.emailPreferences.marketingEmails = false;
      // Keep security alerts enabled for safety
    } else if (emailType in user.emailPreferences) {
      // Don't allow unsubscribing from security alerts
      if (emailType !== 'securityAlerts') {
        user.emailPreferences[emailType as keyof typeof user.emailPreferences] = false;
      }
    }

    // Save the updated preferences
    await user.save();

    return NextResponse.json({
      success: true,
      message: `Successfully unsubscribed from ${emailType}`,
      preferences: user.emailPreferences
    });

  } catch (error: any) {
    console.error('Email unsubscribe error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process unsubscribe request' },
      { status: 500 }
    );
  }
}

/**
 * Generate unsubscribe token
 */
export function generateUnsubscribeToken(userId: string, emailType: string): string {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET not configured');
  }

  return jwt.sign(
    {
      userId,
      emailType,
      purpose: 'unsubscribe',
      timestamp: Date.now()
    },
    jwtSecret,
    { expiresIn: '30d' } // Token valid for 30 days
  );
}

/**
 * Generate unsubscribe URL
 */
export function generateUnsubscribeUrl(userId: string, emailType: string): string {
  const token = generateUnsubscribeToken(userId, emailType);
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

  return `${baseUrl}/unsubscribe?token=${encodeURIComponent(token)}&type=${encodeURIComponent(emailType)}&user=${encodeURIComponent(userId)}`;
}