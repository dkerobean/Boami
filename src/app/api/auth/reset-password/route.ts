import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/database/connection';
import { User } from '@/lib/database/models/User';
import { VerificationCode } from '@/lib/database/models/VerificationCode';
import { PasswordManager } from '@/lib/auth/password';
import { VerificationCodeManager } from '@/lib/auth/verification';
import { EmailSender } from '@/lib/email/sender';
import { rateLimiter } from '@/lib/auth/rate-limiter';

/**
 * POST /api/auth/reset-password
 * Handles two operations based on the action parameter:
 * 1. Request password reset (action: 'request')
 * 2. Verify code and reset password (action: 'reset')
 */
export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimiter(request);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          error: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil(rateLimitResult.retryAfter / 1000)
        },
        { status: 429 }
      );
    }

    // Connect to database
    await connectDB();
    
    const body = await request.json();
    const { action, email, code, newPassword } = body;

    if (action === 'request') {
      // Request password reset flow
      return await handlePasswordResetRequest(email);
    } else if (action === 'reset') {
      // Verify code and reset password flow
      return await handlePasswordReset(email, code, newPassword);
    } else {
      return NextResponse.json(
        { error: 'Invalid action parameter' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Handles password reset request - sends reset code via email
 * @param email - User's email address
 * @returns Response with success/error message
 */
async function handlePasswordResetRequest(email: string) {
  try {
    // Validate email format
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Valid email address is required' },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      // Don't reveal if email exists or not for security
      return NextResponse.json(
        { 
          message: 'If an account with this email exists, a password reset code will be sent.',
          success: true 
        },
        { status: 200 }
      );
    }

    // Check if user account is active
    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Account is deactivated. Please contact support.' },
        { status: 403 }
      );
    }

    // Generate verification code
    let resetCode: string;
    try {
      resetCode = await VerificationCodeManager.createVerificationCode(
        user._id?.toString() || '',
        'password_reset'
      );
    } catch (error) {
      console.error('Failed to create verification code:', error);
      return NextResponse.json(
        { error: 'Failed to generate reset code' },
        { status: 500 }
      );
    }

    // Send password reset email
    const emailResult = await EmailSender.sendPasswordReset(
      user.email,
      user.firstName,
      resetCode,
      5 // 5 minutes expiry
    );

    if (!emailResult.success) {
      console.error('Failed to send password reset email:', emailResult.error);
      return NextResponse.json(
        { error: 'Failed to send reset email. Please try again.' },
        { status: 500 }
      );
    }

    console.log(`✅ Password reset email sent to ${user.email}`);

    return NextResponse.json(
      { 
        message: 'Password reset code sent to your email address.',
        success: true 
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Password reset request error:', error);
    return NextResponse.json(
      { error: 'Failed to process password reset request' },
      { status: 500 }
    );
  }
}

/**
 * Handles password reset with verification code
 * @param email - User's email address
 * @param code - 4-digit verification code
 * @param newPassword - New password
 * @returns Response with success/error message
 */
async function handlePasswordReset(email: string, code: string, newPassword: string) {
  try {
    // Validate required fields
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Valid email address is required' },
        { status: 400 }
      );
    }

    if (!code || typeof code !== 'string' || code.length !== 4) {
      return NextResponse.json(
        { error: 'Valid 4-digit verification code is required' },
        { status: 400 }
      );
    }

    if (!newPassword || typeof newPassword !== 'string') {
      return NextResponse.json(
        { error: 'New password is required' },
        { status: 400 }
      );
    }

    // Validate password strength
    try {
      PasswordManager.validatePassword(newPassword);
    } catch (error) {
      return NextResponse.json(
        { 
          error: error instanceof Error ? error.message : 'Invalid password format',
          validationErrors: {
            password: error instanceof Error ? error.message : 'Invalid password format'
          }
        },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or verification code' },
        { status: 400 }
      );
    }

    // Check if user account is active
    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Account is deactivated. Please contact support.' },
        { status: 403 }
      );
    }

    // Find and verify the reset code
    const verificationCode = await VerificationCode.findValidCode(
      user._id?.toString() || '',
      code,
      'password_reset'
    );

    if (!verificationCode) {
      return NextResponse.json(
        { error: 'Invalid or expired verification code' },
        { status: 400 }
      );
    }

    // Check if code can still be used
    if (!verificationCode.canAttempt()) {
      await verificationCode.incrementAttempts();
      return NextResponse.json(
        { error: 'Verification code has expired or exceeded maximum attempts' },
        { status: 400 }
      );
    }

    // Update user password
    user.password = newPassword; // Will be hashed by pre-save middleware
    user.lastLogin = undefined; // Reset last login to force re-authentication
    await user.save();

    // Mark verification code as used
    await verificationCode.markAsUsed();

    console.log(`✅ Password reset successful for user: ${user.email}`);

    return NextResponse.json(
      { 
        message: 'Password reset successful. Please log in with your new password.',
        success: true 
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    );
  }
}