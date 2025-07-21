/**
 * Authentication Error Handler
 * Comprehensive error handling for authentication flows with user-friendly messages
 */

import { NextResponse } from 'next/server';
import { authLogger } from './auth-logger';

// Error categories
export type AuthErrorCategory =
  | 'validation'
  | 'authentication'
  | 'authorization'
  | 'rate_limiting'
  | 'network'
  | 'server'
  | 'security'
  | 'user_input';

// Error severity levels
export type AuthErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

// Authentication error interface
export interface AuthError {
  code: string;
  message: string;
  userMessage: string;
  category: AuthErrorCategory;
  severity: AuthErrorSeverity;
  statusCode: number;
  details?: Record<string, any>;
  suggestions?: string[];
  retryable: boolean;
  logLevel: 'error' | 'warn' | 'info';
}

// Predefined authentication errors
export const AUTH_ERRORS: Record<string, AuthError> = {
  // Validation Errors
  INVALID_EMAIL: {
    code: 'INVALID_EMAIL',
    message: 'Invalid email format provided',
    userMessage: 'Please enter a valid email address.',
    category: 'validation',
    severity: 'low',
    statusCode: 400,
    retryable: true,
    logLevel: 'warn',
    suggestions: ['Check the email format', 'Ensure @ symbol is present'],
  },

  INVALID_PASSWORD: {
    code: 'INVALID_PASSWORD',
    message: 'Password does not meet requirements',
    userMessage: 'Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character.',
    category: 'validation',
    severity: 'low',
    statusCode: 400,
    retryable: true,
    logLevel: 'warn',
    suggestions: [
      'Use at least 8 characters',
      'Include uppercase and lowercase letters',
      'Add at least one number',
      'Include a special character',
    ],
  },

  MISSING_REQUIRED_FIELDS: {
    code: 'MISSING_REQUIRED_FIELDS',
    message: 'Required fields are missing',
    userMessage: 'Please fill in all required fields.',
    category: 'validation',
    severity: 'low',
    statusCode: 400,
    retryable: true,
    logLevel: 'warn',
  },

  // Authentication Errors
  INVALID_CREDENTIALS: {
    code: 'INVALID_CREDENTIALS',
    message: 'Invalid email or password',
    userMessage: 'The email or password you entered is incorrect. Please try again.',
    category: 'authentication',
    severity: 'medium',
    statusCode: 401,
    retryable: true,
    logLevel: 'warn',
    suggestions: [
      'Double-check your email address',
      'Verify your password',
      'Try resetting your password if you forgot it',
    ],
  },

  USER_NOT_FOUND: {
    code: 'USER_NOT_FOUND',
    message: 'User account not found',
    userMessage: 'No account found with this email address.',
    category: 'authentication',
    severity: 'medium',
    statusCode: 404,
    retryable: false,
    logLevel: 'warn',
    suggestions: [
      'Check if you entered the correct email',
      'Create a new account if you don\'t have one',
    ],
  },

  ACCOUNT_LOCKED: {
    code: 'ACCOUNT_LOCKED',
    message: 'User account is locked due to multiple failed login attempts',
    userMessage: 'Your account has been temporarily locked due to multiple failed login attempts. Please try again later or contact support.',
    category: 'security',
    severity: 'high',
    statusCode: 423,
    retryable: false,
    logLevel: 'error',
    suggestions: [
      'Wait for the lockout period to expire',
      'Contact support if you need immediate access',
      'Reset your password if you forgot it',
    ],
  },

  ACCOUNT_DISABLED: {
    code: 'ACCOUNT_DISABLED',
    message: 'User account is disabled',
    userMessage: 'Your account has been disabled. Please contact support for assistance.',
    category: 'authorization',
    severity: 'high',
    statusCode: 403,
    retryable: false,
    logLevel: 'error',
    suggestions: ['Contact support for account reactivation'],
  },

  EMAIL_NOT_VERIFIED: {
    code: 'EMAIL_NOT_VERIFIED',
    message: 'Email address not verified',
    userMessage: 'Please verify your email address before logging in.',
    category: 'authentication',
    severity: 'medium',
    statusCode: 403,
    retryable: false,
    logLevel: 'warn',
    suggestions: [
      'Check your email for verification link',
      'Request a new verification email',
    ],
  },

  // Token Errors
  TOKEN_EXPIRED: {
    code: 'TOKEN_EXPIRED',
    message: 'Authentication token has expired',
    userMessage: 'Your session has expired. Please log in again.',
    category: 'authentication',
    severity: 'medium',
    statusCode: 401,
    retryable: false,
    logLevel: 'info',
    suggestions: ['Log in again to continue'],
  },

  INVALID_TOKEN: {
    code: 'INVALID_TOKEN',
    message: 'Invalid authentication token',
    userMessage: 'Your session is invalid. Please log in again.',
    category: 'authentication',
    severity: 'medium',
    statusCode: 401,
    retryable: false,
    logLevel: 'warn',
    suggestions: ['Log in again to continue'],
  },

  TOKEN_REFRESH_FAILED: {
    code: 'TOKEN_REFRESH_FAILED',
    message: 'Failed to refresh authentication token',
    userMessage: 'Unable to refresh your session. Please log in again.',
    category: 'authentication',
    severity: 'medium',
    statusCode: 401,
    retryable: false,
    logLevel: 'warn',
    suggestions: ['Log in again to continue'],
  },

  // Rate Limiting Errors
  RATE_LIMIT_EXCEEDED: {
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Rate limit exceeded for authentication requests',
    userMessage: 'Too many login attempts. Please wait a few minutes before trying again.',
    category: 'rate_limiting',
    severity: 'medium',
    statusCode: 429,
    retryable: true,
    logLevel: 'warn',
    suggestions: [
      'Wait a few minutes before trying again',
      'Ensure you\'re using the correct credentials',
    ],
  },

  // Server Errors
  DATABASE_ERROR: {
    code: 'DATABASE_ERROR',
    message: 'Database operation failed',
    userMessage: 'We\'re experiencing technical difficulties. Please try again later.',
    category: 'server',
    severity: 'high',
    statusCode: 500,
    retryable: true,
    logLevel: 'error',
    suggestions: ['Try again in a few minutes', 'Contact support if the problem persists'],
  },

  EXTERNAL_SERVICE_ERROR: {
    code: 'EXTERNAL_SERVICE_ERROR',
    message: 'External service unavailable',
    userMessage: 'We\'re experiencing technical difficulties. Please try again later.',
    category: 'server',
    severity: 'high',
    statusCode: 503,
    retryable: true,
    logLevel: 'error',
    suggestions: ['Try again in a few minutes', 'Contact support if the problem persists'],
  },

  // Security Errors
  SUSPICIOUS_ACTIVITY: {
    code: 'SUSPICIOUS_ACTIVITY',
    message: 'Suspicious activity detected',
    userMessage: 'Unusual activity detected on your account. Please verify your identity.',
    category: 'security',
    severity: 'critical',
    statusCode: 403,
    retryable: false,
    logLevel: 'error',
    suggestions: [
      'Verify your identity through email',
      'Contact support if you believe this is an error',
    ],
  },

  SECURITY_VIOLATION: {
    code: 'SECURITY_VIOLATION',
    message: 'Security policy violation detected',
    userMessage: 'Access denied due to security policy violation.',
    category: 'security',
    severity: 'critical',
    statusCode: 403,
    retryable: false,
    logLevel: 'error',
    suggestions: ['Contact support for assistance'],
  },

  // Network Errors
  NETWORK_ERROR: {
    code: 'NETWORK_ERROR',
    message: 'Network connection error',
    userMessage: 'Unable to connect to our servers. Please check your internet connection and try again.',
    category: 'network',
    severity: 'medium',
    statusCode: 503,
    retryable: true,
    logLevel: 'warn',
    suggestions: [
      'Check your internet connection',
      'Try refreshing the page',
      'Try again in a few minutes',
    ],
  },

  TIMEOUT_ERROR: {
    code: 'TIMEOUT_ERROR',
    message: 'Request timeout',
    userMessage: 'The request took too long to complete. Please try again.',
    category: 'network',
    severity: 'medium',
    statusCode: 408,
    retryable: true,
    logLevel: 'warn',
    suggestions: ['Try again', 'Check your internet connection'],
  },
};

/**
 * Authentication Error Handler Class
 */
export class AuthErrorHandler {
  /**
   * Handle authentication error and return appropriate response
   */
  static handleError(
    error: Error | AuthError | string,
    context?: {
      userId?: string;
      email?: string;
      ipAddress?: string;
      userAgent?: string;
      resource?: string;
      method?: string;
    }
  ): NextResponse {
    let authError: AuthError;

    // Determine error type and create AuthError
    if (typeof error === 'string') {
      authError = AUTH_ERRORS[error] || this.createGenericError(error);
    } else if ('code' in error && 'userMessage' in error) {
      authError = error as AuthError;
    } else {
      authError = this.mapErrorToAuthError(error as Error);
    }

    // Log the error
    this.logError(authError, context);

    // Create response
    return this.createErrorResponse(authError);
  }

  /**
   * Create a generic error from string
   */
  private static createGenericError(message: string): AuthError {
    return {
      code: 'GENERIC_ERROR',
      message,
      userMessage: 'An unexpected error occurred. Please try again.',
      category: 'server',
      severity: 'medium',
      statusCode: 500,
      retryable: true,
      logLevel: 'error',
    };
  }

  /**
   * Map generic Error to AuthError
   */
  private static mapErrorToAuthError(error: Error): AuthError {
    // Check for specific error patterns
    if (error.message.includes('validation')) {
      return {
        ...AUTH_ERRORS.MISSING_REQUIRED_FIELDS,
        message: error.message,
      };
    }

    if (error.message.includes('network') || error.message.includes('fetch')) {
      return {
        ...AUTH_ERRORS.NETWORK_ERROR,
        message: error.message,
      };
    }

    if (error.message.includes('timeout')) {
      return {
        ...AUTH_ERRORS.TIMEOUT_ERROR,
        message: error.message,
      };
    }

    if (error.message.includes('database') || error.message.includes('connection')) {
      return {
        ...AUTH_ERRORS.DATABASE_ERROR,
        message: error.message,
      };
    }

    // Default to generic server error
    return {
      code: 'INTERNAL_ERROR',
      message: error.message,
      userMessage: 'An unexpected error occurred. Please try again later.',
      category: 'server',
      severity: 'high',
      statusCode: 500,
      retryable: true,
      logLevel: 'error',
    };
  }

  /**
   * Log the error
   */
  private static logError(
    authError: AuthError,
    context?: {
      userId?: string;
      email?: string;
      ipAddress?: string;
      userAgent?: string;
      resource?: string;
      method?: string;
    }
  ): void {
    authLogger.log(
      authError.logLevel,
      this.getEventTypeFromError(authError),
      authError.message,
      {
        userId: context?.userId,
        email: context?.email,
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
        resource: context?.resource,
        method: context?.method,
        metadata: {
          errorCode: authError.code,
          category: authError.category,
          severity: authError.severity,
          retryable: authError.retryable,
          details: authError.details,
        },
      }
    );
  }

  /**
   * Get event type from error
   */
  private static getEventTypeFromError(authError: AuthError): any {
    switch (authError.category) {
      case 'authentication':
        return authError.code === 'INVALID_CREDENTIALS' ? 'login_failure' : 'unauthorized_access';
      case 'security':
        return 'suspicious_activity';
      case 'rate_limiting':
        return 'rate_limit_exceeded';
      default:
        return 'security_violation';
    }
  }

  /**
   * Create error response
   */
  private static createErrorResponse(authError: AuthError): NextResponse {
    const responseBody = {
      success: false,
      error: {
        code: authError.code,
        message: authError.userMessage,
        category: authError.category,
        severity: authError.severity,
        retryable: authError.retryable,
        suggestions: authError.suggestions,
      },
      timestamp: new Date().toISOString(),
    };

    // Add retry information for retryable errors
    if (authError.retryable) {
      responseBody.error = {
        ...responseBody.error,
        retryAfter: this.getRetryDelay(authError),
      } as any;
    }

    return NextResponse.json(responseBody, {
      status: authError.statusCode,
      headers: {
        'Content-Type': 'application/json',
        'X-Error-Code': authError.code,
        'X-Error-Category': authError.category,
        ...(authError.retryable && {
          'Retry-After': this.getRetryDelay(authError).toString(),
        }),
      },
    });
  }

  /**
   * Get retry delay based on error type
   */
  private static getRetryDelay(authError: AuthError): number {
    switch (authError.category) {
      case 'rate_limiting':
        return 300; // 5 minutes
      case 'network':
        return 30; // 30 seconds
      case 'server':
        return 60; // 1 minute
      default:
        return 10; // 10 seconds
    }
  }

  /**
   * Validate request data and throw appropriate errors
   */
  static validateRequest(data: any, requiredFields: string[]): void {
    const missingFields: string[] = [];

    for (const field of requiredFields) {
      if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      throw {
        ...AUTH_ERRORS.MISSING_REQUIRED_FIELDS,
        details: { missingFields },
        userMessage: `Please provide: ${missingFields.join(', ')}`,
      };
    }
  }

  /**
   * Validate email format
   */
  static validateEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw AUTH_ERRORS.INVALID_EMAIL;
    }
  }

  /**
   * Validate password strength
   */
  static validatePassword(password: string): void {
    if (password.length < 8) {
      throw {
        ...AUTH_ERRORS.INVALID_PASSWORD,
        details: { reason: 'Password too short' },
      };
    }

    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (!hasUppercase || !hasLowercase || !hasNumbers || !hasSpecialChar) {
      throw {
        ...AUTH_ERRORS.INVALID_PASSWORD,
        details: {
          hasUppercase,
          hasLowercase,
          hasNumbers,
          hasSpecialChar,
        },
      };
    }
  }

  /**
   * Create success response
   */
  static createSuccessResponse(data: any, message?: string): NextResponse {
    return NextResponse.json({
      success: true,
      message: message || 'Operation completed successfully',
      data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Wrap async handler with error handling
   */
  static wrapHandler(handler: Function) {
    return async function (request: Request, context?: any) {
      try {
        return await handler(request, context);
      } catch (error) {
        console.error('Authentication handler error:', error);
        return AuthErrorHandler.handleError(error as Error, {
          resource: new URL(request.url).pathname,
          method: request.method,
          userAgent: request.headers.get('user-agent') || undefined,
        });
      }
    };
  }

  /**
   * Check rate limiting and throw error if exceeded
   */
  static checkRateLimit(identifier: string, limit: number, windowMs: number): void {
    // Simple in-memory rate limiting (use Redis in production)
    const key = `rate_limit_${identifier}`;
    const now = Date.now();

    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(key);
      if (stored) {
        const { count, resetTime } = JSON.parse(stored);

        if (now < resetTime) {
          if (count >= limit) {
            throw {
              ...AUTH_ERRORS.RATE_LIMIT_EXCEEDED,
              details: {
                limit,
                resetTime: new Date(resetTime),
                remainingTime: Math.ceil((resetTime - now) / 1000),
              },
            };
          }
          localStorage.setItem(key, JSON.stringify({ count: count + 1, resetTime }));
        } else {
          localStorage.setItem(key, JSON.stringify({ count: 1, resetTime: now + windowMs }));
        }
      } else {
        localStorage.setItem(key, JSON.stringify({ count: 1, resetTime: now + windowMs }));
      }
    }
  }
}

/**
 * Convenience functions
 */
export const handleAuthError = AuthErrorHandler.handleError;
export const validateRequest = AuthErrorHandler.validateRequest;
export const validateEmail = AuthErrorHandler.validateEmail;
export const validatePassword = AuthErrorHandler.validatePassword;
export const createSuccessResponse = AuthErrorHandler.createSuccessResponse;
export const wrapHandler = AuthErrorHandler.wrapHandler;
export const checkRateLimit = AuthErrorHandler.checkRateLimit;

export default AuthErrorHandler;