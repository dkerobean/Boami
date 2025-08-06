import { NextRequest, NextResponse } from 'next/server';
import { RateLimiter } from '@/lib/auth/rate-limiter';
import { VerificationCodeManager } from '@/lib/auth/verification';
import { JWTManager } from '@/lib/auth/jwt';
import { EmailSender } from '@/lib/email/sender';
import { connectToDatabase } from '@/lib/database/connection';
import { User } from '@/lib/database/models/User';
import { VerificationCode } from '@/lib/database/models/VerificationCode';
import * as yup from 'yup';

/**
 * Validation schema for email verification
 */
const verifyEmailSchema = yup.object({
  email: yup
    .string()
    .email('Please enter a valid email address')
    .required('Email is required')
    .trim()
    .lowercase(),
  code: yup
    .string()
    .required('Verification code is required')
    .matches(/^\d{4}$/, 'Verification code must be exactly 4 digits'),
});

/**
 * Validation schema for resend verification code
 */
const resendCodeSchema = yup.object({
  email: yup
    .string()
    .email('Please enter a valid email address')
    .required('Email is required')
    .trim()
    .lowercase(),
});

/**
 * Email verification request interface
 */
interface VerifyEmailRequest {
  email: string;
  code: string;
}

/**
 * Resend code request interface
 */
interface ResendCodeRequest {
  email: string;
}

/**
 * POST /api/auth/verify-email
 * Handles email verification with 4-digit code
 */
export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = RateLimiter.checkRateLimit(request, 'verification');
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Too many verification attempts. Please try again later.',
          retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
        },
        { status: 429 }
      );
    }

    // Parse and validate request body
    const body: VerifyEmailRequest = await request.json();
    
    try {
      await verifyEmailSchema.validate(body, { abortEarly: false });
    } catch (validationError: any) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid input data',
          details: validationError.errors
        },
        { status: 400 }
      );
    }

    const { email, code } = body;

    // Connect to database
    await connectToDatabase();

    // Find user by email
    const user = await User.findByEmail(email);
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid verification code or email'
        },
        { status: 400 }
      );
    }

    // Check if user is already verified
    if (user.isEmailVerified) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email is already verified'
        },
        { status: 400 }
      );
    }

    // Validate verification code
    const validationResult = await VerificationCodeManager.validateCode(
      user._id?.toString() || '',
      code,
      'email_verification'
    );

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: validationResult.message
        },
        { status: 400 }
      );
    }

    // Mark user as verified
    await user.markEmailAsVerified();

    // Generate JWT tokens
    const tokens = JWTManager.generateTokens({
      userId: user._id?.toString() || '',
      email: user.email,
      role: (user.role as any)?.toString() || 'user',
      isEmailVerified: true
    });

    // Set authentication cookies
    const response = NextResponse.json(
      {
        success: true,
        message: 'Email verified successfully!',
        data: {
          user: {
            id: user._id?.toString() || '',
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            isEmailVerified: true
          }
        }
      },
      { status: 200 }
    );

    // Set HTTP-only cookies for secure token storage
    JWTManager.setAuthCookiesInResponse(response, tokens.accessToken, tokens.refreshToken);

    // Send welcome email
    const welcomeEmailResult = await EmailSender.sendWelcomeEmail(
      user.email,
      user.firstName
    );

    if (!welcomeEmailResult.success) {
      console.error('Failed to send welcome email:', welcomeEmailResult.error);
      // Don't fail the verification if welcome email fails
    }

    console.log(`✅ Email verified successfully for user: ${email}`);
    return response;

  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/auth/verify-email
 * Handles resending verification code
 */
export async function PUT(request: NextRequest) {
  try {
    // Apply rate limiting (use same limit as verification)
    const rateLimitResult = RateLimiter.checkRateLimit(request, 'verification');
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
        },
        { status: 429 }
      );
    }

    // Parse and validate request body
    const body: ResendCodeRequest = await request.json();
    
    try {
      await resendCodeSchema.validate(body, { abortEarly: false });
    } catch (validationError: any) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid input data',
          details: validationError.errors
        },
        { status: 400 }
      );
    }

    const { email } = body;

    // Connect to database
    await connectToDatabase();

    // Find user by email
    const user = await User.findByEmail(email);
    if (!user) {
      // Don't reveal that user doesn't exist
      return NextResponse.json(
        {
          success: true,
          message: 'If an account with this email exists, a new verification code has been sent.'
        },
        { status: 200 }
      );
    }

    // Check if user is already verified
    if (user.isEmailVerified) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email is already verified'
        },
        { status: 400 }
      );
    }

    // Check if user can request a new code (rate limiting per user)
    const existingCodes = await VerificationCode.find({
      userId: user._id,
      type: 'email_verification',
      createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) } // Last 5 minutes
    });

    if (existingCodes.length >= 3) {
      return NextResponse.json(
        {
          success: false,
          error: 'Too many verification codes requested. Please wait before requesting another.'
        },
        { status: 429 }
      );
    }

    // Invalidate existing verification codes for this user
    await VerificationCode.updateMany(
      {
        userId: user._id,
        type: 'email_verification',
        isUsed: false
      },
      {
        isUsed: true,
        usedAt: new Date()
      }
    );

    // Generate new verification code
    let verificationCode: string;
    try {
      verificationCode = await VerificationCodeManager.createVerificationCode(
        user._id?.toString() || '',
        'email_verification'
      );
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to generate verification code'
        },
        { status: 500 }
      );
    }

    // Send verification email
    const emailResult = await EmailSender.sendVerificationCode(
      email,
      user.firstName,
      verificationCode,
      5 // 5 minutes expiry
    );

    if (!emailResult.success) {
      console.error('Failed to resend verification email:', emailResult.error);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to send verification email'
        },
        { status: 500 }
      );
    }

    console.log(`✅ Verification code resent to: ${email}`);
    return NextResponse.json(
      {
        success: true,
        message: 'A new verification code has been sent to your email.'
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Resend verification code error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error'
      },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS /api/auth/verify-email
 * Handle CORS preflight requests
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}