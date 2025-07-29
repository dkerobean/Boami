import { NextRequest, NextResponse } from 'next/server';
import { RateLimiter } from '@/lib/auth/rate-limiter';
import { PasswordManager } from '@/lib/auth/password';
import { JWTManager } from '@/lib/auth/jwt';
import { connectToDatabase } from '@/lib/database/mongoose-connection';
import { User } from '@/lib/database/models/User';
import { Role } from '@/lib/database/models/Role';
import * as yup from 'yup';

/**
 * Validation schema for user login
 */
const loginSchema = yup.object({
  email: yup
    .string()
    .email('Please enter a valid email address')
    .required('Email is required')
    .trim()
    .lowercase(),
  password: yup
    .string()
    .required('Password is required')
    .min(1, 'Password cannot be empty'),
  rememberMe: yup
    .boolean()
    .optional()
    .default(false),
});

/**
 * Login request body interface
 */
interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

/**
 * POST /api/auth/login
 * Handles user authentication and login
 */
export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = RateLimiter.checkRateLimit(request, 'login');
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Too many login attempts. Please try again later.',
          retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
        },
        { status: 429 }
      );
    }

    // Parse and validate request body
    const body: LoginRequest = await request.json();
    
    try {
      await loginSchema.validate(body, { abortEarly: false });
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

    const { email, password, rememberMe = false } = body;

    // Connect to database
    await connectToDatabase();

    // Find user by email
    const user = await User.findByEmail(email);
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid email or password'
        },
        { status: 401 }
      );
    }

    // Check if role was properly populated
    if (!user.role) {
      console.error(`User ${email} has no role assigned`);
      return NextResponse.json(
        {
          success: false,
          error: 'User account configuration error. Please contact support.'
        },
        { status: 500 }
      );
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid email or password'
        },
        { status: 401 }
      );
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      return NextResponse.json(
        {
          success: false,
          error: 'Please verify your email address before logging in',
          requiresVerification: true,
          email: user.email
        },
        { status: 403 }
      );
    }

    // Update last login timestamp
    user.lastLogin = new Date();
    user.updatedAt = new Date();
    await user.save();

    // Ensure role is populated and get role name
    let roleName = 'user'; // Default fallback
    
    if (typeof user.role === 'object' && user.role !== null && 'name' in user.role) {
      roleName = (user.role as any).name;
    } else {
      console.warn(`Role not properly populated for user ${email}, using default 'user' role`);
    }
    
    console.log(`User ${email} logging in with role: ${roleName}`);

    // Generate JWT tokens
    const tokens = JWTManager.generateTokens({
      userId: user._id?.toString() || '',
      email: user.email,
      role: roleName,
      isEmailVerified: user.isEmailVerified
    });

    // Create response
    const response = NextResponse.json(
      {
        success: true,
        message: 'Login successful!',
        data: {
          user: {
            id: user._id?.toString() || '',
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            isEmailVerified: user.isEmailVerified,
            lastLogin: user.lastLogin
          }
        }
      },
      { status: 200 }
    );

    // Set HTTP-only cookies for secure token storage
    JWTManager.setAuthCookiesInResponse(
      response, 
      tokens.accessToken, 
      tokens.refreshToken
    );

    console.log(`✅ User logged in successfully: ${email}`);
    return response;

  } catch (error) {
    console.error('Login error:', error);
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
 * GET /api/auth/login
 * Get current user session status
 */
export async function GET(request: NextRequest) {
  try {
    // Get JWT token from cookies
    const accessToken = request.cookies.get('accessToken')?.value;
    
    if (!accessToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'No active session',
          authenticated: false
        },
        { status: 401 }
      );
    }

    // Verify token
    const payload = JWTManager.verifyAccessToken(accessToken);
    
    if (!payload) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid or expired session',
          authenticated: false
        },
        { status: 401 }
      );
    }

    // Connect to database and get fresh user data
    await connectToDatabase();
    const user = await User.findById(payload.userId);
    
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'User not found',
          authenticated: false
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        authenticated: true,
        data: {
          user: {
            id: user._id?.toString() || '',
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            isEmailVerified: user.isEmailVerified,
            lastLogin: user.lastLogin
          }
        }
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        authenticated: false
      },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS /api/auth/login
 * Handle CORS preflight requests
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}