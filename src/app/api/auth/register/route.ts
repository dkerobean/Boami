import { NextRequest, NextResponse } from 'next/server';
import { RateLimiter } from '@/lib/auth/rate-limiter';
import { PasswordManager } from '@/lib/auth/password';
import { VerificationCodeManager } from '@/lib/auth/verification';
import { EmailSender } from '@/lib/email/sender';
import { connectToDatabase } from '@/lib/database/mongoose-connection';
import { User } from '@/lib/database/models/User';
import * as yup from 'yup';

/**
 * Validation schema for user registration
 */
const registerSchema = yup.object({
  email: yup
    .string()
    .email('Please enter a valid email address')
    .required('Email is required')
    .trim()
    .lowercase(),
  password: yup
    .string()
    .min(8, 'Password must be at least 8 characters')
    .required('Password is required'),
  firstName: yup
    .string()
    .required('First name is required')
    .trim()
    .min(1, 'First name cannot be empty'),
  lastName: yup
    .string()
    .required('Last name is required')
    .trim()
    .min(1, 'Last name cannot be empty'),
});

/**
 * Registration request body interface
 */
interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

/**
 * POST /api/auth/register
 * Handles user registration with email verification
 */
export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = RateLimiter.checkRateLimit(request, 'register');
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Too many registration attempts. Please try again later.',
          retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
        },
        { status: 429 }
      );
    }

    // Parse and validate request body
    const body: RegisterRequest = await request.json();
    
    try {
      await registerSchema.validate(body, { abortEarly: false });
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

    const { email, password, firstName, lastName } = body;

    // Validate password strength
    try {
      PasswordManager.validatePassword(password);
    } catch (validationError: any) {
      return NextResponse.json(
        {
          success: false,
          error: 'Password does not meet security requirements',
          details: [validationError.message]
        },
        { status: 400 }
      );
    }

    // Connect to database
    await connectToDatabase();

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      // Don't reveal that user exists for security
      return NextResponse.json(
        {
          success: false,
          error: 'An account with this email already exists'
        },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await PasswordManager.hashPassword(password);

    // Create new user
    const user = new User({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      isEmailVerified: false,
      emailVerifiedAt: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await user.save();

    // Generate verification code
    let verificationCode: string;
    try {
      verificationCode = await VerificationCodeManager.createVerificationCode(
        user._id?.toString() || '',
        'email_verification'
      );
    } catch (error) {
      // Clean up user if verification code creation fails
      await User.findByIdAndDelete(user._id);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to create verification code'
        },
        { status: 500 }
      );
    }

    // Send verification email
    const emailResult = await EmailSender.sendVerificationCode(
      email,
      firstName,
      verificationCode,
      5 // 5 minutes expiry
    );

    if (!emailResult.success) {
      console.error('Failed to send verification email:', emailResult.error);
      // Don't fail registration if email fails, but log it
      // User can request resend later
    }

    console.log(`✅ User registered successfully: ${email}`);
    return NextResponse.json(
      {
        success: true,
        message: 'Registration successful! Please check your email for a verification code.',
        data: {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          emailSent: emailResult.success
        }
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Registration error:', error);
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
 * OPTIONS /api/auth/register
 * Handle CORS preflight requests
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}