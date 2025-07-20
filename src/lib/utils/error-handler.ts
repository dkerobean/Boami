/**
 * Comprehensive Error Handler
 * Handles all types of errors with user-friendly messages and proper logging
 */

import { NotificationSystem } from './notification-system';

export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  additionalData?: Record<string, any>;
}

export interface ErrorDetails {
  code: string;
  message: string;
  userMessage: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'validation' | 'network' | 'authentication' | 'authorization' | 'business' | 'system';
  recoverable: boolean;
  retryable: boolean;
}

export class ErrorHandler {
  private static errorCodes: Record<string, ErrorDetails> = {
    // Validation Errors
    'VALIDATION_REQUIRED_FIELD': {
      code: 'VALIDATION_REQUIRED_FIELD',
      message: 'Required field is missing',
      userMessage: 'Please fill in all required fields',
      severity: 'low',
      category: 'validation',
      recoverable: true,
      retryable: false
    },
    'VALIDATION_INVALID_EMAIL': {
      code: 'VALIDATION_INVALID_EMAIL',
      message: 'Invalid email format',
      userMessage: 'Please enter a valid email address',
      severity: 'low',
      category: 'validation',
      recoverable: true,
      retryable: false
    },
    'VALIDATION_INVALID_AMOUNT': {
      code: 'VALIDATION_INVALID_AMOUNT',
      message: 'Invalid amount value',
      userMessage: 'Please enter a valid amount',
      severity: 'low',
      category: 'validation',
      recoverable: true,
      retryable: false
    },
    'VALIDATION_INSUFFICIENT_STOCK': {
      code: 'VALIDATION_INSUFFICIENT_STOCK',
      message: 'Insufficient stock for sale',
      userMessage: 'Not enough items in stock for this sale',
      severity: 'medium',
      category: 'business',
      recoverable: true,
      retryable: false
    },

    // Network Errors
    'NETWORK_CONNECTION_FAILED': {
      code: 'NETWORK_CONNECTION_FAILED',
      message: 'Network connection failed',
      userMessage: 'Unable to connect to server. Please check your internet connection.',
      severity: 'medium',
      category: 'network',
      recoverable: true,
      retryable: true
    },
    'NETWORK_TIMEOUT': {
      code: 'NETWORK_TIMEOUT',
      message: 'Request timeout',
      userMessage: 'The request took too long. Please try again.',
      severity: 'medium',
      category: 'network',
      recoverable: true,
      retryable: true
    },
    'NETWORK_SERVER_ERROR': {
      code: 'NETWORK_SERVER_ERROR',
      message: 'Server error occurred',
      userMessage: 'Server is experiencing issues. Please try again later.',
      severity: 'high',
      category: 'network',
      recoverable: true,
      retryable: true
    },

    // Authentication Errors
    'AUTH_INVALID_CREDENTIALS': {
      code: 'AUTH_INVALID_CREDENTIALS',
      message: 'Invalid login credentials',
      userMessage: 'Invalid username or password',
      severity: 'medium',
      category: 'authentication',
      recoverable: true,
      retryable: false
    },
    'AUTH_SESSION_EXPIRED': {
      code: 'AUTH_SESSION_EXPIRED',
      message: 'Session has expired',
      userMessage: 'Your session has expired. Please log in again.',
      severity: 'medium',
      category: 'authentication',
      recoverable: true,
      retryable: false
    },
    'AUTH_TOKEN_INVALID': {
      code: 'AUTH_TOKEN_INVALID',
      message: 'Invalid authentication token',
      userMessage: 'Authentication failed. Please log in again.',
      severity: 'medium',
      category: 'authentication',
      recoverable: true,
      retryable: false
    },

    // Authorization Errors
    'AUTH_INSUFFICIENT_PERMISSIONS': {
      code: 'AUTH_INSUFFICIENT_PERMISSIONS',
      message: 'Insufficient permissions',
      userMessage: 'You do not have permission to perform this action',
      severity: 'medium',
      category: 'authorization',
      recoverable: false,
      retryable: false
    },
    'AUTH_RESOURCE_ACCESS_DENIED': {
      code: 'AUTH_RESOURCE_ACCESS_DENIED',
      message: 'Access denied to resource',
      userMessage: 'You do not have access to this resource',
      severity: 'medium',
      category: 'authorization',
      recoverable: false,
      retryable: false
    },

    // Business Logic Errors
    'BUSINESS_DUPLICATE_ENTRY': {
      code: 'BUSINESS_DUPLICATE_ENTRY',
      message: 'Duplicate entry detected',
      userMessage: 'This item already exists',
      severity: 'low',
      category: 'business',
      recoverable: true,
      retryable: false
    },
    'BUSINESS_INVALID_OPERATION': {
      code: 'BUSINESS_INVALID_OPERATION',
      message: 'Invalid business operation',
      userMessage: 'This operation is not allowed in the current state',
      severity: 'medium',
      category: 'business',
      recoverable: true,
      retryable: false
    },
    'BUSINESS_CONSTRAINT_VIOLATION': {
      code: 'BUSINESS_CONSTRAINT_VIOLATION',
      message: 'Business constraint violation',
      userMessage: 'This action violates business rules',
      severity: 'medium',
      category: 'business',
      recoverable: true,
      retryable: false
    },

    // System Errors
    'SYSTEM_DATABASE_ERROR': {
      code: 'SYSTEM_DATABASE_ERROR',
      message: 'Database operation failed',
      userMessage: 'A system error occurred. Please try again.',
      severity: 'high',
      category: 'system',
      recoverable: true,
      retryable: true
    },
    'SYSTEM_UNEXPECTED_ERROR': {
      code: 'SYSTEM_UNEXPECTED_ERROR',
      message: 'Unexpected system error',
      userMessage: 'An unexpected error occurred. Please try again.',
      severity: 'high',
      category: 'system',
      recoverable: true,
      retryable: true
    }
  };

  /**
   * Handle error with appropriate user feedback and logging
   */
  static handleError(
    error: Error | string | any,
    context?: ErrorContext,
    customMessage?: string
  ): ErrorDetails {
    const errorDetails = this.parseError(error);

    // Log error for debugging
    this.logError(error, errorDetails, context);

    // Show user notification
    const userMessage = customMessage || errorDetails.userMessage;

    switch (errorDetails.severity) {
      case 'low':
        NotificationSystem.warning({
          title: 'Validation Error',
          message: userMessage
        });
        break;
      case 'medium':
        NotificationSystem.error({
          title: 'Error',
          message: userMessage
        });
        break;
      case 'high':
      case 'critical':
        NotificationSystem.error({
          title: 'System Error',
          message: userMessage,
          persistent: true
        });
        break;
    }

    return errorDetails;
  }

  /**
   * Parse error to extract details
   */
  private static parseError(error: Error | string | any): ErrorDetails {
    // If it's a string, treat as generic error
    if (typeof error === 'string') {
      return {
        code: 'SYSTEM_UNEXPECTED_ERROR',
        message: error,
        userMessage: error,
        severity: 'medium',
        category: 'system',
        recoverable: true,
        retryable: false
      };
    }

    // If it's an Error object
    if (error instanceof Error) {
      // Check if it has a specific error code
      const errorCode = (error as any).code;
      if (errorCode && this.errorCodes[errorCode]) {
        return this.errorCodes[errorCode];
      }

      // Check for network errors
      if (error.message.includes('fetch') || error.message.includes('network')) {
        return this.errorCodes['NETWORK_CONNECTION_FAILED'];
      }

      // Check for timeout errors
      if (error.message.includes('timeout')) {
        return this.errorCodes['NETWORK_TIMEOUT'];
      }

      // Generic error
      return {
        code: 'SYSTEM_UNEXPECTED_ERROR',
        message: error.message,
        userMessage: 'An unexpected error occurred. Please try again.',
        severity: 'medium',
        category: 'system',
        recoverable: true,
        retryable: true
      };
    }

    // If it's an API response error
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      switch (status) {
        case 400:
          return {
            code: 'VALIDATION_ERROR',
            message: data?.message || 'Bad request',
            userMessage: data?.userMessage || 'Please check your input and try again',
            severity: 'low',
            category: 'validation',
            recoverable: true,
            retryable: false
          };
        case 401:
          return this.errorCodes['AUTH_INVALID_CREDENTIALS'];
        case 403:
          return this.errorCodes['AUTH_INSUFFICIENT_PERMISSIONS'];
        case 404:
          return {
            code: 'RESOURCE_NOT_FOUND',
            message: 'Resource not found',
            userMessage: 'The requested item was not found',
            severity: 'medium',
            category: 'business',
            recoverable: true,
            retryable: false
          };
        case 409:
          return this.errorCodes['BUSINESS_DUPLICATE_ENTRY'];
        case 422:
          return {
            code: 'VALIDATION_ERROR',
            message: data?.message || 'Validation failed',
            userMessage: data?.userMessage || 'Please check your input',
            severity: 'low',
            category: 'validation',
            recoverable: true,
            retryable: false
          };
        case 500:
          return this.errorCodes['NETWORK_SERVER_ERROR'];
        default:
          return this.errorCodes['SYSTEM_UNEXPECTED_ERROR'];
      }
    }

    // Fallback for unknown error types
    return this.errorCodes['SYSTEM_UNEXPECTED_ERROR'];
  }

  /**
   * Log error for debugging and monitoring
   */
  private static logError(
    originalError: any,
    errorDetails: ErrorDetails,
    context?: ErrorContext
  ): void {
    const logData = {
      timestamp: new Date().toISOString(),
      error: {
        code: errorDetails.code,
        message: errorDetails.message,
        severity: errorDetails.severity,
        category: errorDetails.category,
        originalError: originalError?.toString(),
        stack: originalError?.stack
      },
      context: context || {},
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
      url: typeof window !== 'undefined' ? window.location.href : 'server'
    };

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error Handler:', logData);
    }

    // In production, you would send this to your logging service
    // Example: sendToLoggingService(logData);
  }

  /**
   * Create a custom error with specific code
   */
  static createError(code: string, message?: string, additionalData?: any): Error {
    const error = new Error(message || this.errorCodes[code]?.message || 'Unknown error');
    (error as any).code = code;
    (error as any).additionalData = additionalData;
    return error;
  }

  /**
   * Check if error is retryable
   */
  static isRetryable(error: any): boolean {
    const errorDetails = this.parseError(error);
    return errorDetails.retryable;
  }

  /**
   * Check if error is recoverable
   */
  static isRecoverable(error: any): boolean {
    const errorDetails = this.parseError(error);
    return errorDetails.recoverable;
  }

  /**
   * Get user-friendly error message
   */
  static getUserMessage(error: any): string {
    const errorDetails = this.parseError(error);
    return errorDetails.userMessage;
  }

  /**
   * Handle API errors specifically
   */
  static handleApiError(error: any, context?: ErrorContext): ErrorDetails {
    // Add API-specific context
    const apiContext = {
      ...context,
      type: 'api_error',
      timestamp: new Date().toISOString()
    };

    return this.handleError(error, apiContext);
  }

  /**
   * Handle form validation errors
   */
  static handleValidationError(
    errors: Record<string, string>,
    context?: ErrorContext
  ): void {
    Object.entries(errors).forEach(([field, message]) => {
      NotificationSystem.warning({
        title: `${field} Error`,
        message: message
      });
    });

    this.logError(
      { validation_errors: errors },
      {
        code: 'VALIDATION_MULTIPLE_ERRORS',
        message: 'Multiple validation errors',
        userMessage: 'Please correct the highlighted fields',
        severity: 'low',
        category: 'validation',
        recoverable: true,
        retryable: false
      },
      { ...context, type: 'validation_error' }
    );
  }

  /**
   * Handle network connectivity issues
   */
  static handleNetworkError(error: any, context?: ErrorContext): ErrorDetails {
    const networkContext = {
      ...context,
      type: 'network_error',
      online: typeof navigator !== 'undefined' ? navigator.onLine : true
    };

    return this.handleError(error, networkContext);
  }
}

export default ErrorHandler;