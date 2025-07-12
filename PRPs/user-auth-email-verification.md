name: "User Authentication System with MongoDB and 4-Digit Email Verification"
description: |

## Purpose
Implement a complete user authentication system with MongoDB integration and email verification using 4-digit codes, following Boami's existing patterns and 2024 security best practices for Next.js applications.

## Core Principles
1. **Context is King**: Include ALL necessary documentation, examples, and caveats
2. **Validation Loops**: Provide executable tests/lints the AI can run and fix
3. **Information Dense**: Use keywords and patterns from the codebase
4. **Progressive Success**: Start simple, validate, then enhance
5. **Global rules**: Be sure to follow all rules in CLAUDE.md

---

## Goal
Build a secure, production-ready authentication system that includes user registration, email verification with 4-digit codes, login/logout functionality, JWT-based session management, and route protection middleware, all following Boami's existing Material-UI and MongoDB patterns.

## Why
- **Business value**: Essential foundation for user management and secure access control
- **Integration**: Enables user-specific features like orders, preferences, and analytics
- **Problems solved**: Provides secure user authentication, email verification, and session management for the e-commerce platform

## What
A comprehensive authentication system featuring user registration with email verification, secure login with JWT tokens, password reset functionality, and route protection middleware. The system will integrate seamlessly with Boami's existing design patterns and database structure.

### Success Criteria
- [ ] User registration form with email verification workflow
- [ ] 4-digit email verification code system with expiration and rate limiting
- [ ] Secure login/logout with JWT token management
- [ ] Password reset functionality via email
- [ ] Route protection middleware for authenticated pages
- [ ] Integration with existing Material-UI components and MongoDB patterns
- [ ] Comprehensive security measures including rate limiting and input validation
- [ ] Responsive design consistent with Boami's existing auth pages

## All Needed Context

### Documentation & References
```yaml
# MUST READ - Include these in your context window
- url: https://resend.com/docs/send-with-nextjs
  why: Official Next.js integration guide for email service
  
- url: https://jwt.io/introduction/
  why: JWT token structure and best practices for authentication
  
- url: https://nextjs.org/docs/app/building-your-application/routing/middleware
  why: Next.js 14 middleware patterns for route protection
  
- url: https://nodejs.org/en/learn/getting-started/security-best-practices
  why: 2024 Node.js security best practices for authentication
  
- file: src/app/auth/authForms/AuthRegister.tsx
  why: Existing registration form pattern and Material-UI structure
  
- file: src/app/auth/authForms/AuthLogin.tsx
  why: Existing login form pattern and component organization
  
- file: src/app/auth/authForms/AuthTwoSteps.tsx
  why: Existing two-step verification UI pattern (6-digit, adapt to 4-digit)
  
- file: examples/database/mongoose-connection.ts
  why: MongoDB connection patterns and error handling
  
- file: examples/database/user-schema.ts
  why: User schema structure and validation patterns
  
- file: examples/api-routes/users.ts
  why: API route patterns with validation and error handling

- url: https://github.com/goldbergyoni/nodebestpractices
  why: Node.js security best practices including rate limiting and validation

- url: https://blog.appsignal.com/2024/07/03/security-best-practices-for-your-nodejs-application.html
  why: 2024 specific security practices for authentication systems
```

### Current Codebase tree
```bash
src/
├── app/
│   ├── auth/
│   │   ├── authForms/              # Existing auth components
│   │   │   ├── AuthLogin.tsx       # Login form pattern
│   │   │   ├── AuthRegister.tsx    # Registration form pattern
│   │   │   ├── AuthTwoSteps.tsx    # Two-step verification UI (6-digit)
│   │   │   └── AuthForgotPassword.tsx
│   │   ├── auth1/                  # Auth layout variant 1
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   └── two-steps/page.tsx
│   │   └── auth2/                  # Auth layout variant 2
│   ├── (DashboardLayout)/
│   │   └── types/auth/auth.ts      # Existing auth type definitions
│   └── api/                        # API routes location
├── components/
│   └── forms/theme-elements/       # Custom Material-UI components
│       ├── CustomTextField.tsx
│       ├── CustomFormLabel.tsx
│       └── CustomCheckbox.tsx
└── examples/
    ├── database/                   # MongoDB patterns to follow
    │   ├── mongoose-connection.ts
    │   ├── user-schema.ts
    │   └── db-transactions.ts
    └── api-routes/
        └── users.ts                # API route patterns
```

### Desired Codebase tree with files to be added
```bash
src/
├── app/
│   ├── auth/
│   │   ├── authForms/              # Enhanced auth components
│   │   │   ├── AuthEmailVerification.tsx  # NEW: 4-digit verification form
│   │   │   ├── AuthRegister.tsx    # ENHANCED: Add email verification trigger
│   │   │   ├── AuthLogin.tsx       # ENHANCED: Add "verify email" state
│   │   │   └── AuthResetPassword.tsx # NEW: Password reset form
│   │   ├── auth1/
│   │   │   ├── verify-email/page.tsx     # NEW: Email verification page
│   │   │   └── reset-password/page.tsx   # NEW: Password reset page
│   │   └── middleware.ts           # NEW: Auth middleware for route protection
│   ├── api/
│   │   └── auth/                   # NEW: Authentication API routes
│   │       ├── register/route.ts   # User registration endpoint
│   │       ├── verify-email/route.ts # Email verification endpoint
│   │       ├── login/route.ts      # Login endpoint
│   │       ├── logout/route.ts     # Logout endpoint
│   │       ├── reset-password/route.ts # Password reset endpoint
│   │       └── refresh-token/route.ts  # Token refresh endpoint
│   └── (DashboardLayout)/
│       └── types/auth/
│           └── auth.ts             # ENHANCED: Add verification types
├── lib/                            # NEW: Core authentication utilities
│   ├── auth/                       # Authentication logic
│   │   ├── jwt.ts                  # JWT token management
│   │   ├── password.ts             # Password hashing utilities
│   │   ├── verification.ts         # Email verification logic
│   │   └── rate-limiter.ts         # Rate limiting for auth endpoints
│   ├── email/                      # Email service integration
│   │   ├── resend-client.ts        # Resend email client setup
│   │   ├── templates/              # Email templates
│   │   │   ├── verification-code.tsx # Verification email template
│   │   │   └── password-reset.tsx  # Password reset email template
│   │   └── sender.ts               # Email sending utilities
│   ├── database/                   # Database utilities
│   │   ├── mongoose-connection.ts  # MongoDB connection (from examples)
│   │   └── models/                 # Mongoose models
│   │       ├── User.ts             # Enhanced user model with verification
│   │       └── VerificationCode.ts # Email verification codes model
│   └── middleware/                 # Authentication middleware
│       ├── auth-guard.ts           # Route protection logic
│       └── rate-limit.ts           # Rate limiting middleware
├── components/
│   └── auth/                       # NEW: Reusable auth components
│       ├── ProtectedRoute.tsx      # Route protection wrapper
│       └── AuthLayout.tsx          # Shared auth layout component
└── types/                          # NEW: Enhanced type definitions
    └── auth.ts                     # Complete auth type definitions
```

### Known Gotchas & Library Quirks
```typescript
// CRITICAL: Next.js 14 App Router requires specific patterns for API routes
// CRITICAL: Material-UI v5 uses emotion styling - follow existing sx prop patterns
// CRITICAL: MongoDB connection must use singleton pattern to prevent multiple connections
// CRITICAL: JWT tokens require secure HTTP-only cookies for production security
// CRITICAL: Rate limiting essential for email verification to prevent abuse
// CRITICAL: 4-digit codes have only 10,000 combinations - implement strict rate limiting
// CRITICAL: Resend requires API key in environment variables, has daily limits on free tier
// CRITICAL: bcrypt salt rounds should be 12+ for security vs performance balance
// CRITICAL: Email verification codes should expire within 5-10 minutes
// CRITICAL: Always validate and sanitize input to prevent injection attacks
// CRITICAL: Use middleware.ts in app directory for route protection
// CRITICAL: Environment variables must be prefixed with NEXT_PUBLIC_ for client access
```

## Implementation Blueprint

### Data models and structure

```typescript
// Enhanced User model with email verification
interface IUser {
  _id?: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  isEmailVerified: boolean;
  role: 'admin' | 'user' | 'manager';
  isActive: boolean;
  avatar?: string;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Email verification codes tracking
interface IVerificationCode {
  _id?: string;
  userId: string;
  code: string;
  type: 'email_verification' | 'password_reset';
  expiresAt: Date;
  attempts: number;
  maxAttempts: number;
  isUsed: boolean;
  createdAt: Date;
}

// JWT token payload
interface IJWTPayload {
  userId: string;
  email: string;
  role: string;
  isEmailVerified: boolean;
  iat: number;
  exp: number;
}

// Authentication request/response types
interface IAuthResponse {
  success: boolean;
  user?: Partial<IUser>;
  token?: string;
  refreshToken?: string;
  message?: string;
  error?: string;
}
```

### List of tasks to be completed in order

```yaml
Task 1: Setup Core Dependencies and Configuration
ADD to package.json:
  - resend: Email service for Next.js applications
  - jsonwebtoken: JWT token management
  - bcryptjs: Password hashing
  - mongoose: MongoDB ODM
  - express-rate-limit: Rate limiting middleware
  - @types/jsonwebtoken, @types/bcryptjs (dev dependencies)

CREATE .env.local variables:
  - MONGODB_URI, JWT_SECRET, JWT_REFRESH_SECRET
  - RESEND_API_KEY, NEXT_PUBLIC_APP_URL

Task 2: Implement Database Models and Connection
CREATE lib/database/mongoose-connection.ts:
  - PATTERN: Follow examples/database/mongoose-connection.ts exactly
  - Singleton pattern for connection caching
  - Proper error handling and connection pooling

CREATE lib/database/models/User.ts:
  - PATTERN: Extend examples/database/user-schema.ts
  - Add isEmailVerified field and verification timestamps
  - Include email verification methods and indexes

CREATE lib/database/models/VerificationCode.ts:
  - PATTERN: Follow user schema structure
  - Verification code tracking with expiration
  - Rate limiting fields and automatic cleanup

Task 3: Implement Core Authentication Utilities
CREATE lib/auth/password.ts:
  - PATTERN: Use bcrypt with salt rounds 12
  - Hash password and compare functions
  - Follow security best practices from research

CREATE lib/auth/jwt.ts:
  - PATTERN: JWT generation and verification utilities
  - Access and refresh token management
  - HTTP-only cookie handling for security

CREATE lib/auth/verification.ts:
  - PATTERN: 4-digit code generation and validation
  - Expiration logic (5 minutes default)
  - Rate limiting and attempt tracking

CREATE lib/auth/rate-limiter.ts:
  - PATTERN: Express-rate-limit configuration
  - Different limits for auth endpoints
  - IP-based and user-based rate limiting

Task 4: Implement Email Service Integration
CREATE lib/email/resend-client.ts:
  - PATTERN: Resend client setup with error handling
  - Environment variable configuration
  - Connection testing and fallback logic

CREATE lib/email/templates/verification-code.tsx:
  - PATTERN: React Email component structure
  - Professional HTML email template
  - 4-digit code display with styling

CREATE lib/email/sender.ts:
  - PATTERN: Email sending utilities with retry logic
  - Template rendering and error handling
  - Rate limiting integration

Task 5: Create Authentication API Routes
CREATE app/api/auth/register/route.ts:
  - PATTERN: Follow examples/api-routes/users.ts structure
  - Next.js 14 App Router export pattern
  - Input validation, user creation, email verification trigger

CREATE app/api/auth/verify-email/route.ts:
  - PATTERN: POST endpoint with code validation
  - Rate limiting and attempt tracking
  - User account activation on success

CREATE app/api/auth/login/route.ts:
  - PATTERN: Credential validation and JWT generation
  - Email verification status checking
  - Secure cookie setting for tokens

CREATE app/api/auth/logout/route.ts:
  - PATTERN: Token invalidation and cookie clearing
  - Refresh token cleanup

CREATE app/api/auth/reset-password/route.ts:
  - PATTERN: Password reset email trigger and verification
  - New password setting with validation

Task 6: Enhance Authentication Forms
MODIFY src/app/auth/authForms/AuthRegister.tsx:
  - PATTERN: Keep existing Material-UI structure
  - Add form validation using Formik/Yup
  - Integrate with registration API

CREATE src/app/auth/authForms/AuthEmailVerification.tsx:
  - PATTERN: Adapt AuthTwoSteps.tsx from 6-digit to 4-digit
  - Material-UI input fields with proper spacing
  - Resend functionality and loading states

MODIFY src/app/auth/authForms/AuthLogin.tsx:
  - PATTERN: Enhance existing form
  - Add email verification status handling
  - Integrate with login API

CREATE src/app/auth/authForms/AuthResetPassword.tsx:
  - PATTERN: Follow existing form structure
  - Email input and new password fields
  - Integration with reset password API

Task 7: Create Authentication Pages
CREATE app/auth/auth1/verify-email/page.tsx:
  - PATTERN: Follow existing auth1 page structure
  - PageContainer + Breadcrumb + AuthEmailVerification
  - Loading states and success/error handling

CREATE app/auth/auth1/reset-password/page.tsx:
  - PATTERN: Follow existing auth page layout
  - AuthResetPassword form integration
  - Proper routing and state management

MODIFY existing auth pages:
  - Update routing between registration and verification
  - Add proper error handling and user feedback

Task 8: Implement Route Protection Middleware
CREATE middleware.ts (app directory root):
  - PATTERN: Next.js 14 middleware pattern
  - JWT token verification from cookies
  - Protected route redirection logic

CREATE lib/middleware/auth-guard.ts:
  - PATTERN: Higher-order component for route protection
  - User role checking and permissions
  - Integration with existing layout patterns

CREATE components/auth/ProtectedRoute.tsx:
  - PATTERN: React component wrapper for route protection
  - Loading states and unauthorized redirects
  - Integration with existing component patterns

Task 9: Add Comprehensive Security Measures
IMPLEMENT rate limiting:
  - Email verification: 3 attempts per hour per IP
  - Login attempts: 5 attempts per 15 minutes per IP
  - Registration: 3 registrations per hour per IP

ADD input validation:
  - Email format validation and normalization
  - Password strength requirements (8+ chars, mixed case, numbers)
  - XSS prevention and SQL injection protection

IMPLEMENT CSRF protection:
  - Token-based CSRF protection for forms
  - Origin validation for API requests

Task 10: Create Comprehensive Tests
CREATE tests/auth/auth.test.ts:
  - PATTERN: Jest testing patterns
  - Unit tests for authentication utilities
  - Integration tests for API endpoints

CREATE tests/auth/email-verification.test.ts:
  - PATTERN: Mock email service for testing
  - Code generation and validation tests
  - Rate limiting and expiration tests

ADD manual testing checklist:
  - Complete user registration flow
  - Email verification with various scenarios
  - Login/logout functionality
  - Password reset flow
  - Route protection validation
```

### Per task pseudocode

```typescript
// Task 3: JWT Authentication Utility
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

export class JWTManager {
  private static readonly ACCESS_TOKEN_EXPIRES = '15m';
  private static readonly REFRESH_TOKEN_EXPIRES = '7d';
  
  static generateTokens(payload: IJWTPayload) {
    // PATTERN: Generate both access and refresh tokens
    const accessToken = jwt.sign(
      payload,
      process.env.JWT_SECRET!,
      { expiresIn: this.ACCESS_TOKEN_EXPIRES }
    );
    
    const refreshToken = jwt.sign(
      { userId: payload.userId },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: this.REFRESH_TOKEN_EXPIRES }
    );
    
    return { accessToken, refreshToken };
  }
  
  static verifyToken(token: string): IJWTPayload | null {
    // PATTERN: Token verification with error handling
    try {
      return jwt.verify(token, process.env.JWT_SECRET!) as IJWTPayload;
    } catch (error) {
      return null;
    }
  }
  
  static setAuthCookies(accessToken: string, refreshToken: string) {
    // PATTERN: HTTP-only secure cookies
    const cookieStore = cookies();
    cookieStore.set('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 // 15 minutes
    });
    cookieStore.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 // 7 days
    });
  }
}

// Task 4: Email Verification Code Management
export class VerificationCodeManager {
  static generateCode(): string {
    // PATTERN: Cryptographically secure 4-digit code
    const crypto = require('crypto');
    return crypto.randomInt(1000, 9999).toString();
  }
  
  static async createVerificationCode(
    userId: string, 
    type: 'email_verification' | 'password_reset'
  ) {
    // PATTERN: Database integration with expiration
    const code = this.generateCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    
    await VerificationCode.create({
      userId,
      code,
      type,
      expiresAt,
      attempts: 0,
      maxAttempts: 3,
      isUsed: false
    });
    
    return code;
  }
  
  static async validateCode(userId: string, code: string, type: string) {
    // PATTERN: Rate limiting and expiration checking
    const verification = await VerificationCode.findOne({
      userId,
      type,
      isUsed: false,
      expiresAt: { $gt: new Date() }
    });
    
    if (!verification) {
      throw new Error('Invalid or expired verification code');
    }
    
    // GOTCHA: Increment attempts to prevent brute force
    verification.attempts += 1;
    
    if (verification.attempts > verification.maxAttempts) {
      verification.isUsed = true;
      await verification.save();
      throw new Error('Too many verification attempts');
    }
    
    if (verification.code !== code) {
      await verification.save();
      throw new Error('Invalid verification code');
    }
    
    // Mark as used
    verification.isUsed = true;
    await verification.save();
    
    return true;
  }
}

// Task 5: Registration API Route
// app/api/auth/register/route.ts
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await connectDB();
    
    const body = await request.json();
    
    // PATTERN: Input validation using Yup
    const schema = yup.object({
      email: yup.string().email().required(),
      password: yup.string().min(8).required(),
      firstName: yup.string().required(),
      lastName: yup.string().required()
    });
    
    await schema.validate(body);
    
    // PATTERN: Check for existing user
    const existingUser = await User.findOne({ email: body.email });
    if (existingUser) {
      return NextResponse.json({
        success: false,
        error: 'User already exists'
      }, { status: 409 });
    }
    
    // PATTERN: Create user with hashed password
    const hashedPassword = await PasswordManager.hashPassword(body.password);
    const user = await User.create({
      email: body.email,
      password: hashedPassword,
      firstName: body.firstName,
      lastName: body.lastName,
      isEmailVerified: false
    });
    
    // PATTERN: Generate and send verification code
    const verificationCode = await VerificationCodeManager.createVerificationCode(
      user._id.toString(),
      'email_verification'
    );
    
    await EmailSender.sendVerificationCode(user.email, verificationCode);
    
    return NextResponse.json({
      success: true,
      message: 'Registration successful. Please check your email for verification code.',
      userId: user._id
    }, { status: 201 });
    
  } catch (error) {
    // PATTERN: Comprehensive error handling
    console.error('Registration error:', error);
    return NextResponse.json({
      success: false,
      error: 'Registration failed'
    }, { status: 500 });
  }
}

// Task 6: 4-Digit Email Verification Component
const AuthEmailVerification = ({ userId }: { userId: string }) => {
  const [codes, setCodes] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // PATTERN: Follow existing AuthTwoSteps structure but with 4 inputs
  const handleCodeChange = (index: number, value: string) => {
    if (value.length <= 1 && /^\d*$/.test(value)) {
      const newCodes = [...codes];
      newCodes[index] = value;
      setCodes(newCodes);
      
      // PATTERN: Auto-focus next input
      if (value && index < 3) {
        const nextInput = document.getElementById(`code-${index + 1}`);
        nextInput?.focus();
      }
    }
  };
  
  const handleVerification = async () => {
    const code = codes.join('');
    if (code.length !== 4) {
      setError('Please enter all 4 digits');
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, code })
      });
      
      if (response.ok) {
        // PATTERN: Redirect to login or dashboard
        router.push('/auth/auth1/login?verified=true');
      } else {
        const data = await response.json();
        setError(data.error || 'Verification failed');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Box>
      <CustomFormLabel htmlFor="code">
        Enter your 4-digit verification code
      </CustomFormLabel>
      <Stack spacing={2} direction="row" mb={3}>
        {codes.map((code, index) => (
          <CustomTextField
            key={index}
            id={`code-${index}`}
            value={code}
            onChange={(e) => handleCodeChange(index, e.target.value)}
            variant="outlined"
            inputProps={{
              maxLength: 1,
              style: { textAlign: 'center', fontSize: '1.5rem' }
            }}
            fullWidth
          />
        ))}
      </Stack>
      
      {error && (
        <Typography color="error" variant="body2" mb={2}>
          {error}
        </Typography>
      )}
      
      <Button
        color="primary"
        variant="contained"
        size="large"
        fullWidth
        onClick={handleVerification}
        disabled={loading || codes.some(c => !c)}
      >
        {loading ? 'Verifying...' : 'Verify Email'}
      </Button>
    </Box>
  );
};
```

### Integration Points
```yaml
ENVIRONMENT:
  - add to: .env.local
  - vars: |
      # Authentication
      JWT_SECRET=your_super_secret_jwt_key_here
      JWT_REFRESH_SECRET=your_refresh_secret_key_here
      
      # Database
      MONGODB_URI=mongodb://localhost:27017/boami
      
      # Email Service
      RESEND_API_KEY=re_...
      
      # Application
      NEXT_PUBLIC_APP_URL=http://localhost:3000
      
NAVIGATION:
  - update: app/(DashboardLayout)/layout/vertical/navbar/Menudata.ts
  - pattern: Add authentication-related menu items for admin users
  
DEPENDENCIES:
  - Add to package.json:
    - resend: "^2.0.0"
    - jsonwebtoken: "^9.0.2"
    - bcryptjs: "^2.4.3"
    - mongoose: "^8.0.0"
    - express-rate-limit: "^7.1.5"
    - @types/jsonwebtoken: "^9.0.5" (dev)
    - @types/bcryptjs: "^2.4.5" (dev)

DATABASE:
  - MongoDB collections: users, verification_codes
  - Indexes: email (unique), verification codes by userId and expiration
  - TTL index on verification_codes for automatic cleanup

MIDDLEWARE:
  - Create middleware.ts in app directory for route protection
  - Protected routes: /dashboard, /profile, /admin paths
  - Public routes: /auth, /api/auth, landing pages
```

## Validation Loop

### Level 1: Syntax & Style
```bash
# Run these FIRST - fix any errors before proceeding
npm run lint                       # ESLint checking
npm run type-check                 # TypeScript compilation (if available)
npm run build                      # Next.js build verification

# Expected: No errors. If errors, READ the error and fix.
```

### Level 2: Unit Tests
```typescript
// test/auth/authentication.test.ts
describe('Authentication System', () => {
  test('User registration creates user and sends verification email', async () => {
    const userData = {
      email: 'test@example.com',
      password: 'SecurePass123',
      firstName: 'John',
      lastName: 'Doe'
    };
    
    const response = await request(app)
      .post('/api/auth/register')
      .send(userData);
    
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.userId).toBeDefined();
    
    // Verify user exists in database
    const user = await User.findOne({ email: userData.email });
    expect(user).toBeTruthy();
    expect(user.isEmailVerified).toBe(false);
  });

  test('Email verification with valid 4-digit code', async () => {
    // Setup: Create user and verification code
    const user = await User.create({
      email: 'verify@example.com',
      password: 'hashedpassword',
      firstName: 'Test',
      lastName: 'User',
      isEmailVerified: false
    });
    
    const code = '1234';
    await VerificationCode.create({
      userId: user._id,
      code,
      type: 'email_verification',
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      attempts: 0,
      maxAttempts: 3,
      isUsed: false
    });
    
    const response = await request(app)
      .post('/api/auth/verify-email')
      .send({ userId: user._id.toString(), code });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    
    // Verify user is now verified
    const updatedUser = await User.findById(user._id);
    expect(updatedUser.isEmailVerified).toBe(true);
  });

  test('Login with verified email creates JWT tokens', async () => {
    const userData = {
      email: 'login@example.com',
      password: 'SecurePass123'
    };
    
    // Setup: Create verified user
    const hashedPassword = await bcrypt.hash(userData.password, 12);
    await User.create({
      email: userData.email,
      password: hashedPassword,
      firstName: 'Login',
      lastName: 'User',
      isEmailVerified: true
    });
    
    const response = await request(app)
      .post('/api/auth/login')
      .send(userData);
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.user).toBeDefined();
    expect(response.headers['set-cookie']).toBeDefined();
  });

  test('Rate limiting prevents brute force attacks', async () => {
    const invalidData = {
      email: 'test@example.com',
      password: 'wrongpassword'
    };
    
    // Make multiple failed attempts
    for (let i = 0; i < 6; i++) {
      await request(app)
        .post('/api/auth/login')
        .send(invalidData);
    }
    
    // Next attempt should be rate limited
    const response = await request(app)
      .post('/api/auth/login')
      .send(invalidData);
    
    expect(response.status).toBe(429);
    expect(response.body.error).toContain('rate limit');
  });
});

// test/auth/email-verification.test.ts
describe('Email Verification', () => {
  test('4-digit code generation is secure and unique', () => {
    const codes = new Set();
    for (let i = 0; i < 1000; i++) {
      const code = VerificationCodeManager.generateCode();
      expect(code).toMatch(/^\d{4}$/);
      expect(code.length).toBe(4);
      codes.add(code);
    }
    // Should have good distribution (not perfect uniqueness due to small space)
    expect(codes.size).toBeGreaterThan(800);
  });

  test('Verification code expires after 5 minutes', async () => {
    const user = await User.create({
      email: 'expire@example.com',
      password: 'password',
      firstName: 'Test',
      lastName: 'User'
    });
    
    // Create expired verification code
    const code = '1234';
    await VerificationCode.create({
      userId: user._id,
      code,
      type: 'email_verification',
      expiresAt: new Date(Date.now() - 1000), // 1 second ago
      attempts: 0,
      maxAttempts: 3,
      isUsed: false
    });
    
    const isValid = await VerificationCodeManager.validateCode(
      user._id.toString(),
      code,
      'email_verification'
    );
    
    expect(isValid).toBe(false);
  });
});
```

```bash
# Run tests iteratively until passing:
npm test -- --testPathPattern=auth
# If failing: Debug specific test, fix code, re-run
```

### Level 3: Integration Test
```bash
# Test complete authentication flow
curl -X POST "http://localhost:3000/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"integration@test.com","password":"SecurePass123","firstName":"Integration","lastName":"Test"}'

# Expected: {"success": true, "userId": "...", "message": "Registration successful..."}

# Test email verification (replace with actual code from email/logs)
curl -X POST "http://localhost:3000/api/auth/verify-email" \
  -H "Content-Type: application/json" \
  -d '{"userId":"USER_ID_FROM_REGISTRATION","code":"1234"}'

# Expected: {"success": true, "message": "Email verified successfully"}

# Test login
curl -X POST "http://localhost:3000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"integration@test.com","password":"SecurePass123"}' \
  -c cookies.txt

# Expected: {"success": true, "user": {...}} with Set-Cookie headers

# Test protected route access
curl -X GET "http://localhost:3000/api/protected" \
  -b cookies.txt

# Expected: Success response or proper redirect
```

### Level 4: Manual UI Testing
```bash
# Start development server
npm run dev

# Complete user journey testing:
# 1. Navigate to http://localhost:3000/auth/auth1/register
# 2. Fill registration form and submit
# 3. Check email for 4-digit verification code
# 4. Navigate to verification page and enter code
# 5. Confirm redirect to login page
# 6. Login with registered credentials
# 7. Verify access to protected routes
# 8. Test logout functionality
# 9. Test password reset flow
# 10. Test rate limiting by making multiple failed attempts

# Security testing:
# 1. Attempt SQL injection in email field
# 2. Try XSS attacks in name fields
# 3. Test CSRF protection
# 4. Verify JWT tokens are HTTP-only
# 5. Check rate limiting on all auth endpoints
```

## Final Validation Checklist
- [ ] All tests pass: `npm test`
- [ ] No linting errors: `npm run lint`
- [ ] No type errors: TypeScript compilation succeeds
- [ ] Build succeeds: `npm run build`
- [ ] User registration creates account and sends email
- [ ] Email verification with 4-digit code works correctly
- [ ] Login creates JWT tokens and sets secure cookies
- [ ] Logout clears tokens and redirects properly
- [ ] Password reset flow works end-to-end
- [ ] Route protection middleware blocks unauthorized access
- [ ] Rate limiting prevents brute force attacks
- [ ] Email service integration works (check spam folder)
- [ ] All forms follow existing Material-UI patterns
- [ ] Database indexes improve query performance
- [ ] Security headers are properly set
- [ ] Error handling covers all edge cases
- [ ] Environment variables documented in .env.example

---

## Anti-Patterns to Avoid
- ❌ Don't store JWT secrets in code - use environment variables
- ❌ Don't use synchronous bcrypt - always use async versions  
- ❌ Don't skip input validation - validate all user inputs
- ❌ Don't store plaintext passwords or codes in database
- ❌ Don't ignore rate limiting - essential for auth endpoints
- ❌ Don't use client-side JWT storage - use HTTP-only cookies
- ❌ Don't skip email verification - compromised accounts are dangerous
- ❌ Don't hardcode expiration times - make them configurable
- ❌ Don't forget to handle edge cases like network failures
- ❌ Don't skip CSRF protection for state-changing operations
- ❌ Don't log sensitive information like passwords or tokens
- ❌ Don't use 4-digit codes without proper rate limiting (security risk)

## Confidence Score: 9/10

High confidence due to:
- Clear existing patterns in the Boami codebase to follow
- Comprehensive research on Next.js 14 authentication best practices
- Well-documented libraries (Resend, JWT, bcrypt, Mongoose)
- Detailed security considerations based on 2024 best practices
- Comprehensive validation gates and testing strategy
- Strong TypeScript integration throughout the stack

Minor uncertainty around specific email delivery rates with Resend free tier, but comprehensive error handling and fallback strategies are included.